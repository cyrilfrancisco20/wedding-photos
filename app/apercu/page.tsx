'use client'

// Maquette « Variante A » — style éditorial doux (Rey/Laurie), photo plein
// cadre, rappels de couleur, transitions fluides au scroll. Route d'aperçu :
// ne touche ni la galerie, ni la projection, ni l'envoi. Les images
// /maquette/*.jpg sont des placeholders libres de droits (Lorem Picsum) à
// remplacer par les vraies photos (mêmes noms de fichiers).

import { useEffect, useRef, useState } from 'react'
import { DAY_ORDER, DAY_LABELS, type Day } from '@/lib/schedule'
import { WEDDING, COUPLE } from '@/lib/wedding'

const C = {
  ivory: '#F7F2E9',
  blush: '#ECD8CF',
  sage: '#DDE3D2',
  terra: '#C77B5E',
  ink: '#4A3A30',
  muted: '#9A8470',
}

function useReveal() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('.reveal:not(.is-visible), .mq-wipe:not(.is-visible)'))
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } }),
      { rootMargin: '0px 0px -10% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function ApercuPage() {
  const ref = useReveal()
  // Sélection par jour : on choisit Vendredi / Samedi / Dimanche, puis on prend
  // ou on joint une photo. Le jour pré-range la photo. (Maquette : l'envoi réel
  // sera câblé sur /api/upload à l'intégration dans la vraie page.)
  const [activeDay, setActiveDay] = useState<Day | null>(null)
  const [note, setNote] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const albRef = useRef<HTMLInputElement>(null)
  function onFiles(files: FileList | null) {
    if (!files || !files.length || !activeDay) return
    const n = files.length
    setNote(`${n} photo${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''} pour ${DAY_LABELS[activeDay]}`)
  }
  return (
    <main ref={ref} style={{ background: C.ivory, color: C.ink, fontFamily: 'var(--font-body), system-ui, sans-serif' }}>

      {/* HÉRO plein cadre */}
      <section className="relative overflow-hidden" style={{ height: '88vh', minHeight: 540 }}>
        <img src="/maquette/hero.png" alt="Morgane et Cyril" className="mq-zoom absolute inset-0 w-full h-full object-cover" />
        {/* La photo de faire-part porte déjà les prénoms et la date : pas de texte
            superposé, juste un voile bas léger + un repère de défilement. */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '26%', background: 'linear-gradient(to top, rgba(40,25,18,0.4), transparent)' }} />
        <div className="absolute inset-x-0 flex flex-col items-center fade-in" style={{ bottom: 22, color: '#FBF6EC' }}>
          <span className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em' }}>Découvrir</span>
          <span className="drift" style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: 4 }}>↓</span>
        </div>
      </section>

      {/* PARTAGEZ VOS PHOTOS — sélection par jour */}
      <section className="text-center" style={{ padding: '80px 28px' }}>
        <p className="reveal uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: C.terra, fontWeight: 600, margin: '0 0 18px' }}>Partagez vos photos</p>
        <p className="reveal font-display italic" style={{ fontSize: 'clamp(1.45rem, 3.2vw, 2.1rem)', lineHeight: 1.4, color: '#5d4736', maxWidth: '30ch', margin: '0 auto' }}>
          Vous avez vu des instants qu'on a manqués. Ajoutez vos photos, jour par jour, elles s'affichent sur le grand écran de la fête et rejoignent notre galerie.
        </p>

        {/* Trois jours : on choisit, puis on prend ou on joint une photo. */}
        <div className="grid gap-3.5 mx-auto" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 640, marginTop: 44 }}>
          {DAY_ORDER.map((d, i) => {
            const active = activeDay === d
            return (
              <button
                key={d}
                onClick={() => { setActiveDay(active ? null : d); setNote('') }}
                className="reveal relative overflow-hidden"
                style={{ aspectRatio: '3 / 4', borderRadius: 6, background: '#ece2d4', transitionDelay: `${i * 90}ms`, border: active ? `2px solid ${C.terra}` : '2px solid transparent', cursor: 'pointer' }}
                aria-pressed={active}
              >
                <img src={`/maquette/g${i + 1}.jpg`} alt="" className="mq-wipe absolute inset-0 w-full h-full object-cover" style={{ transitionDelay: `${i * 90}ms` }} />
                <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 42%, rgba(40,25,18,0.6))' }} />
                <span className="font-display absolute left-0 right-0" style={{ bottom: 14, color: '#FBF6EC', fontSize: '1.45rem' }}>{DAY_LABELS[d]}</span>
                <span className="flex items-center justify-center absolute" style={{ top: 9, right: 9, width: 24, height: 24, borderRadius: '50%', background: active ? C.terra : 'rgba(251,246,236,0.92)', color: active ? '#fff' : C.ink, fontSize: '0.95rem', lineHeight: 1 }}>{active ? '×' : '+'}</span>
              </button>
            )
          })}
        </div>

        {/* Panneau d'action du jour choisi */}
        {activeDay && (
          <div className="fade-in mx-auto text-left" style={{ maxWidth: 420, marginTop: 20, padding: 22, borderRadius: 14, background: '#fff', border: `1px solid ${C.blush}`, boxShadow: '0 14px 36px -18px rgba(120,80,50,0.4)' }}>
            <p className="uppercase text-center" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: C.terra, marginBottom: 16 }}>{DAY_LABELS[activeDay]} · vos photos</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => camRef.current?.click()} className="py-3.5 rounded-xl font-medium flex items-center justify-center gap-2.5" style={{ background: C.terra, color: '#fff' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></svg>
                Prendre une photo
              </button>
              <button onClick={() => albRef.current?.click()} className="py-3.5 rounded-xl font-medium flex items-center justify-center gap-2.5" style={{ border: `1px solid ${C.blush}`, color: C.ink }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-4.5-4.5L5 22" /></svg>
                Joindre une photo
              </button>
            </div>
            {note && <p className="text-center" style={{ marginTop: 14, color: C.terra, fontSize: '0.88rem' }}>{note}</p>}
            <p className="text-center" style={{ marginTop: 10, color: C.muted, fontSize: '0.7rem' }}>Rangée automatiquement dans « {DAY_LABELS[activeDay]} ».</p>
          </div>
        )}

        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <input ref={albRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </section>

      {/* RAPPEL DE COULEUR : bande douce (blush) tirée des tons photo */}
      <section className="text-center" style={{ background: C.blush, padding: '78px 28px' }}>
        <p className="reveal font-display italic" style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)', lineHeight: 1.34, color: '#5a4030', maxWidth: '22ch', margin: '0 auto' }}>
          « Le plus beau jour se vit à plusieurs regards. »
        </p>
        <p className="reveal uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.34em', color: '#9a6a52', marginTop: 24 }}>{COUPLE} · {WEDDING.dateLabel}</p>
      </section>

      {/* GALERIE mosaïque */}
      <section style={{ padding: '74px 28px 0' }}>
        <p className="reveal uppercase text-center" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: C.terra, fontWeight: 600, margin: '0 0 12px' }}>La galerie</p>
        <h2 className="reveal font-display text-center" style={{ fontWeight: 500, fontSize: 'clamp(1.9rem, 4.2vw, 2.7rem)', margin: '0 0 28px', color: C.ink }}>Tout le mariage, photo après photo</h2>
        <div className="grid mx-auto" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '120px', gap: 12, maxWidth: 760 }}>
          {[
            { g: 'g4', col: 'span 4', row: 'span 2' },
            { g: 'g1', col: 'span 2', row: 'span 1' },
            { g: 'g2', col: 'span 2', row: 'span 1' },
            { g: 'g5', col: 'span 3', row: 'span 1' },
            { g: 'g3', col: 'span 3', row: 'span 1' },
          ].map(({ g, col, row }, i) => (
            <div key={i} className="relative overflow-hidden" style={{ gridColumn: col, gridRow: row, borderRadius: 6, background: '#ece2d4' }}>
              <img src={`/maquette/${g}.jpg`} alt="" className="mq-wipe absolute inset-0 w-full h-full object-cover" style={{ transitionDelay: `${(i % 3) * 80}ms` }} />
            </div>
          ))}
        </div>
      </section>

      {/* BANNIÈRE DE FIN : photo plein cadre + ligne de clôture */}
      <section className="relative overflow-hidden" style={{ height: '60vh', minHeight: 380, marginTop: 74 }}>
        <img src="/maquette/banner.jpg" alt="" className="mq-wipe absolute inset-0 w-full h-full object-cover" />
        {/* Voile renforcé au centre : garantit la lisibilité du texte blanc même
            sur une photo claire (gros plan agrumes). */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(78% 66% at 50% 52%, rgba(28,15,9,0.56), rgba(28,15,9,0.3) 72%, rgba(28,15,9,0.36))' }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ color: '#FBF6EC' }}>
          <p className="reveal font-display italic" style={{ fontSize: 'clamp(1.8rem, 4.4vw, 2.8rem)', lineHeight: 1.2, margin: 0, maxWidth: '20ch' }}>
            Merci d'être là pour écrire cette journée avec nous.
          </p>
        </div>
      </section>

      {/* PIED */}
      <footer className="text-center" style={{ background: C.sage, padding: '64px 30px' }}>
        <span className="font-display inline-flex items-center justify-center rounded-full" style={{ width: 60, height: 60, border: `1px solid rgba(74,58,48,0.4)`, fontSize: '1.45rem', color: C.ink }}>
          {WEDDING.initials[0]}<i className="font-display italic" style={{ fontSize: '0.7em', margin: '0 1px' }}>&amp;</i>{WEDDING.initials[1]}
        </span>
        <p className="font-display italic" style={{ fontSize: '1.25rem', color: C.ink, marginTop: 18 }}>À très vite · {WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
