'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import { momentForInstant, dayForBucket, type Bucket } from '@/lib/schedule'

type Photo = { id: string; url: string; moment: Bucket | null; taken_at: string | null; created_at: string }

const SLIDE_DURATION = 6000
const REFRESH_INTERVAL = 15000

// Plus récent d'abord : les dernières photos envoyées passent vite à l'écran.
function recentFirst(a: Photo, b: Photo) {
  return (b.taken_at ?? b.created_at).localeCompare(a.taken_at ?? a.created_at)
}

export default function ProjectionPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [now, setNow] = useState(() => new Date())
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const fetchPhotos = useCallback(async () => {
    const res = await fetch('/api/photos?status=approved')
    const data = await res.json()
    if (Array.isArray(data)) setPhotos(data)
    setNow(new Date())
  }, [])

  useEffect(() => {
    fetchPhotos()
    const refresh = setInterval(fetchPhotos, REFRESH_INTERVAL)
    return () => clearInterval(refresh)
  }, [fetchPhotos])

  const current = momentForInstant(now)

  // Photos à projeter : le moment courant d'abord, complété par le reste du jour.
  const playlist = useMemo(() => {
    if (!current || !current.projects) return []
    const day = current.day
    const primary = photos.filter((p) => p.moment === current.id).sort(recentFirst)
    const backfill = photos
      .filter((p) => p.moment !== current.id && dayForBucket(p.moment ?? 'a-classer') === day)
      .sort(recentFirst)
    return [...primary, ...backfill]
  }, [photos, current])

  useEffect(() => {
    if (playlist.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % playlist.length)
        setVisible(true)
      }, 700)
    }, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [playlist.length])

  // Veille : cérémonie, hors créneaux, ou créneau encore sans photo.
  if (!current || !current.projects || playlist.length === 0) {
    const message = !current
      ? 'À tout de suite'
      : !current.projects
        ? `${current.label} en cours`
        : `En attente des premières photos · ${current.label}`
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 select-none">
        <div className="text-6xl">💍</div>
        <p className="text-white/50 text-lg font-light tracking-wide">{message}</p>
      </div>
    )
  }

  const photo = playlist[index % playlist.length]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden select-none"
      onClick={() => { setVisible(false); setTimeout(() => { setIndex((i) => (i + 1) % playlist.length); setVisible(true) }, 300) }}>

      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: visible ? 1 : 0 }}>
        <Image key={photo.id} src={photo.url} alt="" fill className="object-contain" unoptimized priority />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-light tracking-widest">
        {index + 1} / {playlist.length}
      </div>

      <div className="absolute top-5 right-7 text-white/40 text-sm font-light tracking-widest pointer-events-none">
        {current.label}
      </div>
    </div>
  )
}
