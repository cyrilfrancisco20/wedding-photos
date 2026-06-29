// Source unique du planning du mariage. Upload, galerie et projection lisent ce
// fichier. Tout est calé sur l'heure de Paris (CEST = UTC+2 en juillet, pas de
// changement d'heure dans la fenêtre, donc l'offset +02:00 est figé sans risque).

export type Day = 'vendredi' | 'samedi' | 'dimanche'

export type MomentId =
  | 'mairie'
  | 'soiree-vendredi'
  | 'preparatifs'
  | 'ceremonie'
  | 'aperitif'
  | 'repas'
  | 'soiree-samedi'
  | 'brunch'

// Dossier de repli : photo sans date EXIF ou prise hors de toute fenêtre.
export const UNSORTED = 'a-classer' as const
export type Bucket = MomentId | typeof UNSORTED

export type Moment = {
  id: MomentId
  label: string
  day: Day
  start: string // ISO avec offset Paris
  end: string // exclusif
  // false => la projection se met en veille pendant ce créneau (ex. cérémonie).
  projects: boolean
}

export const DAY_LABELS: Record<Day, string> = {
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
}

export const DAY_ORDER: Day[] = ['vendredi', 'samedi', 'dimanche']

// Ordre chronologique. La galerie et la projection s'appuient sur cet ordre.
export const MOMENTS: Moment[] = [
  { id: 'mairie', label: 'Mairie', day: 'vendredi', start: '2026-07-10T13:00:00+02:00', end: '2026-07-10T16:00:00+02:00', projects: true },
  { id: 'soiree-vendredi', label: 'Soirée du vendredi', day: 'vendredi', start: '2026-07-10T16:00:00+02:00', end: '2026-07-11T05:00:00+02:00', projects: true },
  { id: 'preparatifs', label: 'Préparatifs', day: 'samedi', start: '2026-07-11T05:00:00+02:00', end: '2026-07-11T15:00:00+02:00', projects: true },
  { id: 'ceremonie', label: 'Cérémonie', day: 'samedi', start: '2026-07-11T15:00:00+02:00', end: '2026-07-11T17:50:00+02:00', projects: false },
  { id: 'aperitif', label: 'Apéritif', day: 'samedi', start: '2026-07-11T17:50:00+02:00', end: '2026-07-11T20:30:00+02:00', projects: true },
  { id: 'repas', label: 'Repas', day: 'samedi', start: '2026-07-11T20:30:00+02:00', end: '2026-07-11T23:30:00+02:00', projects: true },
  { id: 'soiree-samedi', label: 'Soirée du samedi', day: 'samedi', start: '2026-07-11T23:30:00+02:00', end: '2026-07-12T08:00:00+02:00', projects: true },
  { id: 'brunch', label: 'Brunch', day: 'dimanche', start: '2026-07-12T08:00:00+02:00', end: '2026-07-12T18:00:00+02:00', projects: true },
]

export const ALL_BUCKET_LABELS: Record<Bucket, string> = {
  ...Object.fromEntries(MOMENTS.map((m) => [m.id, m.label])),
  [UNSORTED]: 'À classer',
} as Record<Bucket, string>

const BY_ID = new Map(MOMENTS.map((m) => [m.id, m]))

export function momentById(id: string): Moment | undefined {
  return BY_ID.get(id as MomentId)
}

export function isBucket(value: unknown): value is Bucket {
  return typeof value === 'string' && value in ALL_BUCKET_LABELS
}

export function dayForBucket(bucket: Bucket): Day | null {
  return BY_ID.get(bucket as MomentId)?.day ?? null
}

// Rend le créneau actif pour un instant donné, ou null hors de toute fenêtre.
export function momentForInstant(date: Date): Moment | null {
  const t = date.getTime()
  if (Number.isNaN(t)) return null
  for (const m of MOMENTS) {
    if (t >= Date.parse(m.start) && t < Date.parse(m.end)) return m
  }
  return null
}

// Classe une date de prise de vue dans un dossier. null (pas d'EXIF) ou hors
// fenêtre => "à classer", jamais un mauvais dossier.
export function bucketForTakenAt(takenAt: Date | null): Bucket {
  if (!takenAt) return UNSORTED
  return momentForInstant(takenAt)?.id ?? UNSORTED
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
