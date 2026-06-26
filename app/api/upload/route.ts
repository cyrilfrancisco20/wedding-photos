import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const files = form.getAll('files') as File[]

  if (!files.length) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const admin = supabaseAdmin()
  const results = []

  for (const file of files) {
    if (file.size > 15 * 1024 * 1024) {
      results.push({ error: `${file.name} trop volumineux (max 15 Mo)` })
      continue
    }

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: storageError } = await admin.storage
      .from('photos')
      .upload(filename, buffer, { contentType: file.type })

    if (storageError) {
      results.push({ error: storageError.message })
      continue
    }

    const { data: urlData } = admin.storage.from('photos').getPublicUrl(filename)

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
