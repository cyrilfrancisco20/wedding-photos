import { NextRequest, NextResponse } from 'next/server'
import exifr from 'exifr'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase'
import { moderatePhoto } from '@/lib/moderate'
import { exifDateToParisISO, dayForTakenAt, dayForInstant, isBucket, UNSORTED, type Bucket } from '@/lib/schedule'

// Lit la date de prise de vue dans l'EXIF (DateTimeOriginal, sinon CreateDate).
// reviveValues:false => on récupère la chaîne brute "YYYY:MM:DD HH:MM:SS" et on
// l'interprète nous-mêmes en heure de Paris, sans dépendre du fuseau du serveur.
async function readTakenAt(buffer: Buffer): Promise<string | null> {
  try {
    const exif = await exifr.parse(buffer, { pick: ['DateTimeOriginal', 'CreateDate'], reviveValues: false })
    return exifDateToParisISO(exif?.DateTimeOriginal ?? exif?.CreateDate)
  } catch {
    return null
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60 // la modération vision peut prendre quelques secondes par photo

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const rateMap = new Map<string, { count: number; reset: number }>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

type Result = { ok: true; filename: string } | { error: string }

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Trop de photos envoyées, réessayez dans 1h' }, { status: 429 })
  }

  const form = await req.formData()
  const files = form.getAll('files') as File[]

  if (!files.length) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  if (files.length > 10) return NextResponse.json({ error: 'Maximum 10 photos à la fois' }, { status: 400 })

  // Jour choisi par l'invité (Vendredi / Samedi / Dimanche). C'est le signal
  // principal : l'invité clique son jour, et iOS strippe la date EXIF de toute
  // façon. L'EXIF et l'heure d'upload ne servent que de repli.
  const picked = form.get('moment')
  const selectedDay: Bucket | null = isBucket(picked) ? picked : null

  const admin = supabaseAdmin()

  const results: Result[] = await Promise.all(
    files.map(async (file): Promise<Result> => {
      if (file.size > 15 * 1024 * 1024) {
        return { error: `${file.name} trop volumineux (max 15 Mo)` }
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { error: `${file.name} : format non accepté (JPEG, PNG, WEBP uniquement)` }
      }

      const original = Buffer.from(await file.arrayBuffer())

      // Jour calculé AVANT l'upload : il sert de dossier de rangement dans le
      // bucket. EXIF lu sur l'original (la compression strippe les métadonnées).
      // Priorité : jour choisi par l'invité > date EXIF > heure d'upload > à classer.
      const takenAt = await readTakenAt(original)
      const fromExif = takenAt ? dayForTakenAt(new Date(takenAt)) : UNSORTED
      const moment: Bucket =
        selectedDay ?? (fromExif !== UNSORTED ? fromExif : dayForInstant(new Date()) ?? UNSORTED)

      // Deux dérivés générés à l'upload (objectif « archive imprimable ») :
      //  - PLEIN : JPEG cap 3000px q88 -> qualité tirage jusqu'au A4, lisible
      //    partout (HEIC converti), orientation corrigée. Sert lightbox + download.
      //  - VIGNETTE : JPEG ~600px q72 -> grille galerie légère (egress) + entrée de
      //    la modération (toujours du JPEG analysable, règle le cas HEIC).
      // Repli sur l'original si sharp ne décode pas (rare, ex. HEIC) : pas de vignette.
      const base = `${moment}/${Date.now()}-${Math.random().toString(36).slice(2)}`
      let fullBody: Buffer = original
      let fullType = file.type
      let fullExt = file.name.split('.').pop() || 'jpg'
      let thumbBody: Buffer | null = null
      try {
        fullBody = await sharp(original)
          .rotate()
          .resize(3000, 3000, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 88 })
          .toBuffer()
        fullType = 'image/jpeg'
        fullExt = 'jpg'
        thumbBody = await sharp(original)
          .rotate()
          .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 72 })
          .toBuffer()
      } catch {
        // sharp n'a pas pu décoder : on garde l'original, sans vignette.
      }

      // `filename` (chemin complet) est stocké en base et sert à la lecture
      // (createSignedUrl). La vignette vit à `<base>.thumb.jpg`, dérivée par
      // convention côté galerie.
      const filename = `${base}.${fullExt}`

      const { error: storageError } = await admin.storage
        .from('Photos')
        .upload(filename, fullBody, { contentType: fullType })

      if (storageError) return { error: storageError.message }

      if (thumbBody) {
        await admin.storage
          .from('Photos')
          .upload(`${base}.thumb.jpg`, thumbBody, { contentType: 'image/jpeg' })
      }

      const { data: urlData } = admin.storage.from('Photos').getPublicUrl(filename)

      // Modération IA avant publication : sur la vignette JPEG si dispo (rapide +
      // HEIC analysable), sinon sur le plein. Décide approved / rejected / pending.
      const modBody = thumbBody ?? fullBody
      const { status, reason } = await moderatePhoto(modBody.toString('base64'), thumbBody ? 'image/jpeg' : fullType)

      const { error: dbError } = await admin
        .from('photos')
        .insert({ filename, url: urlData.publicUrl, status, moderation_reason: reason, taken_at: takenAt, moment })

      if (dbError) return { error: dbError.message }
      return { ok: true, filename }
    }),
  )

  const errors = results.filter((r): r is { error: string } => 'error' in r)
  if (errors.length === results.length) {
    return NextResponse.json({ error: errors[0].error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: results.filter((r) => 'ok' in r).length })
}
