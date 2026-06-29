import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Trop de photos envoyées, réessayez dans 1h' }, { status: 429 })
  }

  const form = await req.formData()
  const files = form.getAll('files') as File[]

  if (!files.length) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  if (files.length > 10) return NextResponse.json({ error: 'Maximum 10 photos à la fois' }, { status: 400 })

  const admin = supabaseAdmin()
  const results = []

  for (const file of files) {
    if (file.size > 15 * 1024 * 1024) {
      results.push({ error: `${file.name} trop volumineux (max 15 Mo)` })
      continue
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      results.push({ error: `${file.name} : format non accepté (JPEG, PNG, WEBP uniquement)` })
      continue
    }

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: storageError } = await admin.storage
      .from('Photos')
      .upload(filename, buffer, { contentType: file.type })

    if (storageError) {
      results.push({ error: storageError.message })
      continue
    }

    const { data: urlData } = admin.storage.from('Photos').getPublicUrl(filename)

    const { error: dbError } = await admin
      .from('photos')
      .insert({ filename, url: urlData.publicUrl, status: 'pending' })

    if (dbError) results.push({ error: dbError.message })
    else results.push({ ok: true, filename })
  }

  const errors = results.filter((r) => r.error)
  if (errors.length === results.length) return NextResponse.json({ error: errors[0].error }, { status: 500 })

  return NextResponse.json({ ok: true, count: results.filter((r) => r.ok).length })
}
