'use client'

// Plan de table du dîner, refait à la charte « Variante A » (mêmes tokens que
// la galerie via .gal-a) à partir du plan Pages de Cyril. Disposition fidèle à
// la salle : table des mariés pivotée à la verticale et calée à droite (avec
// dégagement de circulation), puis 3 rangées de tables rondes à gauche.
// Les pastilles autour des tables = un siège par convive ; les couleurs
// signalent les menus spéciaux (femme enceinte, végétarien, vegan).

import { useEffect, useState } from 'react'
import { Seal } from '@/app/components/Seal'
import { COUPLE, WEDDING } from '@/lib/wedding'
import { HEAD_TABLE_NAME, HEAD_TOP, HEAD_END, HEAD_BOTTOM, headPlace } from '@/lib/plan'

type Menu = 'classique' | 'enceinte' | 'vege' | 'vegan'

const MENU_COLORS: Record<Menu, string> = {
  classique: '#D9B29A', // terra pâle, discret : le cas général
  enceinte: '#6E8AA3', // bleu ardoise, distinct des tons terra/or du reste de la charte
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

type Table = { name: string; seats: Menu[]; x: number; y: number }

// Largeur de référence pour convertir les % historiques des tables rondes en
// pixels fixes : garantit qu'elles ne bougent jamais, même si le canevas
// s'élargit à droite pour loger la table des mariés (aménagement réel,
// diffusé aux prestataires — on ne réagence jamais ces tables-là).
const ROOM_REF_WIDTH = 860

// Positions FIDÈLES au plan validé (aménagement réel, diffusé aux prestataires) :
// x = centre en % de la largeur de la salle, y = centre en px sur le canevas.
// Rangées 1 et 3 alignées en colonnes, rangée du milieu décalée d'une demi-table.
const TABLES: Table[] = [
  { name: 'Clos de Vougeot', x: 83.8, y: 790, seats: seats(10) },
  { name: 'Pommard', x: 73.4, y: 585, seats: seats(10, ['enceinte']) },
  { name: 'Nuits-Saint-Georges', x: 61.8, y: 380, seats: seats(9) },
  { name: 'Saint-Aubin', x: 85, y: 380, seats: seats(10, ['vege', 'vege', 'vege', 'vegan']) },
  { name: 'Montrachet', x: 24.9, y: 585, seats: seats(10) },
  { name: 'Musigny', x: 50.3, y: 585, seats: seats(7) },
  { name: 'Vosne-Romanée', x: 36.4, y: 380, seats: seats(10) },
  { name: 'Meursault', x: 11.6, y: 790, seats: seats(10) },
  { name: 'Volnay', x: 35.8, y: 790, seats: seats(9) },
  { name: 'Aloxe-Corton', x: 61.3, y: 790, seats: seats(10, ['enceinte']) },
  { name: 'Mercurey', x: 12.7, y: 380, seats: seats(9) },
]

// Placement nominatif : source unique dans lib/plan.ts (partagée avec /temoins).
const HEAD_TABLE = { name: HEAD_TABLE_NAME, count: HEAD_TOP.length + HEAD_BOTTOM.length + 1 }
const TOTAL = HEAD_TABLE.count + TABLES.reduce((n, t) => n + t.seats.length, 0)

function SeatDot({ menu, size, ring }: { menu: Menu; size: number; ring?: boolean }) {
  return (
    <span
      title={MENU_LABELS[menu]}
      aria-label={MENU_LABELS[menu]}
      className="block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: ring ? 'var(--or-deep)' : MENU_COLORS[menu],
        boxShadow: ring
          ? '0 0 0 3px rgba(168,95,68,0.35)'
          : menu === 'classique' ? 'none' : '0 0 0 2px rgba(74,58,48,0.18)',
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
  // ?invite=<prénom> (lien depuis /temoins) : met la chaise du convive en
  // évidence sur la table des mariés. Lu côté client (page statique).
  const [invite, setInvite] = useState<string | null>(null)
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('invite')
    if (n && headPlace(n)) {
      setInvite(n)
      // Amène la chaise au centre de l'écran (utile surtout en mobile, où la
      // salle défile horizontalement).
      setTimeout(() => {
        document.querySelector('[data-invite-seat]')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' })
      }, 350)
    } else {
      // Visite directe (sans ?invite=) : sur mobile, la salle défile
      // horizontalement et démarre calée à gauche — la table des mariés,
      // décalée à 21,8 % du canevas, apparaît alors coupée à droite de
      // l'écran. On centre le cadre sur la table des mariés au chargement.
      setTimeout(() => {
        document.querySelector('[data-head-table]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
      }, 50)
    }
  }, [])

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
          {TOTAL} convives · 12 tables · les crus de Bourgogne
        </p>
        {invite && (
          <p className="fade-in" style={{ marginTop: 14, fontSize: '0.82rem', color: 'var(--nuit-soft)' }}>
            La place de <strong style={{ color: 'var(--or-deep)' }}>{invite}</strong> est marquée sur la table des mariés.
          </p>
        )}
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

      <div className="mx-auto" style={{ maxWidth: 1090, padding: '14px 10px 60px' }}>

        {/* LA SALLE : canevas à positions fixes, la géométrie ne se recompose
            jamais (c'est l'aménagement réel, les x/y ci-dessous restent
            ceux du plan validé). Depuis la rotation de la table des mariés
            à droite, les tables ne commencent qu'à y≈301 sur un canevas de
            878 : ça laissait un grand vide en haut. Fix : un cadre plus
            court (607) qui rogne ce vide, la salle elle-même est juste
            remontée dedans (marginTop négatif) — aucune coordonnée de
            table n'est modifiée. Sur petit écran, défilement horizontal
            plutôt que réempilement des tables. */}
        <div className="overflow-x-auto no-scrollbar" style={{ height: 607, overflowY: 'hidden' }}>
          <div className="reveal relative mx-auto" style={{ minWidth: 1050, maxWidth: 1050, height: 878, marginTop: -271 }}>

            {/* TABLE DES MARIÉS : pivotée à 90° (sens horaire) et calée à
                droite de la salle, avec un dégagement de circulation par
                rapport aux tables rondes — aménagement réel, confirmé par
                Cyril. Rotation d'un seul bloc rigide (table + convives) :
                l'ancien bord du haut (Guillaume→Anthony) devient le bord
                DROIT, l'ancien bord du bas (Nathan→Diane) devient le bord
                GAUCHE, Laetitia (bout de table) atterrit en BAS. Dimensions
                (537×147) ; centrée verticalement sur les 3 rangées de tables
                rondes (y=585, la rangée du milieu), pas sur tout le canevas.
                transform-origin par défaut (centre) donc la rotation ne
                change rien à ces calculs. */}
            <div data-head-table className="absolute" style={{ left: 675, top: 511.5, width: 537, height: 147, transform: 'rotate(90deg)' }}>
              <div className="relative" style={{ height: 16, margin: '0 24px' }}>
                {HEAD_TOP.map((n, i) => (
                  <span key={n} className="absolute" style={{ left: `${((i + 0.5) / 12) * 100}%`, top: 2 }} {...(invite === n ? { 'data-invite-seat': true } : {})}>
                    <span className="absolute" style={{ transform: 'translateX(-50%)' }}><SeatDot menu="classique" size={12} ring={invite === n} /></span>
                    <span className="font-display absolute" style={{ left: 2, bottom: 12, transform: 'rotate(-52deg)', transformOrigin: 'left bottom', whiteSpace: 'nowrap', fontSize: invite === n ? '0.82rem' : '0.74rem', fontWeight: invite === n ? 700 : 400, color: invite === n ? 'var(--or-deep)' : 'var(--nuit-soft)' }}>{n}</span>
                  </span>
                ))}
              </div>
              <span className="absolute" style={{ right: -19, top: '50%', transform: 'translateY(-50%)' }} {...(invite === HEAD_END ? { 'data-invite-seat': true } : {})}>
                <SeatDot menu="classique" size={12} ring={invite === HEAD_END} />
                <span className="font-display absolute" style={{ left: 18, top: '50%', transform: 'translateY(-50%) rotate(-52deg)', transformOrigin: 'left center', whiteSpace: 'nowrap', fontSize: invite === HEAD_END ? '0.82rem' : '0.74rem', fontWeight: invite === HEAD_END ? 700 : 400, color: invite === HEAD_END ? 'var(--or-deep)' : 'var(--nuit-soft)' }}>{HEAD_END}</span>
              </span>
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: 101, borderRadius: 8, background: 'var(--or)', padding: '14px 20px', marginTop: 7 }}
              >
                <span className="uppercase" style={{ fontSize: '0.56rem', letterSpacing: '0.3em', color: 'rgba(251,246,236,0.85)', fontWeight: 600 }}>Table des mariés</span>
                <span className="font-display" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#FBF6EC', lineHeight: 1.15, marginTop: 3 }}>{HEAD_TABLE.name}</span>
                <span style={{ fontSize: '0.66rem', color: 'rgba(251,246,236,0.85)', marginTop: 3, letterSpacing: '0.04em' }}>{HEAD_TABLE.count} convives</span>
              </div>
              <div className="relative" style={{ height: 16, margin: '7px 24px 0' }}>
                {HEAD_BOTTOM.map((n, i) => (
                  <span key={n} className="absolute" style={{ left: `${((i + 0.5) / 12) * 100}%`, top: 2 }} {...(invite === n ? { 'data-invite-seat': true } : {})}>
                    <span className="absolute" style={{ transform: 'translateX(-50%)' }}><SeatDot menu="classique" size={12} ring={invite === n} /></span>
                    <span className="font-display absolute" style={{ right: 2, top: 12, transform: 'rotate(-52deg)', transformOrigin: 'right top', whiteSpace: 'nowrap', fontSize: invite === n ? '0.82rem' : '0.74rem', fontWeight: invite === n ? 700 : 400, color: invite === n ? 'var(--or-deep)' : 'var(--nuit-soft)' }}>{n}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* TABLES RONDES */}
            {TABLES.map((t) => (
              <div key={t.name} className="absolute" style={{ left: (t.x / 100) * ROOM_REF_WIDTH, top: t.y, transform: 'translate(-50%, -50%)' }}>
                <RoundTable table={t} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PIED : monogramme, comme sur l'accueil. */}
      <footer className="flex flex-col items-center text-center" style={{ background: '#DDE3D2', padding: '46px 30px' }}>
        <Seal size={56} />
        <p className="font-display italic" style={{ fontSize: '1.15rem', color: 'var(--nuit)', marginTop: 14 }}>{WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
