'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { MOMENTS, UNSORTED, ALL_BUCKET_LABELS, type Bucket } from '@/lib/schedule'

type Photo = { id: string; url: string; created_at: string; moment: Bucket | null; moderation_reason?: string | null }
type View = 'pending' | 'classer'

const MOMENT_OPTIONS: Bucket[] = [...MOMENTS.map((m) => m.id), UNSORTED]

export default function ModerateurPage() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [view, setView] = useState<View>('pending')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({ pending: 0, classer: 0 })

  async function login() {
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ping', action: 'approved', token }),
    })
    if (res.status !== 400 && res.status !== 401) {
      setAuthed(true)
      sessionStorage.setItem('mod_token', token)
    } else {
      alert('Mot de passe incorrect')
    }
  }

  async function loadPhotos() {
    setLoading(true)
    const [pending, classer] = await Promise.all([
      fetch('/api/photos?status=pending').then((r) => r.json()),
      fetch(`/api/photos?status=approved&moment=${UNSORTED}`).then((r) => r.json()),
    ])
    const pendingArr: Photo[] = Array.isArray(pending) ? pending : []
    const classerArr: Photo[] = Array.isArray(classer) ? classer : []
    setPhotos(view === 'pending' ? pendingArr : classerArr)
    setCounts({ pending: pendingArr.length, classer: classerArr.length })
    setLoading(false)
  }

  async function moderate(id: string, action: 'approved' | 'rejected') {
    await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, token }),
    })
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    setCounts((c) => ({ ...c, pending: c.pending - 1 }))
  }

  async function reassign(id: string, moment: Bucket) {
    await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, moment, token }),
    })
    // En vue "à classer", une photo réaffectée à un vrai moment quitte la liste.
    if (view === 'classer' && moment !== UNSORTED) {
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      setCounts((c) => ({ ...c, classer: c.classer - 1 }))
    } else {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, moment } : p)))
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('mod_token')
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (authed) loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, view])

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-xl font-bold text-stone-800 mb-6">Espace modérateur</h1>
          <input
            type="password"
            placeholder="Mot de passe"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            onClick={login}
            className="w-full bg-rose-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-rose-600 transition-colors"
          >
            Entrer
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-stone-800">Modération</h1>
          <button onClick={loadPhotos} className="text-sm text-rose-500 hover:text-rose-700 font-medium">
            Actualiser
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('pending')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${view === 'pending' ? 'bg-rose-500 text-white' : 'bg-white text-stone-500'}`}
          >
            En attente · {counts.pending}
          </button>
          <button
            onClick={() => setView('classer')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${view === 'classer' ? 'bg-rose-500 text-white' : 'bg-white text-stone-500'}`}
          >
            À classer · {counts.classer}
          </button>
        </div>

        {loading && <div className="text-center py-16 text-stone-400">Chargement...</div>}

        {!loading && photos.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-stone-500">
              {view === 'pending' ? 'Aucune photo en attente' : 'Aucune photo à classer'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="relative w-full h-72">
                <Image src={photo.url} alt="Photo à modérer" fill className="object-contain" unoptimized />
              </div>
              {photo.moderation_reason && (
                <p className="px-4 pt-3 text-xs text-stone-400">🤖 {photo.moderation_reason}</p>
              )}

              <div className="flex items-center gap-2 px-4 pt-3">
                <span className="text-xs text-stone-400">Moment</span>
                <select
                  value={photo.moment ?? UNSORTED}
                  onChange={(e) => reassign(photo.id, e.target.value as Bucket)}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  {MOMENT_OPTIONS.map((m) => (
                    <option key={m} value={m}>{ALL_BUCKET_LABELS[m]}</option>
                  ))}
                </select>
              </div>

              {view === 'pending' && (
                <div className="flex gap-3 p-4">
                  <button
                    onClick={() => moderate(photo.id, 'approved')}
                    className="flex-1 bg-emerald-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    ✓ Approuver
                  </button>
                  <button
                    onClick={() => moderate(photo.id, 'rejected')}
                    className="flex-1 bg-red-100 text-red-500 rounded-xl py-3 text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    ✕ Refuser
                  </button>
                </div>
              )}
              {view === 'classer' && <div className="pb-4" />}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
