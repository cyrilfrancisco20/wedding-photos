'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import { MOMENTS, DAY_ORDER, DAY_LABELS, UNSORTED, ALL_BUCKET_LABELS, type Day, type Bucket } from '@/lib/schedule'

type Photo = { id: string; url: string; moment: Bucket | null; taken_at: string | null; created_at: string }

type Tab = Day | typeof UNSORTED

function chrono(a: Photo, b: Photo) {
  return (a.taken_at ?? a.created_at).localeCompare(b.taken_at ?? b.created_at)
}

export default function GaleriePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tab, setTab] = useState<Tab>('samedi')
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/photos?status=approved')
    const data = await res.json()
    if (Array.isArray(data)) setPhotos(data)
  }, [])

  useEffect(() => { load() }, [load])

  const byMoment = useMemo(() => {
    const map = new Map<string, Photo[]>()
    for (const p of photos) {
      const key = p.moment ?? UNSORTED
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    for (const list of map.values()) list.sort(chrono)
    return map
  }, [photos])

  const unsortedCount = byMoment.get(UNSORTED)?.length ?? 0

  // Chapitres affichés pour l'onglet courant (moments du jour ayant des photos).
  const chapters =
    tab === UNSORTED
      ? [{ id: UNSORTED, label: ALL_BUCKET_LABELS[UNSORTED], photos: byMoment.get(UNSORTED) ?? [] }]
      : MOMENTS.filter((m) => m.day === tab && (byMoment.get(m.id)?.length ?? 0) > 0).map((m) => ({
          id: m.id,
          label: m.label,
          photos: byMoment.get(m.id) ?? [],
        }))

  const tabs: Tab[] = [...DAY_ORDER, ...(unsortedCount > 0 ? [UNSORTED] : [])]

  return (
    <main className="min-h-screen px-5 py-10" style={{ background: 'linear-gradient(135deg, #fdf8f5 0%, #f5ede6 100%)' }}>
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <div className="text-4xl mb-2">💍</div>
          <h1 className="text-3xl text-stone-800">Notre mariage</h1>
          <p className="text-stone-400 text-sm mt-1">11 juillet 2026</p>
        </header>

        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${
                tab === t ? 'bg-rose-500 text-white' : 'bg-white text-stone-500 hover:bg-rose-50'
              }`}
            >
              {t === UNSORTED ? `À classer · ${unsortedCount}` : DAY_LABELS[t as Day]}
            </button>
          ))}
        </div>

        {chapters.length === 0 && (
          <p className="text-center text-stone-400 py-16">Aucune photo pour ce jour pour l&apos;instant.</p>
        )}

        {chapters.map((ch) => (
          <section key={ch.id} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl text-stone-700">{ch.label}</h2>
              <span className="text-stone-300 text-sm">{ch.photos.length}</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
              {ch.photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(p)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-stone-200 fade-in"
                >
                  <Image src={p.url} alt="" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        >
          <div className="relative w-full h-full max-w-4xl">
            <Image src={lightbox.url} alt="" fill className="object-contain" unoptimized priority />
          </div>
          <button className="absolute top-5 right-6 text-white/70 text-3xl" aria-label="Fermer">×</button>
        </div>
      )}
    </main>
  )
}
