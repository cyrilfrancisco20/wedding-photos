// Source unique du planning du mariage. Upload, galerie et projection lisent ce
// fichier. Tout est calé sur l'heure de Paris (CEST = UTC+2 en juillet, pas de
// changement d'heure dans la fenêtre, donc l'offset +02:00 est figé sans risque).
//
// Modèle « par jour » : les photos se rangent par JOUR (vendredi / samedi /
// dimanche), pas par moment fin. La colonne `moment` en base stocke donc un
// `Bucket` = un jour, ou « à classer » si la date est inconnue / hors fenêtre.

export type Day = 'vendredi' | 'samedi' | 'dimanche'

// Dossier de repli : photo sans date EXIF ou prise hors de toute fenêtre.
export const UNSORTED = 'a-classer' as const
export type Bucket = Day | typeof UNSORTED

export const DAY_LABELS: Record<Day, string> = {
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
}

export const DAY_ORDER: Day[] = ['vendredi', 'samedi', 'dimanche']

export type DayWindow = {
  day: Day
  label: string
  start: string // ISO avec offset Paris (inclusif)
  end: string // exclusif
}

// Fenêtres des trois jours. Les bornes ne sont pas à minuit : une photo prise à
// 3h du matin la nuit du vendredi appartient à « vendredi ». La nuit du samedi
// court jusqu'au dimanche 8h (bascule sur le brunch).
export const DAYS: DayWindow[] = [
  { day: 'vendredi', label: 'Vendredi', start: '2026-07-10T00:00:00+02:00', end: '2026-07-11T05:00:00+02:00' },
  { day: 'samedi', label: 'Samedi', start: '2026-07-11T05:00:00+02:00', end: '2026-07-12T08:00:00+02:00' },
  { day: 'dimanche', label: 'Dimanche', start: '2026-07-12T08:00:00+02:00', end: '2026-07-13T00:00:00+02:00' },
]

export const ALL_BUCKET_LABELS: Record<Bucket, string> = {
  ...(Object.fromEntries(DAYS.map((d) => [d.day, d.label])) as Record<Day, string>),
  [UNSORTED]: 'À classer',
}

const BY_DAY = new Map(DAYS.map((d) => [d.day, d]))

export function dayById(id: string): DayWindow | undefined {
  return BY_DAY.get(id as Day)
}

export function isBucket(value: unknown): value is Bucket {
  return typeof value === 'string' && value in ALL_BUCKET_LABELS
}

// Un bucket EST déjà un jour (ou « à classer »). Pratique pour les filtres.
export function dayForBucket(bucket: Bucket): Day | null {
  return bucket === UNSORTED ? null : bucket
}

// Rend le jour actif pour un instant donné, ou null hors de toute fenêtre.
export function dayForInstant(date: Date): Day | null {
  const t = date.getTime()
  if (Number.isNaN(t)) return null
  for (const d of DAYS) {
    if (t >= Date.parse(d.start) && t < Date.parse(d.end)) return d.day
  }
  return null
}

// Classe une date de prise de vue dans un jour. null (pas d'EXIF) ou hors
// fenêtre => « à classer », jamais un mauvais jour.
export function dayForTakenAt(takenAt: Date | null): Bucket {
  if (!takenAt) return UNSORTED
  return dayForInstant(takenAt) ?? UNSORTED
}

// EXIF DateTimeOriginal arrive sans fuseau, au format "YYYY:MM:DD HH:MM:SS".
// L'appareil d'un invité est à l'heure de Paris : on l'interprète en +02:00.
export function exifDateToParisISO(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}+02:00`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}
