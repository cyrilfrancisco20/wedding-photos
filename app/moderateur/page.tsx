'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { DAY_ORDER, UNSORTED, ALL_BUCKET_LABELS, type Bucket } from '@/lib/schedule'
import type { ReactNode } from 'react'

type Photo = { id: string; url: string; created_at: string; moment: Bucket | null; moderation_reason?: string | null }
type View = 'pending' | 'classer'

const MOMENT_OPTIONS: Bucket[] = [...DAY_ORDER, UNSORTED]

// Charte « Variante A » claire, alignée sur l'accueil et la galerie.
const C = { ivory: '#F7F2E9', blush: '#ECD8CF', sage: '#DDE3D2', terra: '#C77B5E', ink: '#4A3A30', muted: '#9A8470', red: '#C0584A' }

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  )
}

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
        style={{ background: C.ivory, color: C.ink, fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
        <div className="w-full max-w-sm text-center" style={{ background: '#fff', borderRadius: 16, padding: 32, border: `1px solid ${C.blush}`, boxShadow: '0 18px 44px -22px rgba(120,80,50,0.4)' }}>
          <span className="inline-flex items-center justify-center rounded-full" style={{ width: 52, height: 52, border: `1px solid ${C.terra}`, color: C.terra }}>
            <Icon><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>
          </span>
          <h1 className="font-display" style={{ fontWeight: 500, fontSize: '1.6rem', margin: '18px 0 22px' }}>Espace modérateur</h1>
          <input
            type="password"
            placeholder="Mot de passe"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="w-full text-sm mb-4 focus:outline-none"
            style={{ border: `1px solid ${C.blush}`, borderRadius: 12, padding: '12px 16px', color: C.ink, background: C.ivory }}
          />
          <button
            onClick={login}
            className="lift w-full text-sm font-medium"
            style={{ background: C.terra, color: '#fff', borderRadius: 12, padding: '12px 0' }}
          >
            Entrer
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: C.ivory, color: C.ink, fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display" style={{ fontWeight: 500, fontSize: '1.9rem' }}>Modération</h1>
          <button onClick={loadPhotos} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: C.terra }}>
            <Icon><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></Icon>
            Actualiser
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {([['pending', 'En attente', counts.pending], ['classer', 'À classer', counts.classer]] as const).map(([v, label, n]) => {
            const active = view === v
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className="text-sm transition-colors"
                style={{ padding: '8px 18px', borderRadius: 999, background: active ? C.terra : '#fff', color: active ? '#fff' : C.muted, border: `1px solid ${active ? C.terra : C.blush}` }}
              >
                {label} · {n}
              </button>
            )
          })}
        </div>

        {loading && <div className="text-center py-16" style={{ color: C.muted }}>Chargement…</div>}

        {!loading && photos.length === 0 && (
          <div className="text-center py-16">
            <span className="inline-flex items-center justify-center rounded-full" style={{ width: 48, height: 48, border: `1px solid ${C.terra}`, color: C.terra }}>
              <Icon><path d="M20 6 9 17l-5-5" /></Icon>
            </span>
            <p style={{ color: C.muted, marginTop: 14 }}>
              {view === 'pending' ? 'Aucune photo en attente' : 'Aucune photo à classer'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden" style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.blush}`, boxShadow: '0 14px 36px -22px rgba(120,80,50,0.4)' }}>
              <div className="relative w-full h-72" style={{ background: '#ece2d4' }}>
                <Image src={photo.url} alt="Photo à modérer" fill className="object-contain" unoptimized />
              </div>
              {photo.moderation_reason && (
                <p className="px-4 pt-3 text-xs" style={{ color: C.muted }}>IA · {photo.moderation_reason}</p>
              )}

              <div className="flex items-center gap-2.5 px-4 pt-3">
                <span className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: C.muted }}>Jour</span>
                <select
                  value={photo.moment ?? UNSORTED}
                  onChange={(e) => reassign(photo.id, e.target.value as Bucket)}
                  className="flex-1 text-sm focus:outline-none"
                  style={{ border: `1px solid ${C.blush}`, borderRadius: 10, padding: '8px 12px', color: C.ink, background: C.ivory }}
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
                    className="lift flex-1 flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: C.terra, color: '#fff', borderRadius: 12, padding: '12px 0' }}
                  >
                    <Icon><path d="M20 6 9 17l-5-5" /></Icon>
                    Approuver
                  </button>
                  <button
                    onClick={() => moderate(photo.id, 'rejected')}
                    className="lift flex-1 flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: '#fff', color: C.red, borderRadius: 12, padding: '12px 0', border: `1px solid ${C.red}33` }}
                  >
                    <Icon><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
                    Refuser
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
