'use client'

// Plan de table du dîner, refait à la charte « Variante A » (mêmes tokens que
// la galerie via .gal-a) à partir du plan Pages de Cyril. Disposition fidèle à
// la salle : table des mariés en haut, puis 3 rangées de tables rondes.
// Les pastilles autour des tables = un siège par convive ; les couleurs
// signalent les menus spéciaux (femme enceinte, végétarien, vegan).

import { useEffect } from 'react'
import { Seal } from '@/app/components/Seal'
import { COUPLE, WEDDING } from '@/lib/wedding'

type Menu = 'classique' | 'enceinte' | 'vege' | 'vegan'

const MENU_COLORS: Record<Menu, string> = {
  classique: '#D9B29A', // terra pâle, discret : le cas général
  enceinte: '#E0A63C', // ambre
  vege: '#8E6E9E', // prune
  vegan: '#7E9770', // sauge profonde
}

const MENU_LABELS: Record<Menu, string> = {
  classique: 'Menu classique',
  enceinte: 'Menu femme enceinte',
  vege: 'Menu végétarien',
  vegan: 'Menu vegan',
}

// n sièges, les menus spéciaux d'abord (placés en haut de la table).
const seats = (n: number, specials: Menu[] = []): Menu[] => [
  ...specials,
  ...Array<Menu>(n - specials.length).fill('classique'),
]

type Table = { name: string; seats: Menu[] }

// Rangées fidèles au plan de la salle.
const ROWS: Table[][] = [
  [
    { name: 'Clos de Vougeot', seats: seats(10) },
    { name: 'Pommard', seats: seats(10, ['enceinte']) },
    { name: 'Nuits-Saint-Georges', seats: seats(9) },
    { name: 'Saint-Aubin', seats: seats(10, ['vege', 'vege', 'vege', 'vegan']) },
  ],
  [
    { name: 'Montrachet', seats: seats(10) },
    { name: 'Musigny', seats: seats(7) },
    { name: 'Vosne-Romanée', seats: seats(10) },
  ],
  [
    { name: 'Meursault', seats: seats(10) },
    { name: 'Volnay', seats: seats(9) },
    { name: 'Aloxe-Corton', seats: seats(10, ['enceinte']) },
    { name: 'Mercurey', seats: seats(9) },
  ],
]

const HEAD_TABLE = { name: 'Romanée-Conti', count: 25 }
const TOTAL = HEAD_TABLE.count + ROWS.flat().reduce((n, t) => n + t.seats.length, 0)

function SeatDot({ menu, size }: { menu: Menu; size: number }) {
  return (
    <span
      title={MENU_LABELS[menu]}
      aria-label={MENU_LABELS[menu]}
      className="block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: MENU_COLORS[menu],
        boxShadow: menu === 'classique' ? 'none' : '0 0 0 2px rgba(74,58,48,0.18)',
      }}
    />
  )
}

// Table ronde : sièges répartis en cercle, premier siège à midi.
function RoundTable({ table }: { table: Table }) {
  const OUTER = 158
  const CIRCLE = 102
  const R = CIRCLE / 2 + 15
  const DOT = 12
  return (
    <div className="relative shrink-0" style={{ width: OUTER, height: OUTER }}>
      {table.seats.map((m, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / table.seats.length
        return (
          <span
            key={i}
            className="absolute"
            style={{
              left: OUTER / 2 + R * Math.cos(a) - DOT / 2,
              top: OUTER / 2 + R * Math.sin(a) - DOT / 2,
            }}
          >
            <SeatDot menu={m} size={DOT} />
          </span>
        )
      })}
      <div
        className="absolute flex flex-col items-center justify-center text-center rounded-full"
        style={{
          left: (OUTER - CIRCLE) / 2,
          top: (OUTER - CIRCLE) / 2,
          width: CIRCLE,
          height: CIRCLE,
          background: 'var(--ivoire-raise)',
          border: '1px solid var(--filet)',
          padding: '0 10px',
        }}
      >
        <span className="font-display" style={{ fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.15, color: 'var(--nuit)' }}>{table.name}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--ciel)', marginTop: 3, letterSpacing: '0.04em' }}>{table.seats.length} convives</span>
      </div>
    </div>
  )
}

export default function PlanDeTablePage() {
  // Reveal au scroll : observe tous les .reveal et bascule .is-visible une fois.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'))
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) } }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main className="gal-a" style={{ background: 'var(--ivoire)', color: 'var(--nuit)', fontFamily: 'var(--font-body), system-ui, sans-serif', minHeight: '100vh' }}>

      {/* TITRE */}
      <section className="text-center fade-in" style={{ padding: '54px 24px 10px' }}>
        <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: 'var(--or)', fontWeight: 600, margin: 0 }}>{COUPLE}</p>
        <h1 className="font-display" style={{ fontWeight: 500, fontSize: 'clamp(2.1rem, 6vw, 2.8rem)', lineHeight: 1.05, margin: '.3em 0 0' }}>Le plan de table</h1>
        <p className="font-display italic" style={{ fontSize: '1.05rem', color: 'var(--nuit-soft)', margin: '.7em auto 0' }}>
          {TOTAL} convives · 12 tables · les climats de Bourgogne
        </p>
        <p style={{ marginTop: 14 }}>
          <a href="/temoins" className="font-display italic" style={{ color: 'var(--or)', fontSize: '0.95rem' }}>← Retour au déroulé du jour J</a>
        </p>
      </section>

      {/* LÉGENDE */}
      <div className="flex flex-wrap items-center justify-center reveal" style={{ gap: '10px 22px', padding: '18px 24px 6px' }}>
        {(['enceinte', 'vege', 'vegan', 'classique'] as Menu[]).map((m) => (
          <span key={m} className="flex items-center" style={{ gap: 8, fontSize: '0.74rem', color: 'var(--nuit-soft)' }}>
            <SeatDot menu={m} size={12} />
            {MENU_LABELS[m]}
          </span>
        ))}
      </div>

      <div className="mx-auto" style={{ maxWidth: 860, padding: '30px 10px 72px' }}>

        {/* TABLE DES MARIÉS */}
        <div className="reveal mx-auto" style={{ maxWidth: 640, marginBottom: 40 }}>
          <div className="flex justify-around" style={{ padding: '0 26px', marginBottom: 7 }}>
            {Array.from({ length: 13 }).map((_, i) => <SeatDot key={i} menu="classique" size={13} />)}
          </div>
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ minHeight: 84, borderRadius: 8, background: 'var(--or)', padding: '14px 20px' }}
          >
            <span className="uppercase" style={{ fontSize: '0.56rem', letterSpacing: '0.3em', color: 'rgba(251,246,236,0.85)', fontWeight: 600 }}>Table des mariés</span>
            <span className="font-display" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#FBF6EC', lineHeight: 1.15, marginTop: 3 }}>{HEAD_TABLE.name}</span>
            <span style={{ fontSize: '0.66rem', color: 'rgba(251,246,236,0.85)', marginTop: 3, letterSpacing: '0.04em' }}>{HEAD_TABLE.count} convives</span>
          </div>
          <div className="flex justify-around" style={{ padding: '0 26px', marginTop: 7 }}>
            {Array.from({ length: 12 }).map((_, i) => <SeatDot key={i} menu="classique" size={13} />)}
          </div>
        </div>

        {/* TABLES RONDES, rangée par rangée comme dans la salle */}
        {ROWS.map((row, i) => (
          <div key={i} className="reveal flex flex-wrap justify-center" style={{ gap: '4px 14px', marginBottom: 10 }}>
            {row.map((t) => <RoundTable key={t.name} table={t} />)}
          </div>
        ))}

        <p className="text-center" style={{ color: 'var(--ciel)', fontSize: '0.72rem', lineHeight: 1.6, maxWidth: '30rem', margin: '28px auto 0' }}>
          La disposition reprend celle de la salle, vue depuis l&apos;entrée.
          Les pastilles colorées signalent les menus spéciaux pour le service.
        </p>
      </div>

      {/* PIED : monogramme, comme sur l'accueil. */}
      <footer className="text-center" style={{ background: '#DDE3D2', padding: '46px 30px' }}>
        <Seal size={56} />
        <p className="font-display italic" style={{ fontSize: '1.15rem', color: 'var(--nuit)', marginTop: 14 }}>{WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
