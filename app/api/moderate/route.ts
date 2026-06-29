import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ALL_BUCKET_LABELS } from '@/lib/schedule'

const VALID_MOMENTS = new Set(Object.keys(ALL_BUCKET_LABELS))

export async function POST(req: NextRequest) {
  const { id, action, moment, token } = await req.json()

  if (token !== process.env.MODERATOR_PASSWORD) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = supabaseAdmin()

  // Réaffectation manuelle d'un dossier de moment.
  if (typeof moment === 'string') {
    if (!VALID_MOMENTS.has(moment)) {
      return NextResponse.json({ error: 'Moment invalide' }, { status: 400 })
    }
    const { error } = await admin.from('photos').update({ moment }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (!['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  const { error } = await admin.from('photos').update({ status: action }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
