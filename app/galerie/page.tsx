'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { MOMENTS, DAY_ORDER, DAY_LABELS, UNSORTED, ALL_BUCKET_LABELS, type Day, type Bucket } from '@/lib/schedule'
import { WEDDING, COUPLE } from '@/lib/wedding'
import { demoPhotos } from '@/lib/demoPhotos'

type Photo = { id: string; url: string; moment: Bucket | null; taken_at: string | null; created_at: string }
type Tab = Day | typeof UNSORTED
type Lightbox = { list: Photo[]; i: number }

function chrono(a: Photo, b: Photo) {
  return (a.taken_at ?? a.created_at).localeCompare(b.taken_at ?? b.created_at)
}

// Reveal au scroll : observe tous les .reveal et bascule .is-visible une fois.
function useReveal(dep: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'))
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } }),
      { rootMargin: '0px 0px -10% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}

export default function GaleriePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tab, setTab] = useState<Tab>('samedi')
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) {
      setPhotos(demoPhotos())
      return
    }
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

  const chapters =
    tab === UNSORTED
      ? [{ id: UNSORTED, label: ALL_BUCKET_LABELS[UNSORTED], photos: byMoment.get(UNSORTED) ?? [] }]
      : MOMENTS.filter((m) => m.day === tab && (byMoment.get(m.id)?.length ?? 0) > 0).map((m) => ({
          id: m.id,
          label: m.label,
          photos: byMoment.get(m.id) ?? [],
        }))

  const tabs: Tab[] = [...DAY_ORDER, ...(unsortedCount > 0 ? [UNSORTED] : [])]

  // À la une : les plus récentes, tous moments confondus.
  const featured = useMemo(
    () => [...photos].sort((a, b) => chrono(b, a)).slice(0, 10),
    [photos],
  )

  // Suite à plat des photos de l'onglet (le lightbox swipe à travers les chapitres).
  const tabFlow = useMemo(() => chapters.flatMap((c) => c.photos), [chapters])

  useReveal(`${tab}:${photos.length}`)

  // Clavier dans le lightbox.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((lb) => (lb ? { ...lb, i: (lb.i + 1) % lb.list.length } : lb))
      if (e.key === 'ArrowLeft') setLightbox((lb) => (lb ? { ...lb, i: (lb.i - 1 + lb.list.length) % lb.list.length } : lb))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const move = (d: number) => setLightbox((lb) => (lb ? { ...lb, i: (lb.i + d + lb.list.length) % lb.list.length } : lb))

  function scrollCarousel(dir: number) {
    const el = carouselRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <main style={{ background: 'var(--ivoire)' }}>

      {/* Cover : faire-part plein écran, entrée orchestrée au chargement */}
      <section className="relative flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '88vh' }}>
        <div className="thread absolute" style={{ top: '12%', width: 1, height: 90, background: 'var(--or)', opacity: 0.55 }} aria-hidden="true" />
        <div
          className="cover-rise mb-7 flex items-center justify-center rounded-full"
          style={{ width: 104, height: 104, border: '1px solid var(--or)', animationDelay: '0.15s' }}
        >
          <span className="font-display flex items-baseline" style={{ color: 'var(--or-deep)', fontSize: '2.5rem', letterSpacing: '0.02em' }}>
            {WEDDING.initials[0]}
            <span className="font-display italic" style={{ fontSize: '1.5rem', margin: '0 3px', color: 'var(--or)' }}>&amp;</span>
            {WEDDING.initials[1]}
          </span>
        </div>
        <h1 className="cover-rise font-display" style={{ color: 'var(--nuit)', fontWeight: 500, lineHeight: 1.05, fontSize: 'clamp(2.6rem, 9vw, 4.5rem)', animationDelay: '0.3s' }}>
          {WEDDING.name1}
          <span className="font-display italic" style={{ color: 'var(--or)', fontWeight: 400 }}> &amp; </span>
          {WEDDING.name2}
        </h1>
        <p className="cover-rise mt-4 uppercase" style={{ color: 'var(--ciel)', fontSize: 'clamp(0.7rem, 2vw, 0.82rem)', letterSpacing: '0.32em', animationDelay: '0.45s' }}>
          {WEDDING.dateLabel}
        </p>
        <p className="cover-rise font-display italic mt-5" style={{ color: 'var(--nuit-soft)', fontSize: 'clamp(1.05rem, 3vw, 1.35rem)', animationDelay: '0.58s' }}>
          Le fil de la journée, photo après photo.
        </p>
        <div className="cover-rise absolute flex flex-col items-center gap-2" style={{ bottom: 28, color: 'var(--ciel)', animationDelay: '0.85s' }}>
          <span className="uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.3em' }}>Découvrir</span>
          <span className="drift" style={{ fontSize: '1.1rem', lineHeight: 1 }}>↓</span>
        </div>
      </section>

      {/* À la une : carrousel swipeable */}
      {featured.length > 0 && (
        <section className="reveal px-5 pt-4 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-display italic" style={{ color: 'var(--nuit)', fontSize: '1.5rem' }}>À la une</h2>
              <div className="hidden sm:flex gap-2">
                {[-1, 1].map((d) => (
                  <button
                    key={d}
                    onClick={() => scrollCarousel(d)}
                    className="flex items-center justify-center rounded-full transition-colors"
                    style={{ width: 38, height: 38, border: '1px solid var(--filet)', color: 'var(--nuit-soft)' }}
                    aria-label={d < 0 ? 'Précédent' : 'Suivant'}
                  >
                    {d < 0 ? '‹' : '›'}
                  </button>
                ))}
              </div>
            </div>
            <div
              ref={carouselRef}
              className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
              style={{ scrollPadding: '0 1.25rem' }}
            >
              {featured.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox({ list: featured, i: idx })}
                  className="relative shrink-0 snap-center overflow-hidden"
                  style={{
                    width: 'min(78vw, 360px)',
                    aspectRatio: '4 / 5',
                    borderRadius: 6,
                    border: '1px solid var(--filet)',
                    background: 'var(--ivoire-raise)',
                  }}
                >
                  <Image src={p.url} alt="" fill className="object-cover" unoptimized preload={idx < 2} />
                  {p.moment && (
                    <span
                      className="glass font-display italic absolute"
                      style={{ left: 12, bottom: 12, padding: '4px 12px', borderRadius: 20, color: 'var(--nuit)', fontSize: '0.95rem' }}
                    >
                      {ALL_BUCKET_LABELS[p.moment]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Onglets jour : sticky + givré */}
      <nav className="glass sticky top-0 z-30 flex items-center justify-center gap-6 py-4 border-b" style={{ borderColor: 'var(--filet)' }}>
        {tabs.map((t) => {
          const active = tab === t
          const label = t === UNSORTED ? 'À classer' : DAY_LABELS[t as Day]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="font-display pb-1 transition-colors"
              style={{
                fontSize: '1.15rem',
                color: active ? 'var(--nuit)' : 'var(--ciel)',
                borderBottom: active ? '1px solid var(--or)' : '1px solid transparent',
              }}
            >
              {label}
              {t === UNSORTED && <span style={{ color: 'var(--or-deep)', fontSize: '0.7rem' }}> · {unsortedCount}</span>}
            </button>
          )
        })}
      </nav>

      <div className="px-5 pt-12 pb-24">
        <div className="max-w-5xl mx-auto">
          {chapters.length === 0 && (
            <div className="text-center py-20">
              <div className="mx-auto mb-5" style={{ width: 1, height: 44, background: 'var(--or)' }} />
              <p className="font-display italic" style={{ color: 'var(--nuit-soft)', fontSize: '1.4rem' }}>Le fil est encore vide.</p>
              <p className="mt-2" style={{ color: 'var(--ciel)', fontSize: '0.9rem' }}>Les premières photos apparaîtront ici.</p>
            </div>
          )}

          {chapters.length > 0 && (
            <div className="relative">
              <div className="thread absolute" style={{ left: 8, top: 6, bottom: 6, width: 1, background: 'var(--or)' }} />

              {chapters.map((ch) => {
                const base = tabFlow.findIndex((p) => p.id === ch.photos[0]?.id)
                return (
                  <section key={ch.id} className="reveal relative pl-10 pb-16 last:pb-2">
                    <span className="absolute flex items-center justify-center" style={{ left: 8, top: 4, width: 18, height: 18, transform: 'translateX(-50%)' }} aria-hidden="true">
                      <span className="absolute rounded-full" style={{ width: 18, height: 18, background: 'var(--ivoire)' }} />
                      <span className="absolute" style={{ width: 8, height: 8, background: 'var(--or)', transform: 'rotate(45deg)' }} />
                    </span>

                    <div className="mb-5 flex items-baseline gap-3">
                      <h2 className="font-display italic" style={{ color: 'var(--nuit)', fontSize: 'clamp(1.65rem, 4vw, 2.1rem)', lineHeight: 1 }}>{ch.label}</h2>
                      <span style={{ color: 'var(--or-deep)', fontSize: '0.72rem', letterSpacing: '0.18em' }}>{ch.photos.length}</span>
                    </div>

                    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                      {ch.photos.map((p, k) => (
                        <button
                          key={p.id}
                          onClick={() => setLightbox({ list: tabFlow, i: base + k })}
                          className="tile group relative aspect-square overflow-hidden"
                          style={{ borderRadius: 3, border: '1px solid var(--filet)', background: 'var(--ivoire-raise)', transitionDelay: `${Math.min(k, 10) * 45}ms` }}
                        >
                          <Image src={p.url} alt="" fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" unoptimized />
                          <span className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100" style={{ background: 'linear-gradient(to top, rgba(16,21,31,0.28), transparent 55%)' }} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox swipeable */}
      {lightbox && (
        <Viewer lightbox={lightbox} onClose={() => setLightbox(null)} onMove={move} />
      )}
    </main>
  )
}

function Viewer({ lightbox, onClose, onMove }: { lightbox: Lightbox; onClose: () => void; onMove: (d: number) => void }) {
  const startX = useRef<number | null>(null)
  const photo = lightbox.list[lightbox.i]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(16,21,31,0.96)' }}
      onClick={onClose}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (startX.current === null) return
        const dx = e.changedTouches[0].clientX - startX.current
        if (Math.abs(dx) > 45) onMove(dx < 0 ? 1 : -1)
        startX.current = null
      }}
    >
      <div className="relative w-full h-full max-w-5xl px-4 py-16" onClick={(e) => e.stopPropagation()}>
        <Image src={photo.url} alt="" fill className="object-contain" unoptimized preload />
      </div>

      {lightbox.list.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onMove(-1) }} className="font-display absolute left-3 sm:left-6 flex items-center justify-center rounded-full" style={{ width: 46, height: 46, border: '1px solid rgba(184,146,74,0.5)', color: 'var(--or)', fontSize: '1.6rem' }} aria-label="Précédent">‹</button>
          <button onClick={(e) => { e.stopPropagation(); onMove(1) }} className="font-display absolute right-3 sm:right-6 flex items-center justify-center rounded-full" style={{ width: 46, height: 46, border: '1px solid rgba(184,146,74,0.5)', color: 'var(--or)', fontSize: '1.6rem' }} aria-label="Suivant">›</button>
        </>
      )}

      <div className="absolute left-0 right-0 text-center" style={{ bottom: 26 }}>
        {photo.moment && <p className="font-display italic" style={{ color: 'var(--or)', fontSize: '1.2rem' }}>{ALL_BUCKET_LABELS[photo.moment]}</p>}
        {lightbox.list.length > 1 && <p className="mt-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.15em' }}>{lightbox.i + 1} / {lightbox.list.length}</p>}
      </div>

      <button onClick={onClose} className="font-display absolute top-5 right-5 flex items-center justify-center rounded-full" style={{ width: 42, height: 42, border: '1px solid rgba(184,146,74,0.5)', color: 'var(--or)', fontSize: '1.5rem' }} aria-label="Fermer">×</button>
    </div>
  )
}
