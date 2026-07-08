'use client'

// Plan de table du dîner, refait à la charte « Variante A ». Aménagement
// réel de la salle (8 x 25 m, Clos des Tourelles), diffusé aux prestataires :
// passage cuisines/WC (3 m, aucun mobilier) en haut, table des mariés posée
// dans la longueur contre le mur de droite (recul 1 m), 13 tables rondes
// (2 x Ø180/10p, 11 x Ø150/6-8p) en colonne serpentée avec reculs muraux
// (80 cm minimum), positions calées au calcul (cf. session du 07/07/2026).
// Un seul facteur d'échelle (SCALE) pour tout le canevas : les tables sont
// dessinées à leur taille réelle, pas une taille schématique arbitraire.

import { useEffect, useState } from 'react'
import { Seal } from '@/app/components/Seal'
import { COUPLE, WEDDING } from '@/lib/wedding'
import { HEAD_TABLE_NAME, HEAD_TOP, HEAD_END, HEAD_BOTTOM, ROUND_TABLES, SPECIAL_MENUS, headPlace } from '@/lib/plan'

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

// 1 px = 1/SCALE cm : les tables rondes sont dessinées à leur diamètre réel
// (150 ou 180 cm), pas une taille schématique. Seules les rangées 4 et 10
// (Ø180) sont visuellement plus grandes — fidèle à la réalité.
const SCALE = 0.933
const ROOM_LEFT = 80
const ROOM_TOP = 20
const ROOM_WIDTH_CM = 800
const ROOM_LENGTH_CM = 3100
const PASSAGE_CM = 300
const DANCE_FLOOR_CM = 600

type Table = { name: string; diameter: 150 | 180; guests: string[]; x: number; y: number }

// Positions (centre, en px sur le canevas) des 13 tables rondes — calées sur
// le plan validé le 07/07/2026 : colonne serpentée, reculs muraux ≥ 80 cm
// respectés, aucune collision avec la table des mariés (cf. session).
const ROUND_POSITIONS: Record<string, { x: number; y: number }> = {
  'Volnay': { x: ROOM_LEFT + 373, y: ROOM_TOP + 407 },
  'Aloxe-Corton': { x: ROOM_LEFT + 163, y: ROOM_TOP + 605 },
  'Gevrey-Chambertin': { x: ROOM_LEFT + 583, y: ROOM_TOP + 605 },
  'Saint-Aubin': { x: ROOM_LEFT + 373, y: ROOM_TOP + 818 },
  'Vosne-Romanée': { x: ROOM_LEFT + 163, y: ROOM_TOP + 990 },
  'Clos de Vougeot': { x: ROOM_LEFT + 373, y: ROOM_TOP + 1149 },
  'Nuits-Saint-Georges': { x: ROOM_LEFT + 163, y: ROOM_TOP + 1308 },
  'Musigny': { x: ROOM_LEFT + 373, y: ROOM_TOP + 1466 },
  'Santenay': { x: ROOM_LEFT + 163, y: ROOM_TOP + 1625 },
  'Pommard': { x: ROOM_LEFT + 373, y: ROOM_TOP + 1797 },
  'Mercurey': { x: ROOM_LEFT + 163, y: ROOM_TOP + 2010 },
  'Montrachet': { x: ROOM_LEFT + 583, y: ROOM_TOP + 2010 },
  'Meursault': { x: ROOM_LEFT + 373, y: ROOM_TOP + 2208 },
}

const TABLES: Table[] = ROUND_TABLES.map((t) => ({ ...t, ...ROUND_POSITIONS[t.name] }))

// Table des mariés : 7,5 x 0,9 m, mur de droite, recul 1 m (donné par Cyril),
// centrée sur la portion de colonne où elle ne croise aucune table ronde.
const HEAD_W = Math.round(90 * SCALE)
const HEAD_H = Math.round(750 * SCALE)
const HEAD_LEFT = ROOM_LEFT + Math.round((ROOM_WIDTH_CM - 100 - 90) * SCALE)
const HEAD_TOP_PX = ROOM_TOP + 958

// Deux tables de service (~160 x 80 cm) le long du mur droit, dans la zone
// piste de danse : fontaine de champagne + desserts. Bord droit au mur,
// posées dans la longueur (160 cm à la verticale), empilées et centrées
// dans la hauteur de la piste. Profondeur 80 cm supposée (buffet standard).
const SERVICE_W = Math.round(80 * SCALE)
const SERVICE_H = Math.round(160 * SCALE)
const SERVICE_LEFT = ROOM_LEFT + Math.round(ROOM_WIDTH_CM * SCALE) - SERVICE_W
const DANCE_TOP_PX = ROOM_TOP + Math.round((ROOM_LENGTH_CM - DANCE_FLOOR_CM) * SCALE)
const SERVICE_GAP = 44
const SERVICE_BLOCK = SERVICE_H * 2 + SERVICE_GAP
const SERVICE_TOP = DANCE_TOP_PX + Math.round((Math.round(DANCE_FLOOR_CM * SCALE) - SERVICE_BLOCK) / 2)
const SERVICE_TABLES = [
  { label: 'Fontaine de champagne', top: SERVICE_TOP },
  { label: 'Desserts', top: SERVICE_TOP + SERVICE_H + SERVICE_GAP },
]

// Zone DJ (2,50 x 2,50 m) dans l'angle bas gauche de la piste de danse,
// contre le mur gauche et le fond de salle.
const DJ_SIZE = Math.round(250 * SCALE)
const DJ_LEFT = ROOM_LEFT
const DJ_TOP = DANCE_TOP_PX + Math.round(DANCE_FLOOR_CM * SCALE) - DJ_SIZE

// Haut de salle, au milieu : zone photobooth + accessoires (2 x 1 m) et un
// tonneau (~70 cm) pour le livre d'or et l'urne. Centrés dans la largeur,
// dans la bande haute. NB : recoupe le passage cuisines/WC marqué sans
// mobilier — à confirmer.
const PB_W = Math.round(200 * SCALE)
const PB_H = Math.round(100 * SCALE)
const BARREL_D = Math.round(70 * SCALE)
const TOP_GROUP_GAP = 22
const TOP_GROUP_W = PB_W + TOP_GROUP_GAP + BARREL_D
const TOP_GROUP_LEFT = ROOM_LEFT + Math.round((ROOM_WIDTH_CM * SCALE - TOP_GROUP_W) / 2)
const PB_LEFT = TOP_GROUP_LEFT
const PB_TOP = ROOM_TOP
const BARREL_LEFT = TOP_GROUP_LEFT + PB_W + TOP_GROUP_GAP
const BARREL_TOP = ROOM_TOP

const HEAD_TABLE = { name: HEAD_TABLE_NAME, count: HEAD_TOP.length + HEAD_BOTTOM.length + 1 }
const TOTAL = HEAD_TABLE.count + TABLES.reduce((n, t) => n + t.guests.length, 0)

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = ROOM_TOP + Math.round(ROOM_LENGTH_CM * SCALE) + 40

function SeatDot({ menu, size, ring, label }: { menu: Menu; size: number; ring?: boolean; label?: string }) {
  const title = label ? (menu === 'classique' ? label : `${label} — ${MENU_LABELS[menu]}`) : MENU_LABELS[menu]
  return (
    <span
      title={title}
      aria-label={title}
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

// Table ronde : une pastille par convive en cercle (couleur = menu), prénom
// écrit à côté — même logique que la table des mariés. Le prénom part à
// gauche ou à droite selon le côté du cercle où tombe le siège.
function RoundTable({ table }: { table: Table }) {
  const OUTER = Math.round(table.diameter * SCALE)
  const CIRCLE = Math.round(OUTER * 0.64)
  const R = CIRCLE / 2 + 15
  const DOT = 11
  return (
    <div className="relative shrink-0" style={{ width: OUTER, height: OUTER }}>
      {table.guests.map((name, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / table.guests.length
        const menu = SPECIAL_MENUS[name] ?? 'classique'
        const title = menu === 'classique' ? name : `${name} — ${MENU_LABELS[menu]}`
        const onRight = Math.cos(a) >= 0
        return (
          <span
            key={name}
            className="absolute"
            style={{
              left: OUTER / 2 + R * Math.cos(a) - DOT / 2,
              top: OUTER / 2 + R * Math.sin(a) - DOT / 2,
            }}
          >
            <SeatDot menu={menu} size={DOT} />
            <span
              className="absolute font-display"
              title={title}
              style={{
                top: DOT / 2,
                [onRight ? 'left' : 'right']: DOT + 3,
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
                fontSize: '0.58rem',
                fontWeight: menu === 'classique' ? 400 : 700,
                color: menu === 'classique' ? 'var(--nuit-soft)' : MENU_COLORS[menu],
              }}
            >
              {name}
            </span>
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
        <span style={{ fontSize: '0.62rem', color: 'var(--ciel)', marginTop: 3, letterSpacing: '0.04em' }}>{table.guests.length} convives</span>
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
      setTimeout(() => {
        document.querySelector('[data-invite-seat]')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' })
      }, 350)
    } else {
      // Salle plus large que l'écran sur mobile : centre sur la table des
      // mariés au chargement (défilement horizontal, jamais vertical forcé).
      setTimeout(() => {
        document.querySelector('[data-head-table]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
      }, 50)
    }
  }, [])

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
          {TOTAL} convives · 14 tables · les crus de Bourgogne
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

        {/* LA SALLE : canevas à l'échelle réelle (SCALE px/cm), 8 x 25 m.
            Défilement horizontal seulement sur petit écran (la salle est
            étroite et longue) — la hauteur défile normalement avec la page. */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="reveal relative mx-auto" style={{ minWidth: CANVAS_WIDTH, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>

            {/* Contour de la salle. */}
            <div className="absolute" style={{ left: ROOM_LEFT, top: ROOM_TOP, width: Math.round(ROOM_WIDTH_CM * SCALE), height: Math.round(ROOM_LENGTH_CM * SCALE), border: '1px solid var(--filet)', borderRadius: 4 }} />

            {/* Passage cuisines / WC : 3 m en haut, aucun mobilier. */}
            <div
              className="absolute flex items-end justify-center text-center"
              style={{ left: ROOM_LEFT, top: ROOM_TOP, width: Math.round(ROOM_WIDTH_CM * SCALE), height: Math.round(PASSAGE_CM * SCALE), background: 'var(--ivoire-raise)', borderBottom: '1px dashed var(--filet)', paddingBottom: 8 }}
            >
              <span style={{ fontSize: '0.7rem', color: 'var(--ciel)', letterSpacing: '0.04em' }}>Passage cuisines / WC</span>
            </div>

            {/* Piste de danse : 6 m en bas, pleine largeur. */}
            <div
              className="absolute flex items-center justify-center text-center"
              style={{ left: ROOM_LEFT, top: ROOM_TOP + Math.round((ROOM_LENGTH_CM - DANCE_FLOOR_CM) * SCALE), width: Math.round(ROOM_WIDTH_CM * SCALE), height: Math.round(DANCE_FLOOR_CM * SCALE), background: 'var(--ivoire-raise)', borderTop: '1px dashed var(--filet)' }}
            >
              <span style={{ fontSize: '0.7rem', color: 'var(--ciel)', letterSpacing: '0.04em' }}>Piste de danse</span>
            </div>

            {/* TABLES DE SERVICE : fontaine de champagne + desserts, ~160 x 80 cm,
                le long du mur droit dans la zone piste de danse. */}
            {SERVICE_TABLES.map((s) => (
              <div
                key={s.label}
                className="absolute flex items-center justify-center text-center"
                style={{ left: SERVICE_LEFT, top: s.top, width: SERVICE_W, height: SERVICE_H, background: 'var(--ivoire)', border: '1px solid var(--filet)', borderRadius: 4 }}
              >
                <span className="font-display" style={{ fontSize: '0.58rem', color: 'var(--nuit-soft)', letterSpacing: '0.03em', whiteSpace: 'nowrap', transform: 'rotate(-90deg)' }}>{s.label}</span>
              </div>
            ))}

            {/* HAUT DE SALLE : photobooth + accessoires (2 x 1 m) et tonneau
                (livre d'or / urne), centrés dans la largeur. */}
            <div
              className="absolute flex items-center justify-center text-center"
              style={{ left: PB_LEFT, top: PB_TOP, width: PB_W, height: PB_H, background: 'var(--ivoire)', border: '1px solid var(--filet)', borderRadius: 4 }}
            >
              <span className="font-display" style={{ fontSize: '0.62rem', color: 'var(--nuit-soft)', letterSpacing: '0.03em', lineHeight: 1.3 }}>Photobooth<br />& accessoires</span>
            </div>
            <div
              className="absolute flex flex-col items-center justify-center text-center"
              title="Tonneau — livre d'or / urne"
              style={{ left: BARREL_LEFT, top: BARREL_TOP, width: BARREL_D, height: BARREL_D, background: 'var(--ivoire)', border: '1px solid var(--filet)', borderRadius: '50%' }}
            >
              <span className="font-display" style={{ fontSize: '0.48rem', color: 'var(--nuit-soft)', lineHeight: 1.15 }}>Livre d'or<br />urne</span>
            </div>

            {/* ZONE DJ : angle bas gauche de la piste, 2,50 x 2,50 m. */}
            <div
              className="absolute flex items-center justify-center text-center"
              style={{ left: DJ_LEFT, top: DJ_TOP, width: DJ_SIZE, height: DJ_SIZE, background: 'var(--ivoire)', border: '1px solid var(--filet)', borderRadius: 4 }}
            >
              <span className="font-display uppercase" style={{ fontSize: '0.66rem', letterSpacing: '0.22em', color: 'var(--nuit-soft)' }}>DJ</span>
            </div>

            {/* TABLE DES MARIÉS : dans la longueur, mur de droite, recul 1 m.
                Construite directement verticale (pas de rotation) : le côté
                gauche (HEAD_TOP) fait face à la salle, le côté droit
                (HEAD_BOTTOM) longe le mur, le bout (Laetitia) est en bas. */}
            <div data-head-table className="absolute" style={{ left: HEAD_LEFT, top: HEAD_TOP_PX, width: HEAD_W, height: HEAD_H, background: 'var(--or)', borderRadius: 6 }}>
              <div
                className="absolute flex flex-col items-center justify-center text-center"
                style={{ left: '50%', top: '50%', width: HEAD_H, transform: 'translate(-50%, -50%) rotate(-90deg)' }}
              >
                <span className="uppercase" style={{ fontSize: '0.56rem', letterSpacing: '0.3em', color: 'rgba(251,246,236,0.85)', fontWeight: 600 }}>Table des mariés</span>
                <span className="font-display" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#FBF6EC', lineHeight: 1.15, marginTop: 3 }}>{HEAD_TABLE.name}</span>
                <span style={{ fontSize: '0.66rem', color: 'rgba(251,246,236,0.85)', marginTop: 3, letterSpacing: '0.04em' }}>{HEAD_TABLE.count} convives</span>
              </div>

              {/* HEAD_TOP : côté gauche, face à la salle. */}
              {HEAD_TOP.map((n, i) => {
                const y = ((i + 0.5) / HEAD_TOP.length) * HEAD_H
                const hit = invite === n
                return (
                  <span key={n} className="absolute" style={{ left: 0, top: y }} {...(hit ? { 'data-invite-seat': true } : {})}>
                    <span className="absolute" style={{ left: -18, top: '50%', transform: 'translateY(-50%)' }}><SeatDot menu="classique" size={12} ring={hit} /></span>
                    <span className="font-display absolute" style={{ right: 24, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap', fontSize: hit ? '0.82rem' : '0.72rem', fontWeight: hit ? 700 : 400, color: hit ? 'var(--or-deep)' : 'rgba(74,58,48,0.75)' }}>{n}</span>
                  </span>
                )
              })}

              {/* HEAD_BOTTOM : côté droit, longe le mur. */}
              {HEAD_BOTTOM.map((n, i) => {
                const y = ((i + 0.5) / HEAD_BOTTOM.length) * HEAD_H
                const hit = invite === n
                return (
                  <span key={n} className="absolute" style={{ right: 0, top: y }} {...(hit ? { 'data-invite-seat': true } : {})}>
                    <span className="absolute" style={{ right: -18, top: '50%', transform: 'translateY(-50%)' }}><SeatDot menu="classique" size={12} ring={hit} /></span>
                    <span className="font-display absolute" style={{ left: 24, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap', fontSize: hit ? '0.82rem' : '0.72rem', fontWeight: hit ? 700 : 400, color: hit ? 'var(--or-deep)' : 'rgba(74,58,48,0.75)' }}>{n}</span>
                  </span>
                )
              })}

              {/* Bout de table : Laetitia, en bas. */}
              <span className="absolute" style={{ left: '50%', bottom: -18, transform: 'translateX(-50%)' }} {...(invite === HEAD_END ? { 'data-invite-seat': true } : {})}>
                <SeatDot menu="classique" size={12} ring={invite === HEAD_END} />
                <span className="font-display absolute" style={{ left: '50%', top: 20, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: invite === HEAD_END ? '0.82rem' : '0.72rem', fontWeight: invite === HEAD_END ? 700 : 400, color: invite === HEAD_END ? 'var(--or-deep)' : 'rgba(74,58,48,0.75)' }}>{HEAD_END}</span>
              </span>
            </div>

            {/* TABLES RONDES */}
            {TABLES.map((t) => (
              <div key={t.name} className="absolute" style={{ left: t.x, top: t.y, transform: 'translate(-50%, -50%)' }}>
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
