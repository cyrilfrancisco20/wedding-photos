'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Photo = { id: string; url: string; created_at: string }

export default function ModerateurPage() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({ pending: 0, approved: 0 })

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
    const [pending, approved] = await Promise.all([
      fetch('/api/photos?status=pending').then((r) => r.json()),
      fetch('/api/photos?status=approved').then((r) => r.json()),
    ])
    setPhotos(Array.isArray(pending) ? pending : [])
    setCounts({
      pending: Array.isArray(pending) ? pending.length : 0,
      approved: Array.isArray(approved) ? approved.length : 0,
    })
    setLoading(false)
  }

  async function moderate(id: string, action: 'approved' | 'rejected') {
    await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, token }),
    })
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    setCounts((c) => ({
      ...c,
      pending: c.pending - 1,
      approved: action === 'approved' ? c.approved + 1 : c.approved,
    }))
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('mod_token')
    if (saved) { setToken(saved); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (authed) loadPhotos()
  }, [authed])

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Modération</h1>
            <p className="text-sm text-stone-400 mt-1">
              {counts.pending} en attente · {counts.approved} approuvées
            </p>
          </div>
          <button
            onClick={loadPhotos}
            className="text-sm text-rose-500 hover:text-rose-700 font-medium"
          >
            Actualiser
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-stone-400">Chargement...</div>
        )}

        {!loading && photos.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-stone-500">Aucune photo en attente</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="relative w-full h-72">
                <Image
                  src={photo.url}
                  alt="Photo à modérer"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
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
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
