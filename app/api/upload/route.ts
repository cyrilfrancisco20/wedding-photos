import { NextRequest, NextResponse } from 'next/server'
import exifr from 'exifr'
import { supabaseAdmin } from '@/lib/supabase'
import { moderatePhoto } from '@/lib/moderate'
import { exifDateToParisISO, bucketForTakenAt, momentForInstant, isBucket, UNSORTED, type Bucket } from '@/lib/schedule'

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

  // Moment choisi par l'invité (iOS strippe la date EXIF, donc l'EXIF ne suffit
  // pas). Sert quand la photo n'a pas de date. Repli ultime : l'heure d'upload.
  const picked = form.get('moment')
  const selectedMoment: Bucket | null = isBucket(picked) ? picked : null

  const admin = supabaseAdmin()

  const results: Result[] = await Promise.all(
    files.map(async (file): Promise<Result> => {
      if (file.size > 15 * 1024 * 1024) {
        return { error: `${file.name} trop volumineux (max 15 Mo)` }
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { error: `${file.name} : format non accepté (JPEG, PNG, WEBP uniquement)` }
      }

      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: storageError } = await admin.storage
        .from('Photos')
        .upload(filename, buffer, { contentType: file.type })

      if (storageError) return { error: storageError.message }

      const { data: urlData } = admin.storage.from('Photos').getPublicUrl(filename)

      // Priorité du moment : date EXIF si présente (la plus fiable), sinon le
      // moment choisi par l'invité, sinon l'heure d'upload (à classer hors créneau).
      const takenAt = await readTakenAt(buffer)
      const moment = takenAt
        ? bucketForTakenAt(new Date(takenAt))
        : selectedMoment ?? momentForInstant(new Date())?.id ?? UNSORTED

      // Modération IA avant publication : décide approved / rejected / pending.
      const { status, reason } = await moderatePhoto(buffer.toString('base64'), file.type)

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
