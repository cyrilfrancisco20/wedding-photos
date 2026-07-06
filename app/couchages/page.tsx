'use client'

// « Où dormez-vous ? » — dispatching des chambres sur place, pour les invités
// qui logent au domaine. Un plan schématique situe les trois bâtiments
// (château, annexe, gîte), une recherche par prénom met la bonne chambre en
// évidence. Même charte « Variante A » que la galerie / le plan de table
// (tokens re-scopés par .gal-a). Données : lib/couchages.ts (source unique).
// Route non indexée, liée discrètement depuis l'accueil et le déroulé témoins.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Seal } from '@/app/components/Seal'
import { COUPLE, WEDDING } from '@/lib/wedding'
import { BUILDINGS, findByName, TOTAL_SLEEPERS, type Building, type Person } from '@/lib/couchages'

const roomKey = (buildingId: string, roomName: string) => `${buildingId}::${roomName}`

// Petite étiquette de nuit (une personne qui ne dort qu'une seule des 2 nuits).
function NightBadge({ nights }: { nights: Person['nights'] }) {
  if (!nights) return null
  const label = nights === 'ven' ? 'vend. seult' : 'sam. seult'
  return (
    <span style={{ marginLeft: 5, padding: '1px 6px', borderRadius: 999, fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.03em', border: '1px solid var(--filet)', color: 'var(--or-deep)', background: 'rgba(199,123,94,0.07)', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function PersonChip({ person, hit }: { person: Person; hit: boolean }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: '5px 11px', borderRadius: 999, fontSize: '0.82rem', lineHeight: 1.2,
        background: hit ? 'var(--or)' : person.kid ? 'rgba(126,151,112,0.14)' : 'var(--ivoire-raise)',
        color: hit ? '#FBF6EC' : 'var(--nuit)',
        border: `1px solid ${hit ? 'var(--or)' : 'var(--filet)'}`,
        fontWeight: hit ? 600 : 400,
      }}
    >
      {person.name}
      {person.kid && <span aria-hidden="true" style={{ marginLeft: 5, fontSize: '0.6rem', opacity: 0.75 }}>enfant</span>}
      {person.note && <span style={{ marginLeft: 5, fontSize: '0.6rem', color: hit ? 'rgba(251,246,236,0.85)' : 'var(--ciel)' }}>· {person.note}</span>}
      <NightBadge nights={person.nights} />
    </span>
  )
}

// Plan du domaine = vraie vue aérienne (orthophoto IGN, licence ouverte),
// centrée sur les coordonnées fournies par Cyril, avec le DÉTOURAGE de chaque
// bâtiment en surimpression : polygone coloré (couleur de la section) cliquable
// qui descend vers ses chambres. Contours tracés à la main sur l'image
// (repère 1024×1024, nord en haut). Positions calées sur les coordonnées GPS
// des 3 bâtiments (annexe NO, château E, gîte au sud près de la D182).
// Repère image = aerien2.jpg (920×1200), couvrant domaine (nord) + gîte (sud).
const OUTLINES: Record<string, string> = {
  // Annexe = partie HAUTE (nord) : bâtiment terracotta à toiture pyramidale.
  annexe: '437,141 529,150 574,167 558,210 519,200 440,164',
  chateau: '772,340 811,360 819,384 804,412 778,425 747,414 734,384 745,357',
  // Gîte = la maison isolée au sud, en bordure de la route de Jugy.
  gite: '134,974 193,983 183,1031 173,1058 119,1049 126,998',
}
// Chemin d'accès domaine → gîte, décalqué au pixel près de la clôture réelle
// (tracé fourni par Cyril en PDF, superposé sur l'orthophoto puis converti
// dans le repère de aerien2.jpg — vérifié visuellement, coïncide exactement).
const GITE_PATH = 'M 646 452 L 646 744 L 376 680 L 236 942 L 158 920 L 140 990'
// Position de la pastille-libellé (coin haut-gauche + largeur), en repère image.
const LABELS: Record<string, { x: number; y: number; w: number }> = {
  annexe: { x: 398, y: 94, w: 176 },
  chateau: { x: 648, y: 294, w: 176 },
  gite: { x: 28, y: 922, w: 158 },
}

// Zone cliquable (bounding box du contour, en % du conteneur) — support d'un
// bouton HTML transparent par bâtiment. On passe par du HTML car le onClick
// React se déclenche de façon fiable sur un <button> (pas sur du SVG ici).
const HITBOX: Record<string, { left: number; top: number; w: number; h: number }> = {
  annexe: { left: 45.5, top: 10.5, w: 19, h: 9 },
  chateau: { left: 78, top: 26.5, w: 13, h: 11 },
  gite: { left: 10.5, top: 79.5, w: 13, h: 11 },
}

function MapDomaine({ active, onPick }: { active: string | null; onPick: (id: string) => void }) {
  return (
    <div style={{ position: 'relative', lineHeight: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/couchages/aerien2.jpg" alt="Vue aérienne du domaine du Clos des Tourelles" style={{ display: 'block', width: '100%', height: 'auto' }} />

      {/* Détourage + chemin (visuel uniquement, non interactif) */}
      <svg viewBox="0 0 920 1200" preserveAspectRatio="none" role="img" aria-label="Vue aérienne : annexe et château au nord, gîte au sud avec son chemin d'accès" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Chemin d'accès au gîte : casing sombre + pointillés clairs */}
        <path d={GITE_PATH} fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <path d={GITE_PATH} fill="none" stroke="#F3EADB" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="11 9" />
        <g transform="translate(388 598)">
          <rect x="0" y="0" width="158" height="34" rx="17" fill="#8E6E9E" stroke="#FBF6EC" strokeWidth="1" opacity="0.96" />
          <text x="79" y="22" fontSize="15" fontWeight="600" fill="#FBF6EC" textAnchor="middle" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Accès gîte</text>
        </g>

        {BUILDINGS.map((b) => {
          const on = active === b.id
          const lab = LABELS[b.id]
          return (
            <g key={b.id}>
              <polygon
                points={OUTLINES[b.id]}
                fill={b.accent}
                fillOpacity={on ? 0.42 : 0.2}
                stroke={b.accent}
                strokeWidth={on ? 7 : 4.5}
                strokeLinejoin="round"
                style={{ filter: on ? 'drop-shadow(0 0 6px rgba(0,0,0,0.5))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}
              />
              <g transform={`translate(${lab.x} ${lab.y})`}>
                <rect x="0" y="0" width={lab.w} height="38" rx="19" fill={b.accent} stroke="#FBF6EC" strokeWidth={on ? 2 : 1} opacity="0.96" />
                <text x={lab.w / 2} y="18" fontSize="18" fontWeight="600" fill="#FBF6EC" textAnchor="middle" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>{b.name}</text>
                <text x={lab.w / 2} y="31" fontSize="11.5" fill="rgba(251,246,236,0.92)" textAnchor="middle">{b.capacity} couchages</text>
              </g>
            </g>
          )
        })}
        <g transform="translate(872 56)">
          <circle r="22" fill="#FBF8F1" opacity="0.94" />
          <path d="M0 -15 L5 3 L0 -1 L-5 3 Z" fill="var(--or)" />
          <text x="0" y="-24" fontSize="13" fill="var(--nuit)" textAnchor="middle">N</text>
        </g>
      </svg>

      {/* Zones cliquables (HTML) : descendent vers la section du bâtiment */}
      {BUILDINGS.map((b) => {
        const box = HITBOX[b.id]
        return (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            aria-label={`Voir les chambres du ${b.name}`}
            style={{ position: 'absolute', left: `${box.left}%`, top: `${box.top}%`, width: `${box.w}%`, height: `${box.h}%`, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          />
        )
      })}
    </div>
  )
}

// Façade d'un bâtiment, avec repli robuste : si le fichier n'est pas (encore)
// dans public/couchages/, l'image se masque — y compris quand l'erreur survient
// avant l'hydratation (vérif `complete && naturalWidth===0` au montage).
function Facade({ src, name, focus }: { src: string; name: string; focus?: string }) {
  const [ok, setOk] = useState(true)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (ref.current && ref.current.complete && ref.current.naturalWidth === 0) setOk(false)
  }, [])
  if (!ok) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={`Façade du ${name}`}
      onError={() => setOk(false)}
      onLoad={(e) => { if (e.currentTarget.naturalWidth === 0) setOk(false) }}
      style={{ display: 'block', width: '100%', height: 'clamp(150px, 26vw, 230px)', objectFit: 'cover', objectPosition: focus ?? 'center', borderRadius: 12, border: '1px solid var(--filet)', margin: '2px 0 14px' }}
    />
  )
}

function BuildingSection({ building, highlighted, refFor }: {
  building: Building
  highlighted: Set<string>
  refFor: (id: string, el: HTMLElement | null) => void
}) {
  const occupancy = building.rooms.reduce((n, r) => n + r.people.length, 0)
  return (
    <section id={building.id} ref={(el) => refFor(building.id, el)} className="reveal" style={{ scrollMarginTop: 16, marginBottom: 40 }}>
      <div className="flex items-center" style={{ gap: 14, marginBottom: 8 }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: building.accent, flexShrink: 0 }} />
        <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--nuit)', margin: 0 }}>{building.name}</h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--ciel)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{occupancy} personnes · {building.capacity} lits</span>
        <span style={{ flex: 1, height: 1, background: 'var(--filet)' }} />
      </div>
      {building.photo && <Facade src={building.photo} name={building.name} focus={building.photoFocus} />}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 14, marginTop: 14 }}>
        {building.rooms.map((room) => {
          const key = roomKey(building.id, room.name)
          const on = highlighted.has(key)
          return (
            <div
              key={room.name}
              ref={(el) => refFor(`room:${key}`, el)}
              style={{
                scrollMarginTop: 74,
                padding: '15px 16px 16px', borderRadius: 12,
                background: 'var(--ivoire-raise)',
                border: `1px solid ${on ? building.accent : 'var(--filet)'}`,
                boxShadow: on ? `0 0 0 2px ${building.accent}` : 'none',
                transition: 'box-shadow .35s ease, border-color .35s ease',
              }}
            >
              <div className="flex items-baseline" style={{ gap: 8, justifyContent: 'space-between' }}>
                <span className="font-display" style={{ fontSize: '1.12rem', fontWeight: 600, color: 'var(--nuit)' }}>{room.name}</span>
                {room.floor && <span style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ciel)', whiteSpace: 'nowrap' }}>{room.floor}</span>}
              </div>
              <div className="flex flex-wrap" style={{ gap: 7, marginTop: 12 }}>
                {room.people.map((p) => <PersonChip key={p.name} person={p} hit={on} />)}
              </div>
              {room.spare && <p style={{ fontSize: '0.68rem', color: 'var(--ciel)', fontStyle: 'italic', margin: '10px 0 0' }}>{room.spare}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function CouchagesPage() {
  const [query, setQuery] = useState('')
  const refs = useRef<Map<string, HTMLElement>>(new Map())
  const refFor = (id: string, el: HTMLElement | null) => { if (el) refs.current.set(id, el); else refs.current.delete(id) }

  const found = useMemo(() => findByName(query), [query])
  const highlighted = useMemo(() => new Set(found.map((f) => roomKey(f.building.id, f.room.name))), [found])
  const activeBuilding = found[0]?.building.id ?? null

  // Reveal au scroll.
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

  const scrollTo = (id: string) => refs.current.get(id)?.scrollIntoView({ block: 'start' })

  return (
    <main className="gal-a" style={{ background: 'var(--ivoire)', color: 'var(--nuit)', fontFamily: 'var(--font-body), system-ui, sans-serif', minHeight: '100vh' }}>

      {/* TITRE */}
      <section className="text-center fade-in" style={{ padding: '54px 24px 8px' }}>
        <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: 'var(--or)', fontWeight: 600, margin: 0 }}>{COUPLE}</p>
        <h1 className="font-display" style={{ fontWeight: 500, fontSize: 'clamp(2.1rem, 6vw, 2.8rem)', lineHeight: 1.05, margin: '.3em 0 0' }}>Où dormez-vous ?</h1>
        <p className="font-display italic" style={{ fontSize: '1.05rem', color: 'var(--nuit-soft)', margin: '.7em auto 0' }}>
          {TOTAL_SLEEPERS}{' '}couchages · Château, Annexe &amp; Gîte
        </p>
        <p style={{ color: 'var(--ciel)', fontSize: '0.75rem', maxWidth: '34rem', margin: '12px auto 0', lineHeight: 1.6 }}>
          Cherchez votre prénom pour trouver votre chambre, ou touchez un bâtiment sur le plan.
        </p>
        <p style={{ marginTop: 14 }}>
          <a href="/temoins" className="font-display italic" style={{ color: 'var(--or)', fontSize: '0.95rem' }}>← Retour au déroulé du jour J</a>
        </p>
      </section>

      {/* RECHERCHE PAR PRÉNOM */}
      <div className="mx-auto" style={{ maxWidth: 520, padding: '10px 24px 0' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Votre prénom…"
          aria-label="Chercher votre prénom"
          style={{
            width: '100%', padding: '13px 18px', borderRadius: 999, fontSize: '0.95rem',
            background: 'var(--ivoire-raise)', border: '1px solid var(--filet)', color: 'var(--nuit)', outline: 'none',
          }}
        />
        {query.trim().length >= 2 && (
          <div className="fade-in" style={{ marginTop: 12 }}>
            {found.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--ciel)', textAlign: 'center' }}>
                Aucun prénom trouvé. Essayez sans l&apos;initiale de famille, ou parcourez les bâtiments ci-dessous.
              </p>
            ) : (
              found.map((f) => {
                const others = f.room.people.filter((p) => p.name !== f.person.name).map((p) => p.name)
                return (
                  <button
                    key={`${f.building.id}-${f.room.name}-${f.person.name}`}
                    onClick={() => scrollTo(`room:${roomKey(f.building.id, f.room.name)}`)}
                    className="lift"
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, cursor: 'pointer',
                      padding: '13px 16px', borderRadius: 12, background: 'var(--ivoire-raise)',
                      border: `1px solid ${f.building.accent}`, boxShadow: `0 0 0 1px ${f.building.accent}`,
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', color: 'var(--nuit)' }}>
                      <strong style={{ color: 'var(--nuit)' }}>{f.person.name}</strong> dort {f.building.id === 'annexe' ? 'à l’' : 'au '}
                      <strong style={{ color: 'var(--or-deep)' }}>{f.building.name}</strong> · {f.room.name}
                      {f.room.floor ? ` (${f.room.floor})` : ''}.
                    </span>
                    {others.length > 0 && (
                      <span style={{ display: 'block', marginTop: 3, fontSize: '0.76rem', color: 'var(--nuit-soft)' }}>
                        Avec {others.join(', ')}.
                      </span>
                    )}
                    <span className="font-display italic" style={{ display: 'block', marginTop: 4, fontSize: '0.8rem', color: f.building.accent }}>Voir la chambre →</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* PLAN DU DOMAINE */}
      <div className="mx-auto reveal" style={{ maxWidth: 720, padding: '26px 20px 4px' }}>
        <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--filet)', background: '#EEF2E6' }}>
          <MapDomaine active={activeBuilding} onPick={scrollTo} />
        </div>
        <p className="text-center" style={{ color: 'var(--ciel)', fontSize: '0.7rem', margin: '8px auto 0', maxWidth: '32rem', lineHeight: 1.5 }}>
          Vue aérienne du domaine (© IGN / Géoportail) — touchez un bâtiment pour voir ses chambres. L&apos;annexe et le château sont au nord ; le gîte est à l&apos;écart au sud, relié au domaine par le chemin en pointillés.
        </p>
      </div>

      {/* SECTIONS PAR BÂTIMENT */}
      <div className="mx-auto" style={{ maxWidth: 860, padding: '34px 20px 60px' }}>
        {BUILDINGS.map((b) => (
          <BuildingSection key={b.id} building={b} highlighted={highlighted} refFor={refFor} />
        ))}

        <p className="text-center" style={{ color: 'var(--ciel)', fontSize: '0.72rem', lineHeight: 1.6, maxWidth: '32rem', margin: '6px auto 0' }}>
          Un doute sur votre chambre ? Demandez à Morgane ou Cyril.
        </p>
      </div>

      {/* PIED : monogramme, centré (Seal est un flex-box, text-align n'a pas prise dessus). */}
      <footer className="flex flex-col items-center text-center" style={{ background: '#DDE3D2', padding: '46px 30px' }}>
        <Seal size={56} />
        <p className="font-display italic" style={{ fontSize: '1.15rem', color: 'var(--nuit)', marginTop: 14 }}>{WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
