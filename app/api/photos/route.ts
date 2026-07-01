import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SIGNED_URL_EXPIRY = 8 * 60 * 60 // 8 heures

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'approved'
  const moment = req.nextUrl.searchParams.get('moment')

  // Seules les photos 'approved' sont publiques. 'pending' / 'rejected' (contenu
  // en attente de revue ou bloqué par la modération) exigent le token modérateur,
  // même vérif que /api/moderate. Sans ça, n'importe qui lit le contenu rejeté.
  if (status !== 'approved') {
    const token = req.headers.get('x-mod-token')
    if (token !== process.env.MODERATOR_PASSWORD) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  }

  const admin = supabaseAdmin()

  let query = admin
    .from('photos')
    .select('id, filename, status, created_at, taken_at, moment, moderation_reason')
    .eq('status', status)
  if (moment) query = query.eq('moment', moment)

  // Tri chronologique sur la prise de vue (fallback upload si EXIF absent).
  const { data, error } = await query
    .order('taken_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json([])

  const signed = await Promise.all(
    data.map(async (photo) => {
      // Vignette dérivée par convention : <base>.thumb.jpg à côté du plein.
      const thumbPath = photo.filename.replace(/\.[^./]+$/, '.thumb.jpg')
      const [full, thumb] = await Promise.all([
        admin.storage.from('Photos').createSignedUrl(photo.filename, SIGNED_URL_EXPIRY),
        admin.storage.from('Photos').createSignedUrl(thumbPath, SIGNED_URL_EXPIRY),
      ])
      const url = full.error ? null : full.data?.signedUrl
      // Repli sur le plein si pas de vignette (photo sans dérivé).
      const thumbUrl = thumb.error || !thumb.data?.signedUrl ? url : thumb.data.signedUrl
      return { ...photo, url, thumbUrl }
    })
  )

  return NextResponse.json(signed.filter((p) => p.url))
}
