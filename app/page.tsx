'use client'

import { useRef, useState, type ReactNode } from 'react'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { MOMENTS, UNSORTED, ALL_BUCKET_LABELS, momentForInstant, type Bucket } from '@/lib/schedule'
import { WEDDING, COUPLE } from '@/lib/wedding'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const MOMENT_OPTIONS: Bucket[] = [...MOMENTS.map((m) => m.id), UNSORTED]

// Sceau M&C — même monogramme que la projection et la galerie.
function Seal({ size }: { size: number }) {
  return (
    <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: size, height: size, border: '1px solid var(--or)' }} aria-hidden="true">
      <span className="font-display flex items-baseline" style={{ color: 'var(--or)', fontSize: size * 0.4, letterSpacing: '0.02em' }}>
        {WEDDING.initials[0]}
        <span className="font-display italic" style={{ fontSize: size * 0.26, margin: '0 2px' }}>&amp;</span>
        {WEDDING.initials[1]}
      </span>
    </span>
  )
}

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export default function GuestPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  // Pré-rempli sur le moment de l'instant : un envoi en direct n'a rien à régler.
  const [moment, setMoment] = useState<Bucket>(() => momentForInstant(new Date())?.id ?? UNSORTED)

  async function handleFiles(files: FileList) {
    if (!files.length) return
    setState('uploading')

    const form = new FormData()
    form.append('moment', moment)
    Array.from(files).forEach((f) => form.append('files', f))

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState('done')
      setMessage(`${data.count} photo${data.count > 1 ? 's' : ''} envoyée${data.count > 1 ? 's' : ''}`)
    } catch (e: unknown) {
      setState('error')
      setMessage(e instanceof Error ? e.message : 'Erreur lors de l\'envoi')
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-14"
      style={{ background: 'radial-gradient(125% 80% at 50% -8%, #1c2740 0%, var(--nuit-scene) 58%)' }}
    >
      <div className="w-full max-w-sm text-center fade-in">

        {/* En-tête : monogramme + couple, le vrai faire-part (fini l'emoji 💍). */}
        <div className="flex flex-col items-center">
          <span className="drift"><Seal size={76} /></span>
          <p className="mt-6 uppercase" style={{ color: 'var(--or)', fontSize: '0.66rem', letterSpacing: '0.34em' }}>
            {COUPLE}
          </p>
          <p className="mt-1.5 uppercase" style={{ color: 'rgba(244,239,228,0.42)', fontSize: '0.6rem', letterSpacing: '0.3em' }}>
            {WEDDING.dateLabel}
          </p>
        </div>

        <h1 className="font-display mt-9" style={{ color: 'var(--ivoire)', fontWeight: 500, fontSize: '2.4rem', lineHeight: 1.05 }}>
          Partagez vos photos
        </h1>
        <span className="rule-draw inline-block mt-5" style={{ width: 48, height: 1, background: 'var(--or)' }} />
        <p className="mt-5" style={{ color: 'rgba(244,239,228,0.6)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Vos clichés rejoignent le grand écran de la fête et la galerie des mariés.
        </p>

        {state === 'idle' && (
          <div
            className="mt-9"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          >
            <div className="flex flex-col gap-3">
              <label className="text-left">
                <span className="block uppercase mb-2" style={{ color: 'var(--or)', fontSize: '0.6rem', letterSpacing: '0.28em' }}>Quel moment ?</span>
                <select
                  value={moment}
                  onChange={(e) => setMoment(e.target.value as Bucket)}
                  className="w-full appearance-none rounded-xl py-3.5 px-4 focus:outline-none"
                  style={{ background: 'var(--nuit-raise)', border: '1px solid var(--filet-nuit)', color: 'var(--ivoire)' }}
                >
                  {MOMENT_OPTIONS.map((m) => (
                    <option key={m} value={m} style={{ background: '#1a2236', color: '#F4EFE4' }}>{ALL_BUCKET_LABELS[m]}</option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => cameraRef.current?.click()}
                className="lift w-full rounded-xl py-4 font-medium flex items-center justify-center gap-2.5"
                style={{ background: 'var(--or)', color: 'var(--nuit-scene)', boxShadow: '0 8px 24px rgba(184,146,74,0.18)' }}
              >
                <Icon><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></Icon>
                Prendre une photo
              </button>

              <button
                onClick={() => inputRef.current?.click()}
                className="lift w-full rounded-xl py-4 font-medium flex items-center justify-center gap-2.5"
                style={{ background: 'transparent', border: '1px solid var(--filet-nuit)', color: 'var(--ivoire)' }}
              >
                <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-4.5-4.5L5 22" /></Icon>
                Choisir depuis l&apos;album
              </button>
            </div>
            <p className="mt-3" style={{ color: 'rgba(244,239,228,0.3)', fontSize: '0.72rem' }}>15 Mo maximum par photo</p>

            {/* Appareil photo : capture ouvre directement la caméra du téléphone */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            {/* Album : sélection multiple depuis la galerie */}
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>
        )}

        {state === 'uploading' && (
          <div className="py-14 fade-in flex flex-col items-center gap-5">
            <span className="spin rounded-full" style={{ width: 38, height: 38, border: '2px solid var(--filet-nuit)', borderTopColor: 'var(--or)' }} />
            <p style={{ color: 'rgba(244,239,228,0.7)' }}>Envoi en cours…</p>
          </div>
        )}

        {state === 'done' && (
          <div className="py-12 fade-in flex flex-col items-center">
            <span className="flex items-center justify-center rounded-full" style={{ width: 56, height: 56, border: '1px solid var(--or)', color: 'var(--or)' }}>
              <Icon size={26}><path d="M20 6 9 17l-5-5" /></Icon>
            </span>
            <p className="font-display italic mt-5" style={{ color: 'var(--ivoire)', fontSize: '1.5rem' }}>{message}</p>
            <p className="mt-2" style={{ color: 'rgba(244,239,228,0.45)', fontSize: '0.85rem' }}>Visible après validation des mariés.</p>
            <button
              onClick={() => { setState('idle'); setMessage('') }}
              className="lift mt-7 rounded-full px-7 py-2.5 text-sm font-medium"
              style={{ background: 'var(--or)', color: 'var(--nuit-scene)' }}
            >
              Envoyer d&apos;autres photos
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="py-12 fade-in flex flex-col items-center">
            <span className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, border: '1px solid rgba(214,120,120,0.6)', color: '#e09a9a' }}>
              <Icon size={24}><path d="M12 8v5" /><path d="M12 16.5h.01" /><circle cx="12" cy="12" r="9" /></Icon>
            </span>
            <p className="mt-4" style={{ color: '#e09a9a', fontSize: '0.9rem' }}>{message}</p>
            <button
              onClick={() => { setState('idle'); setMessage('') }}
              className="lift mt-5 rounded-full px-7 py-2.5 text-sm font-medium"
              style={{ border: '1px solid var(--filet-nuit)', color: 'var(--ivoire)' }}
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="mt-11">
          <a href="/galerie" className="font-display italic" style={{ color: 'var(--or)', fontSize: '1.05rem' }}>
            Voir la galerie du mariage →
          </a>
        </div>

        {APP_URL && (
          <div className="mt-9 flex flex-col items-center gap-3">
            <div className="rounded-xl p-3.5" style={{ background: 'var(--ivoire)' }}>
              <QRCode value={APP_URL} size={132} bgColor="#F4EFE4" fgColor="#1B2436" />
            </div>
            <p className="uppercase" style={{ color: 'rgba(244,239,228,0.4)', fontSize: '0.6rem', letterSpacing: '0.24em' }}>Scannez pour partager autour de vous</p>
          </div>
        )}

        <p className="mt-9 mx-auto" style={{ color: 'rgba(244,239,228,0.28)', fontSize: '0.7rem', lineHeight: 1.5, maxWidth: '20rem' }}>
          Photos partagées uniquement avec les invités du mariage et supprimées sous 30 jours.
        </p>
      </div>
    </main>
  )
}
