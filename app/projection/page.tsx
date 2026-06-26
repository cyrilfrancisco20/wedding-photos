'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

type Photo = { id: string; url: string }

const SLIDE_DURATION = 6000
const REFRESH_INTERVAL = 15000

export default function ProjectionPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const fetchPhotos = useCallback(async () => {
    const res = await fetch('/api/photos?status=approved')
    const data = await res.json()
    if (Array.isArray(data)) setPhotos(data)
  }, [])

  useEffect(() => {
    fetchPhotos()
    const refresh = setInterval(fetchPhotos, REFRESH_INTERVAL)
    return () => clearInterval(refresh)
  }, [fetchPhotos])

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length)
        setVisible(true)
      }, 700)
    }, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [photos.length])

  const prev = () => {
    setVisible(false)
    setTimeout(() => { setIndex((i) => (i - 1 + photos.length) % photos.length); setVisible(true) }, 300)
  }
  const next = () => {
    setVisible(false)
    setTimeout(() => { setIndex((i) => (i + 1) % photos.length); setVisible(true) }, 300)
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">💍</div>
        <p className="text-white/50 text-lg">En attente de photos...</p>
      </div>
    )
  }

  const current = photos[index]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden select-none"
      onClick={next}>

      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <Image
          key={current.id}
          src={current.url}
          alt=""
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); prev() }}
          className="text-white/60 hover:text-white text-2xl transition-colors px-2"
        >
          ‹
        </button>
        <span className="text-white/50 text-sm font-light tracking-widest">
          {index + 1} / {photos.length}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); next() }}
          className="text-white/60 hover:text-white text-2xl transition-colors px-2"
        >
          ›
        </button>
      </div>

      <div className="absolute top-4 right-6 text-white/30 text-sm font-light tracking-widest pointer-events-none">
        💍
      </div>
    </div>
  )
}
