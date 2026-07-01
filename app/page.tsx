'use client'

// Page d'accueil invité (scannée via le QR). Style « Variante A » éditorial doux.
// Partage des photos PAR JOUR : l'invité choisit Vendredi / Samedi / Dimanche,
// puis prend ou joint une photo, qui part vers /api/upload rangée sur ce jour.

import { useRef, useState, type ReactNode } from 'react'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { DAY_ORDER, DAY_LABELS, dayForInstant, type Day } from '@/lib/schedule'
import { WEDDING, COUPLE } from '@/lib/wedding'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const DAY_PHOTO: Record<Day, string> = {
  vendredi: '/accueil/g1.jpg',
  samedi: '/accueil/g2.jpg',
  dimanche: '/accueil/g3.jpg',
}

const C = { ivory: '#F7F2E9', blush: '#ECD8CF', sage: '#DDE3D2', terra: '#C77B5E', ink: '#4A3A30', muted: '#9A8470' }

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  )
}

export default function GuestPage() {
  const camRef = useRef<HTMLInputElement>(null)
  const albRef = useRef<HTMLInputElement>(null)
  // Jour pré-sélectionné sur le jour courant si on est pendant le mariage.
  const [activeDay, setActiveDay] = useState<Day | null>(() => dayForInstant(new Date()))
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || !activeDay) return
    setState('uploading')
    const form = new FormData()
    form.append('moment', activeDay)
    Array.from(files).forEach((f) => form.append('files', f))
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState('done')
      const n = data.count as number
      setMessage(`${n} photo${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''} pour ${DAY_LABELS[activeDay]}`)
    } catch (e: unknown) {
      setState('error')
      setMessage(e instanceof Error ? e.message : "Erreur lors de l'envoi")
    }
  }

  return (
    <main style={{ background: C.ivory, color: C.ink, fontFamily: 'var(--font-body), system-ui, sans-serif' }}>

      {/* HÉRO plein cadre : le faire-part porte déjà prénoms + date. */}
      <section className="relative overflow-hidden" style={{ height: '64vh', minHeight: 420 }}>
        <img src="/accueil/hero.png" alt="Morgane & Cyril" className="mq-zoom absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,13,8,0.2) 0%, rgba(20,13,8,0.6) 100%), linear-gradient(180deg, rgba(20,13,8,0.5), rgba(20,13,8,0.36) 45%, rgba(20,13,8,0.6))' }}
        />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '30%', background: 'linear-gradient(to top, rgba(40,25,18,0.42), transparent)' }} />
        <div className="absolute inset-x-0 flex flex-col items-center fade-in" style={{ bottom: 22, color: '#FBF6EC' }}>
          <span className="uppercase" style={{ fontSize: '0.58rem', letterSpacing: '0.34em' }}>Partagez vos photos</span>
          <span className="drift" style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: 4 }}>↓</span>
        </div>
      </section>

      {/* PARTAGE PAR JOUR */}
      <section className="text-center" style={{ padding: '64px 24px 28px' }}>
        <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: C.terra, fontWeight: 600, margin: 0 }}>{COUPLE}</p>
        <h1 className="font-display" style={{ fontWeight: 500, fontSize: 'clamp(2.1rem, 6vw, 2.8rem)', lineHeight: 1.05, margin: '.3em 0 0' }}>Partagez vos photos</h1>
        <p className="font-display italic" style={{ fontSize: '1.05rem', color: '#5d4736', maxWidth: '28ch', margin: '.7em auto 0' }}>
          Choisissez le jour, prenez ou ajoutez vos photos. Elles s'affichent sur le grand écran et rejoignent notre galerie.
        </p>

        {state === 'done' ? (
          <div className="fade-in flex flex-col items-center" style={{ padding: '32px 0 8px' }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: 54, height: 54, border: `1px solid ${C.terra}`, color: C.terra }}>
              <Icon><path d="M20 6 9 17l-5-5" /></Icon>
            </span>
            <p className="font-display italic" style={{ fontSize: '1.4rem', marginTop: 16 }}>{message}</p>
            <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: 6 }}>Visible après validation des mariés.</p>
            <button onClick={() => { setState('idle'); setMessage('') }} className="lift" style={{ marginTop: 22, padding: '11px 26px', borderRadius: 999, background: C.terra, color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
              Envoyer d&apos;autres photos
            </button>
          </div>
        ) : state === 'uploading' ? (
          <div className="fade-in flex flex-col items-center gap-4" style={{ padding: '44px 0' }}>
            <span className="spin rounded-full" style={{ width: 36, height: 36, border: `2px solid ${C.blush}`, borderTopColor: C.terra }} />
            <p style={{ color: C.muted }}>Envoi en cours…</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3.5 mx-auto" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 560, marginTop: 36 }}>
              {DAY_ORDER.map((d) => {
                const active = activeDay === d
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(active ? null : d)}
                    className="relative overflow-hidden"
                    style={{ aspectRatio: '3 / 4', borderRadius: 6, background: '#ece2d4', border: active ? `2px solid ${C.terra}` : '2px solid transparent', cursor: 'pointer' }}
                    aria-pressed={active}
                  >
                    <img src={DAY_PHOTO[d]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 42%, rgba(40,25,18,0.6))' }} />
                    <span className="font-display absolute left-0 right-0" style={{ bottom: 12, color: '#FBF6EC', fontSize: '1.25rem' }}>{DAY_LABELS[d]}</span>
                    <span className="flex items-center justify-center absolute" style={{ top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: active ? C.terra : 'rgba(251,246,236,0.92)', color: active ? '#fff' : C.ink, fontSize: '0.9rem', lineHeight: 1 }}>{active ? '×' : '+'}</span>
                  </button>
                )
              })}
            </div>

            {activeDay && (
              <div className="fade-in mx-auto" style={{ maxWidth: 400, marginTop: 18, padding: 20, borderRadius: 14, background: '#fff', border: `1px solid ${C.blush}`, boxShadow: '0 14px 36px -18px rgba(120,80,50,0.4)' }}>
                <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: C.terra, marginBottom: 14 }}>{DAY_LABELS[activeDay]} · vos photos</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => camRef.current?.click()} className="lift flex items-center justify-center gap-2.5" style={{ padding: '13px 0', borderRadius: 12, background: C.terra, color: '#fff', fontWeight: 500 }}>
                    <Icon><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></Icon>
                    Prendre une photo
                  </button>
                  <button onClick={() => albRef.current?.click()} className="lift flex items-center justify-center gap-2.5" style={{ padding: '13px 0', borderRadius: 12, border: `1px solid ${C.blush}`, color: C.ink, fontWeight: 500 }}>
                    <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-4.5-4.5L5 22" /></Icon>
                    Joindre une photo
                  </button>
                </div>
                <p style={{ marginTop: 12, color: C.muted, fontSize: '0.7rem' }}>Rangée automatiquement dans « {DAY_LABELS[activeDay]} ».</p>
              </div>
            )}
            {!activeDay && <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: 16 }}>Choisissez d&apos;abord un jour.</p>}

            {state === 'error' && <p style={{ color: '#c0584a', fontSize: '0.85rem', marginTop: 14 }}>{message}</p>}
          </>
        )}

        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={albRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        <div style={{ marginTop: 40 }}>
          <a href="/galerie" className="font-display italic" style={{ color: C.terra, fontSize: '1.05rem' }}>Voir la galerie du mariage →</a>
        </div>

        {APP_URL && (
          <div className="flex flex-col items-center gap-3" style={{ marginTop: 32 }}>
            <div className="rounded-xl" style={{ padding: 12, background: '#fff', border: `1px solid ${C.blush}` }}>
              <QRCode value={APP_URL} size={130} bgColor="#ffffff" fgColor={C.ink} />
            </div>
            <p className="uppercase" style={{ color: C.muted, fontSize: '0.58rem', letterSpacing: '0.24em' }}>Scannez pour partager autour de vous</p>
          </div>
        )}

        <p style={{ color: C.muted, fontSize: '0.7rem', lineHeight: 1.5, maxWidth: '22rem', margin: '32px auto 0' }}>
          Photos partagées uniquement avec les invités du mariage et supprimées sous 30 jours.
        </p>
      </section>

      <footer className="text-center" style={{ background: C.sage, padding: '48px 30px' }}>
        <span className="font-display inline-flex items-center justify-center rounded-full" style={{ width: 56, height: 56, border: `1px solid rgba(74,58,48,0.4)`, fontSize: '1.35rem', color: C.ink }}>
          {WEDDING.initials[0]}<i className="font-display italic" style={{ fontSize: '0.7em', margin: '0 1px' }}>&amp;</i>{WEDDING.initials[1]}
        </span>
        <p className="font-display italic" style={{ fontSize: '1.15rem', color: C.ink, marginTop: 14 }}>{WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
