import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validModToken } from '@/lib/auth'

const SIGNED_URL_EXPIRY = 8 * 60 * 60 // 8 heures

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'approved'
  const moment = req.nextUrl.searchParams.get('moment')

  // Seules les photos 'approved' sont publiques. 'pending' / 'rejected' (contenu
  // en attente de revue ou bloqué par la modération) exigent le token modérateur,
  // même vérif que /api/moderate. Sans ça, n'importe qui lit le contenu rejeté.
  if (status !== 'approved') {
    if (!validModToken(req.headers.get('x-mod-token'))) {
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

  // Une ligne en base dont le fichier a disparu du storage est filtrée ci-dessous.
  // Sans ce log elle s'évanouit en silence : la galerie affiche moins de photos que
  // la base n'en compte, sans rien signaler. C'est exactement ce qui a masqué 9
  // photos (fichiers détruits par le bug UTF-8 d'avant le 11/07 puis supprimés).
  const broken = signed.filter((p) => !p.url)
  if (broken.length) {
    console.error(
      `[photos] ${broken.length} ligne(s) "${status}" sans fichier dans le storage, non affichée(s) :`,
      broken.map((p) => p.filename).join(', ')
    )
  }

  return NextResponse.json(signed.filter((p) => p.url))
}
