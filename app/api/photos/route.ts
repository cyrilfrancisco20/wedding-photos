import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SIGNED_URL_EXPIRY = 8 * 60 * 60 // 8 heures

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'approved'
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('photos')
    .select('id, filename, status, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json([])

  const signed = await Promise.all(
    data.map(async (photo) => {
      const { data: urlData, error: urlError } = await admin.storage
        .from('Photos')
        .createSignedUrl(photo.filename, SIGNED_URL_EXPIRY)
      return { ...photo, url: urlError ? null : urlData?.signedUrl }
    })
  )

  return NextResponse.json(signed.filter((p) => p.url))
}
