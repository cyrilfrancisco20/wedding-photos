'use client'

import { useRef, useState } from 'react'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { MOMENTS, UNSORTED, ALL_BUCKET_LABELS, momentForInstant, type Bucket } from '@/lib/schedule'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const MOMENT_OPTIONS: Bucket[] = [...MOMENTS.map((m) => m.id), UNSORTED]

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
      setMessage(`${data.count} photo${data.count > 1 ? 's' : ''} envoyée${data.count > 1 ? 's' : ''} !`)
    } catch (e: unknown) {
      setState('error')
      setMessage(e instanceof Error ? e.message : 'Erreur lors de l\'envoi')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(135deg, #fdf8f5 0%, #f5ede6 100%)' }}>

      <div className="w-full max-w-md text-center fade-in">
        <div className="text-5xl mb-4">💍</div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Partagez vos photos</h1>
        <p className="text-stone-500 text-sm mb-10">
          Envoyez vos plus beaux souvenirs de la soirée
        </p>

        {state === 'idle' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          >
            <div className="flex flex-col gap-3">
              <label className="text-left">
                <span className="block text-stone-500 text-xs mb-1.5">Quel moment ?</span>
                <select
                  value={moment}
                  onChange={(e) => setMoment(e.target.value as Bucket)}
                  className="w-full border-2 border-rose-200 rounded-2xl py-3 px-4 text-stone-700 bg-white focus:outline-none focus:border-rose-400"
                >
                  {MOMENT_OPTIONS.map((m) => (
                    <option key={m} value={m}>{ALL_BUCKET_LABELS[m]}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full bg-rose-500 text-white rounded-2xl py-4 font-medium hover:bg-rose-600 transition-colors"
              >
                📸 Prendre une photo
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-rose-200 text-stone-700 rounded-2xl py-4 font-medium hover:border-rose-400 hover:bg-rose-50/50 transition-colors"
              >
                🖼️ Choisir depuis l&apos;album
              </button>
            </div>
            <p className="text-stone-300 text-xs mt-3">Max 15 Mo par photo</p>

            {/* Appareil photo : capture ouvre directement la caméra du téléphone */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            {/* Album : sélection multiple depuis la galerie */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        )}

        {state === 'uploading' && (
          <div className="py-12 fade-in">
            <div className="text-4xl mb-4 pulse-soft">⏳</div>
            <p className="text-stone-600">Envoi en cours...</p>
          </div>
        )}

        {state === 'done' && (
          <div className="py-10 fade-in">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-stone-700 font-semibold text-lg">{message}</p>
            <p className="text-stone-400 text-sm mt-2">Les photos seront visibles après validation</p>
            <button
              onClick={() => { setState('idle'); setMessage('') }}
              className="mt-6 px-6 py-2 bg-rose-500 text-white rounded-full text-sm hover:bg-rose-600 transition-colors"
            >
              Envoyer d&apos;autres photos
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="py-10 fade-in">
            <div className="text-4xl mb-4">😕</div>
            <p className="text-red-500 text-sm">{message}</p>
            <button
              onClick={() => { setState('idle'); setMessage('') }}
              className="mt-4 px-6 py-2 bg-stone-700 text-white rounded-full text-sm hover:bg-stone-800 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="mt-10">
          <a href="/galerie" className="text-rose-500 text-sm font-medium hover:text-rose-700">
            Voir la galerie du mariage →
          </a>
        </div>

        {APP_URL && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <QRCode value={APP_URL} size={140} />
            </div>
            <p className="text-stone-400 text-xs">Scannez pour partager avec vos proches</p>
          </div>
        )}

        <p className="mt-8 text-stone-300 text-xs text-center max-w-xs mx-auto">
          Photos partagées uniquement avec les invités du mariage et supprimées sous 30 jours.
        </p>
      </div>
    </main>
  )
}
