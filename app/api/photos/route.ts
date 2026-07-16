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
      const fullUrl = full.error ? null : (full.data?.signedUrl ?? null)
      const rawThumb = thumb.error ? null : (thumb.data?.signedUrl ?? null)

      // Repli croisé, dans les deux sens.
      //
      // Le 16/07, les 52 fichiers pleins ont été supprimés du storage par erreur
      // (pris pour des doublons de leurs vignettes). La galerie s'est vidée d'un
      // coup : elle ne servait que les lignes ayant un plein, alors que 32 vignettes
      // 600px existaient toujours. Afficher une photo de mariage en 600px vaut
      // infiniment mieux que ne rien afficher — c'est peut-être la seule trace qu'il
      // en reste. `degraded` dit la vérité au client : ce n'est pas la pleine
      // résolution, il ne faut pas la proposer au tirage.
      const url = fullUrl ?? rawThumb
      const thumbUrl = rawThumb ?? fullUrl
      return { ...photo, url, thumbUrl, degraded: !fullUrl && !!rawThumb }
    })
  )

  // Une ligne dont PLUS AUCUN fichier n'existe (ni plein ni vignette) est filtrée
  // ci-dessous. Sans ce log elle s'évanouit en silence : la galerie affiche moins de
  // photos que la base n'en compte, sans rien signaler. C'est ce qui a masqué 9
  // photos en juillet, puis les 52 le 16/07 sans le moindre avertissement.
  const broken = signed.filter((p) => !p.url)
  if (broken.length) {
    console.error(
      `[photos] ${broken.length} ligne(s) "${status}" sans AUCUN fichier dans le storage, non affichée(s) :`,
      broken.map((p) => p.filename).join(', ')
    )
  }
  const degradees = signed.filter((p) => p.degraded)
  if (degradees.length) {
    console.warn(
      `[photos] ${degradees.length} photo(s) servie(s) en vignette 600px : le fichier pleine résolution manque.`
    )
  }

  return NextResponse.json(signed.filter((p) => p.url))
}
