'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import { dayForInstant, dayById, DAY_LABELS, type Bucket, type Day } from '@/lib/schedule'
import { WEDDING, COUPLE } from '@/lib/wedding'
import { demoPhotos } from '@/lib/demoPhotos'
import { Seal } from '@/app/components/Seal'

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
  // Forçage manuel via ?jour=samedi : test avant le jour J et secours si
  // l'horloge dérape. Ignore alors l'horloge.
  const [forced, setForced] = useState<string | null>(null)
  useEffect(() => {
    setForced(new URLSearchParams(window.location.search).get('jour'))
  }, [])

  const fetchPhotos = useCallback(async () => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) {
      setPhotos(demoPhotos())
      setNow(new Date())
      return
    }
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

  // Jour forcé par l'URL en priorité, sinon le jour de l'horloge.
  const forcedDay = forced && dayById(forced) ? (forced as Day) : null
  const currentDay = forcedDay ?? dayForInstant(now)

  // Photos à projeter : toutes les photos approuvées du jour courant.
  const playlist = useMemo(() => {
    if (!currentDay) return []
    return photos.filter((p) => p.moment === currentDay).sort(recentFirst)
  }, [photos, currentDay])

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

  // Veille : hors des trois jours, ou jour courant encore sans photo.
  if (!currentDay || playlist.length === 0) {
    const message = !currentDay
      ? 'À tout de suite'
      : `En attente des premières photos · ${DAY_LABELS[currentDay]}`
    return (
      <div className="proj-a relative overflow-hidden min-h-screen flex flex-col items-center justify-center gap-7 select-none" style={{ background: 'var(--nuit-scene)' }}>
        <img src="/accueil/hero.png" alt="" aria-hidden="true" className="mq-zoom absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(23,16,10,0.55) 0%, rgba(23,16,10,0.82) 100%)' }} />
        <div className="absolute flex items-center gap-3 pointer-events-none" style={{ left: 40, top: 30 }}>
          <Seal size={34} />
          <span className="font-display" style={{ color: 'rgba(244,239,228,0.72)', fontSize: '1.05rem', letterSpacing: '0.05em' }}>{COUPLE}</span>
        </div>
        <p className="relative font-display italic" style={{ color: 'rgba(244,239,228,0.85)', fontSize: '1.5rem', letterSpacing: '0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.5)' }}>{message}</p>
      </div>
    )
  }

  const photo = playlist[index % playlist.length]

  return (
    <div
      className="proj-a min-h-screen relative overflow-hidden select-none"
      style={{ background: 'var(--nuit-scene)' }}
      onClick={() => { setVisible(false); setTimeout(() => { setIndex((i) => (i + 1) % playlist.length); setVisible(true) }, 300) }}
    >
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: visible ? 1 : 0 }}>
        {/* Cadre composé, remonté à chaque diapo : relance le flou ambiant + le Ken Burns. */}
        <div key={photo.id} className="absolute inset-0">
          {/* Fond ambiant : la même photo, plein cadre, floutée et assombrie — fini les bandes noires. */}
          <Image
            src={photo.url}
            alt=""
            fill
            className="object-cover ambient"
            style={{ filter: 'blur(24px) brightness(0.42) saturate(1.15)' }}
            unoptimized
            aria-hidden="true"
          />
          {/* Photo nette, centrée, animée Ken Burns (sens alterné une diapo sur deux). */}
          <div className={`absolute inset-0 ${index % 2 === 0 ? 'kenburns-a' : 'kenburns-b'}`}>
            <Image src={photo.url} alt="" fill className="object-contain" unoptimized preload />
          </div>
        </div>
      </div>

      {/* Vignette cinéma + dégradé bas pour la lisibilité du bas-de-cadre. */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 48%, rgba(16,10,5,0.6) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '34%', background: 'linear-gradient(to top, rgba(16,10,5,0.82), transparent)' }} />
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '16%', background: 'linear-gradient(to bottom, rgba(16,10,5,0.5), transparent)' }} />

      {/* Signature persistante : le couple, en haut. Ne suit pas le fondu des photos. */}
      <div className="absolute flex items-center gap-3 pointer-events-none" style={{ left: 40, top: 30 }}>
        <Seal size={34} />
        <span className="font-display" style={{ color: 'rgba(244,239,228,0.72)', fontSize: '1.05rem', letterSpacing: '0.05em' }}>{COUPLE}</span>
      </div>
      <span className="absolute pointer-events-none" style={{ right: 40, top: 38, color: 'rgba(244,239,228,0.42)', fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
        {WEDDING.dateLabel}
      </span>

      {/* Bas-de-cadre éditorial : remonte à chaque changement de jour. */}
      <div key={currentDay} className="lower-rise absolute flex items-end gap-4 pointer-events-none" style={{ left: 40, bottom: 34 }}>
        <Seal size={48} />
        <div className="flex flex-col">
          <span className="rule-draw" style={{ width: 56, height: 1, background: 'var(--or)', marginBottom: 12 }} />
          <span className="font-display italic" style={{ color: 'var(--ivoire)', fontSize: '2.5rem', lineHeight: 1 }}>{DAY_LABELS[currentDay]}</span>
        </div>
      </div>

      {/* Jauge de progression de la diapo : remplace le compteur « 2 / 36 », plus de bruit de tableur.
          La durée (.slide-progress = 6s) est calée sur SLIDE_DURATION (6000 ms). */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 2, background: 'rgba(244,239,228,0.08)' }}>
        <div key={index} className="slide-progress h-full" style={{ background: 'var(--or)' }} />
      </div>
    </div>
  )
}
