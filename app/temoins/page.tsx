'use client'

// Déroulé du jour J à destination des témoins. Route non listée (aucun lien
// depuis l'accueil, noindex via le layout). Même charte « Variante A » que la
// galerie : tokens re-scopés par .gal-a (ivoire, encre brune, terra), hero
// faire-part en mq-zoom, révélations au scroll (.reveal), Cormorant + Hanken.
// Le filtre par prénom met en avant les moments où chaque témoin intervient.

import { useEffect, useState } from 'react'
import { Seal } from '@/app/components/Seal'
import { COUPLE, WEDDING } from '@/lib/wedding'
import { HEAD_TABLE_NAME, headPlace, planNameFor } from '@/lib/plan'

type Row = {
  t: string
  label: string
  bold?: boolean // temps fort : heure marquée, gros point sur le fil
  sub?: string
  music?: string
  dur?: string
  verify?: string
  names?: string[] // témoins concernés, pour le filtre par prénom
  proc?: boolean // insère l'ordre de procession sous cette ligne
}

type Section = { id: string; title: string; dot: string; rows: Row[] }

const TEMOINS_CYRIL = ['Anthony', 'Mathieu', 'Jean-Christophe', 'Richard', 'Yoan', 'Alexandre']
const TEMOINS_MORGANE = ['Nelly', 'Elodie', 'Marine', 'Audrey', 'Micka', 'Fred']
const TEMOINS = [...TEMOINS_CYRIL, ...TEMOINS_MORGANE]

const PROCESSION: { n: number; t: string; who: string; side: string; names: string[] }[] = [
  { n: 1, t: '16h20', who: 'Carole & Cyril', side: 'Côté Cyril', names: [] },
  { n: 2, t: '+20s', who: 'Anthony & Mathieu', side: 'Témoins Cyril', names: ['Anthony', 'Mathieu'] },
  { n: 3, t: '+20s', who: 'Nelly & Elodie', side: 'Témoins Morgane', names: ['Nelly', 'Elodie'] },
  { n: 4, t: '+20s', who: 'Jean-Christophe & Richard', side: 'Témoins Cyril', names: ['Jean-Christophe', 'Richard'] },
  { n: 5, t: '+20s', who: 'Marine & Audrey', side: 'Témoins Morgane', names: ['Marine', 'Audrey'] },
  { n: 6, t: '+20s', who: 'Yoan & Alexandre', side: 'Témoins Cyril', names: ['Yoan', 'Alexandre'] },
  { n: 7, t: '+20s', who: 'Fred & Micka', side: 'Témoins Morgane', names: ['Fred', 'Micka'] },
  { n: 8, t: '+20s', who: 'Antoine + Léon & Charlotte', side: 'Famille Cyril', names: [] },
]

const SECTIONS: Section[] = [
  {
    id: 'accueil',
    title: 'Installation & Accueil',
    dot: '#A9B296',
    rows: [
      { t: '13h00', bold: true, label: "Evidence arrive et s'installe", sub: 'Accueilli par Fred & Micka.', names: ['Fred', 'Micka'] },
      { t: '13h00', bold: true, label: 'Victor arrive · séance photo avec Morgane', sub: "Accueilli par Elodie. Vers 14h30, au moment de l'essayage de la robe, Victor rejoint Cyril.", names: ['Elodie'] },
      { t: '14h00', bold: true, label: "DJ Stéphane arrive et s'installe", sub: 'Accueilli par Cyril. Test sono avant 16h00.' },
      { t: '14h30', bold: true, label: 'La Flamme de Sennecey vient récupérer le brasero', sub: 'Accueilli par Cyril.' },
      { t: '15h30', bold: true, label: 'Accueil des invités sur le parvis', sub: 'Jean-Christophe & Gaëlle et Mathieu & Elodie font circuler la caisse de vin. Enceinte Ugo sur le parvis. Victor : portraits libres.', music: 'Smooth Jazz House Music Mix', names: ['Jean-Christophe', 'Mathieu', 'Elodie'] },
      { t: '15h30', label: 'Le groupe jazz et Ibtisseme arrivent', sub: 'Micka & Fred les accueillent et les orientent.', names: ['Micka', 'Fred'] },
      { t: '16h00', bold: true, label: 'Yannis au micro', sub: 'Il invite les invités à rejoindre la mare. Jean-Christophe et Gaëlle guident. Yannis garde le micro.', names: ['Jean-Christophe'] },
      { t: '16h10', bold: true, label: 'Ugo coupe progressivement le son', sub: 'Thomas prend le relais côté mare. 5 minutes de silence.' },
    ],
  },
  {
    id: 'ceremonie',
    title: 'Cérémonie laïque · La Mare',
    dot: '#C77B5E',
    rows: [
      { t: '16h15', bold: true, label: "Yannis remonte l'allée et prend place au pupitre", dur: '2 min', music: 'Theo Lawrence & The Hearts · Heaven to Me', names: ['Thomas'] },
      { t: '16h17', label: "Yannis · discours d'introduction", dur: '1 min', sub: '« Mesdames et Messieurs, veuillez vous lever pour accueillir le marié, leurs témoins et leur famille »' },
      { t: '16h20', bold: true, label: 'Procession', dur: '~3 min 10', sub: 'Départs espacés de 20 secondes, dans cet ordre :', music: 'Nina Simone · Here Comes the Sun', names: [...TEMOINS, 'Thomas'], proc: true },
      { t: '16h24', label: 'Yannis : « Mesdames et Messieurs, veuillez maintenant accueillir la mariée »' },
      { t: '16h24', bold: true, label: 'Morgane entre, accompagnée par Allan', dur: '~1 min 45', sub: "15 secondes d'intro musicale, puis Morgane remonte l'allée au bras d'Allan.", music: 'Duomo / Sebastien Pecznik · With Or Without You', names: ['Thomas'] },
      { t: '16h26', label: "Morgane rejoint Cyril. Allan va s'asseoir. Moment ensemble (~2 min)." },
      { t: '16h28', label: 'Fin de With Or Without You. Tout le monde se rassoit.' },
      { t: '16h28', bold: true, label: 'Yannis · introduction du couple', dur: '3 min' },
      { t: '16h31', label: 'Passage du micro aux témoins de Morgane', dur: '1 min' },
      { t: '16h32', bold: true, label: 'Témoins de Morgane · discours 1', dur: '5 min max' },
      { t: '16h37', label: 'Passage du micro à Carole', dur: '1 min' },
      { t: '16h38', bold: true, label: 'Carole · discours', dur: '5 min max' },
      { t: '16h43', label: 'Passage du micro aux témoins de Morgane', dur: '1 min' },
      { t: '16h44', bold: true, label: 'Témoins de Morgane · discours 2', dur: '5 min max' },
      { t: '16h49', label: 'Passage du micro aux témoins de Cyril', dur: '1 min' },
      { t: '16h50', bold: true, label: 'Témoins de Cyril · discours 1', dur: '5 min max' },
      { t: '16h55', label: 'Passage du micro aux témoins de Morgane', dur: '1 min' },
      { t: '16h56', bold: true, label: 'Témoins de Morgane · discours 3', dur: '5 min max' },
      { t: '17h01', label: 'Passage du micro aux témoins de Cyril', dur: '1 min' },
      { t: '17h02', bold: true, label: 'Témoins de Cyril · discours 2', dur: '5 min max' },
      { t: '17h07', label: 'Passage du micro aux témoins de Morgane', dur: '1 min' },
      { t: '17h08', bold: true, label: 'Témoins de Morgane · discours 4', dur: '5 min max' },
      { t: '17h13', label: 'Yannis annonce les vœux', dur: '~1 min' },
      { t: '17h14', bold: true, label: 'Vœux de Cyril', dur: '7 min' },
      { t: '17h22', label: 'Yannis enchaîne vers les vœux de Morgane', dur: '~1 min' },
      { t: '17h23', bold: true, label: 'Vœux de Morgane', dur: '8 min max' },
      { t: '17h31', label: 'Transition vers le consentement', dur: '~1 min' },
      { t: '17h32', bold: true, label: 'Yannis fait le geste : Gaëlle envoie les enfants avec les alliances', music: 'Ben Mazué · 10 ans de nous', names: ['Thomas'] },
      { t: '17h37', bold: true, label: 'Les enfants arrivent · Charlotte présente les alliances' },
      { t: '17h41', bold: true, label: 'Consentement, échange des alliances & baiser' },
      { t: '17h44', bold: true, label: "Yannis annonce la fin de la cérémonie et invite vers l'apéritif", sub: 'Thomas déclenche la machine à bulles.', music: 'Stevie Wonder · For Once In My Life', names: ['Thomas'] },
      { t: '17h45', bold: true, label: 'Yannis passe le micro à Nelly · sortie des mariés sous les bulles', names: ['Nelly'] },
      { t: '~17h46', label: "Yoan, Alexandre, Anthony & Richard déplacent l'arche vers le Photo Booth et le panneau Welcome vers la salle. Laurine, Elodie et Nelly décrochent les fleurs de l'allée et les répartissent dans les soliflores sur les tonneaux (mange-debout).", names: ['Yoan', 'Alexandre', 'Anthony', 'Richard', 'Elodie', 'Nelly'] },
    ],
  },
  {
    id: 'aperitif',
    title: "Apéritif & Vin d'honneur",
    dot: '#D9A38E',
    rows: [
      { t: '17h48', bold: true, label: 'Set n°1 · groupe jazz + Ibtisseme' },
      { t: '18h40', bold: true, label: 'Set n°2 · groupe jazz seul', dur: '54 min' },
      { t: '19h34', bold: true, label: 'Fin du jazz · DJ Stéphane prend le relais' },
      { t: '19h35', label: 'DJ Stéphane annonce la danse des mariés' },
      { t: '19h40', bold: true, label: 'Danse des mariés en extérieur', music: 'Oscar Anton · Monde Nouveau' },
      { t: '19h45', label: 'DJ Stéphane annonce le lancer de bouquet' },
      { t: '19h50', bold: true, label: 'Lancer de bouquet', dur: '5 min', music: "Ani DiFranco · Wishin' & Hopin'" },
      { t: '20h00', bold: true, label: 'Photos des mariés avec Victor', dur: '25 min', sub: "Le DJ invite les convives à rejoindre la salle, sur un fond sonore des musiques de l'apéritif." },
      { t: '20h25', label: 'Retour des mariés. Transition vers la salle.', dur: '5 min' },
    ],
  },
  {
    id: 'repas',
    title: 'Repas',
    dot: '#A85F44',
    rows: [
      { t: '20h30', bold: true, label: 'Entrée en salle · les témoins, puis les mariés', music: 'Yann Muller · Prière Païenne', names: TEMOINS },
      { t: '20h36', bold: true, label: 'Discours de remerciements · Morgane ou Cyril', sub: 'Nelly remet le micro.', names: ['Nelly'] },
      { t: '20h40', bold: true, label: 'Rallye photos avec chaque table', music: 'The Beatles · Hey Jude' },
      { t: '20h50', bold: true, label: 'Service du plat principal', sub: 'Mercurey Blanc + Saint-Joseph.', music: 'DJ · fond discret' },
      { t: '22h00', bold: true, label: 'Service du fromage', sub: 'Mercurey Rouge.' },
    ],
  },
  {
    id: 'soiree',
    title: 'Soirée',
    dot: '#4A3A30',
    rows: [
      { t: '22h15', bold: true, label: 'Blind test · 15 titres', dur: '~35 min', sub: 'DJ Stéphane anime.' },
      { t: '22h50', bold: true, label: 'Annonce des 3 gagnants', sub: 'Remise des bouteilles par Morgane et Cyril.' },
      { t: '23h00', bold: true, label: 'Fontaine de champagne · entrée en lumières', music: '20th Century Fox Intro × Daft Punk · One More Time' },
      { t: '23h05', label: 'Champagne servi', dur: '25 min' },
      { t: '23h30', bold: true, label: 'Ouverture de bal', sub: "S'enchaîne avec la soirée.", music: 'Raye · Where Is My Husband' },
      { t: '23h35', bold: true, label: 'Soirée dansante', sub: "Jusqu'à 6h00.", music: 'DJ set' },
    ],
  },
]

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lift shrink-0"
      style={{
        padding: '7px 15px',
        borderRadius: 999,
        fontSize: '0.78rem',
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        border: `1px solid ${active ? 'var(--or)' : 'var(--filet)'}`,
        background: active ? 'var(--or)' : 'transparent',
        color: active ? '#fff' : 'var(--nuit-soft)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

export default function TemoinsPage() {
  const [sel, setSel] = useState<string | null>(null)

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

  const concerns = (names?: string[]) => !!sel && !!names && names.includes(sel)
  const dimmed = (names?: string[]) => !!sel && !(names ?? []).includes(sel)

  return (
    <main className="gal-a" style={{ background: 'var(--ivoire)', color: 'var(--nuit)', fontFamily: 'var(--font-body), system-ui, sans-serif', minHeight: '100vh' }}>

      {/* HÉRO : le faire-part plein cadre, très lent zoom respiré. */}
      <section className="relative overflow-hidden" style={{ height: '46vh', minHeight: 340 }}>
        <img src="/accueil/hero.png" alt={COUPLE} className="mq-zoom absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(20,13,8,0.16) 0%, rgba(20,13,8,0.55) 100%), linear-gradient(180deg, rgba(20,13,8,0.4), rgba(20,13,8,0.3) 45%, rgba(20,13,8,0.58))' }} />
        <div className="absolute inset-x-0 flex flex-col items-center fade-in" style={{ bottom: 20, color: '#FBF6EC' }}>
          <span className="uppercase" style={{ fontSize: '0.58rem', letterSpacing: '0.34em' }}>Jour J · déroulé des témoins</span>
          <span className="drift" style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: 4 }}>↓</span>
        </div>
      </section>

      {/* TITRE */}
      <section className="text-center fade-in" style={{ padding: '54px 24px 30px' }}>
        <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: 'var(--or)', fontWeight: 600, margin: 0 }}>{COUPLE}</p>
        <h1 className="font-display" style={{ fontWeight: 500, fontSize: 'clamp(2.1rem, 6vw, 2.8rem)', lineHeight: 1.05, margin: '.3em 0 0' }}>Le déroulé du jour J</h1>
        <p className="font-display italic" style={{ fontSize: '1.05rem', color: 'var(--nuit-soft)', margin: '.7em auto 0' }}>
          Samedi {WEDDING.dateLabel} · Le Clos des Tourelles, Sennecey-le-Grand
        </p>
        <p style={{ color: 'var(--ciel)', fontSize: '0.75rem', maxWidth: '34rem', margin: '14px auto 0', lineHeight: 1.6 }}>
          Réservé aux témoins : merci de ne pas faire circuler.
          Touchez votre prénom pour voir vos interventions.
        </p>
        <p style={{ marginTop: 14, display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/plan-de-table" className="font-display italic" style={{ color: 'var(--or)', fontSize: '0.95rem' }}>Voir le plan de table →</a>
          <a href="/couchages" className="font-display italic" style={{ color: 'var(--or)', fontSize: '0.95rem' }}>Où dormez-vous ? →</a>
        </p>
      </section>

      {/* FILTRE PAR PRÉNOM : barre givrée collante. */}
      <div className="glass no-scrollbar" style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 20px', borderTop: '1px solid var(--filet)', borderBottom: '1px solid var(--filet)' }}>
        <Chip label="Tout le déroulé" active={!sel} onClick={() => setSel(null)} />
        {TEMOINS.map((n) => (
          <Chip key={n} label={n} active={sel === n} onClick={() => setSel(sel === n ? null : n)} />
        ))}
        <span aria-hidden="true" style={{ width: 1, background: 'var(--filet)', margin: '2px 2px', flexShrink: 0 }} />
        <Chip label="Thomas" active={sel === 'Thomas'} onClick={() => setSel(sel === 'Thomas' ? null : 'Thomas')} />
      </div>

      {/* PLACE AU DÎNER du témoin sélectionné (source : lib/plan.ts). */}
      {sel && (() => {
        const planName = planNameFor(sel)
        const place = headPlace(planName)
        if (!place) return null
        const voisins = place.between.length === 2
          ? `entre ${place.between[0]} et ${place.between[1]}`
          : place.between.length === 1 ? `à côté de ${place.between[0]}` : ''
        return (
          <div key={sel} className="fade-in text-center" style={{ padding: '16px 24px 0', fontSize: '0.84rem', color: 'var(--nuit-soft)', lineHeight: 1.6 }}>
            Votre place au dîner : <span className="font-display italic" style={{ color: 'var(--nuit)', fontSize: '1rem' }}>{HEAD_TABLE_NAME}</span> (table des mariés), {voisins}.{' '}
            <a href={`/plan-de-table?invite=${encodeURIComponent(planName)}`} className="font-display italic" style={{ color: 'var(--or-deep)', whiteSpace: 'nowrap' }}>Voir sur le plan →</a>
          </div>
        )
      })()}

      {/* TIMELINE */}
      <div className="mx-auto" style={{ maxWidth: 720, padding: '40px 20px 72px' }}>
        {SECTIONS.map((section) => (
          <section key={section.id} className="reveal" style={{ marginBottom: 46 }}>
            <div className="flex items-center" style={{ gap: 14, marginBottom: 20 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: section.dot, flexShrink: 0 }} />
              <h2 className="font-display uppercase" style={{ fontSize: '1.05rem', fontWeight: 500, letterSpacing: '0.12em', color: 'var(--nuit)', margin: 0, whiteSpace: 'nowrap' }}>{section.title}</h2>
              <span style={{ flex: 1, height: 1, background: 'var(--filet)' }} />
            </div>

            <div className="relative">
              {/* Fil vertical de la section. */}
              <span className="absolute" style={{ left: 78, top: 6, bottom: 6, width: 1, background: 'var(--filet)' }} />

              {section.rows.map((row, i) => {
                const hit = concerns(row.names)
                const dim = dimmed(row.names)
                return (
                  <div key={i}>
                    <div
                      className="relative grid"
                      style={{
                        gridTemplateColumns: '68px 1fr',
                        opacity: dim ? 0.28 : 1,
                        transition: 'opacity .35s ease, background .35s ease',
                        background: hit ? 'rgba(199,123,94,0.09)' : 'transparent',
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ padding: '12px 0', textAlign: 'right', fontSize: '0.72rem', letterSpacing: '0.04em', color: row.bold ? 'var(--nuit)' : 'var(--ciel)', fontWeight: row.bold ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {row.t}
                      </div>
                      <div className="relative" style={{ padding: '12px 10px 12px 26px' }}>
                        <span
                          className="absolute rounded-full"
                          style={
                            row.bold
                              ? { left: 6, top: 17, width: 9, height: 9, background: hit ? 'var(--or-deep)' : 'var(--or)', boxShadow: '0 0 0 3px var(--ivoire)' }
                              : { left: 8, top: 19, width: 5, height: 5, background: 'var(--filet)', boxShadow: '0 0 0 3px var(--ivoire)' }
                          }
                        />
                        {row.bold ? (
                          <div className="font-display" style={{ fontSize: '1.12rem', fontWeight: 500, lineHeight: 1.35, color: 'var(--nuit)' }}>
                            {row.label}
                            {row.dur && <span style={{ marginLeft: 8, padding: '2px 9px', borderRadius: 999, background: 'var(--ivoire-raise)', color: 'var(--or-deep)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.04em', fontFamily: 'var(--font-body)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{row.dur}</span>}
                          </div>
                        ) : (
                          <div className="font-display italic" style={{ fontSize: '1rem', lineHeight: 1.4, color: 'var(--nuit-soft)' }}>
                            {row.label}
                            {row.dur && <span style={{ marginLeft: 8, color: 'var(--ciel)', fontSize: '0.72rem', fontStyle: 'normal', fontFamily: 'var(--font-body)' }}>({row.dur})</span>}
                          </div>
                        )}
                        {row.sub && <p style={{ fontSize: '0.8rem', color: 'var(--ciel)', lineHeight: 1.55, margin: '4px 0 0' }}>{row.sub}</p>}
                        {row.music && (
                          <p className="italic" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '7px 0 0', padding: '3px 10px', borderRadius: 999, border: '1px solid var(--filet)', background: 'rgba(199,123,94,0.06)', color: 'var(--or-deep)', fontSize: '0.72rem' }}>
                            <span aria-hidden="true" style={{ fontStyle: 'normal' }}>♪</span>{row.music}
                          </p>
                        )}
                        {row.verify && (
                          <p style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '7px 0 0 6px', padding: '3px 10px', borderRadius: 999, border: '1px dashed var(--or)', color: 'var(--or-deep)', fontSize: '0.7rem' }}>
                            <span aria-hidden="true">↺</span>{row.verify}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ordre de procession, calé sous la ligne Procession. */}
                    {row.proc && (
                      <div style={{ margin: '2px 0 10px 94px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {PROCESSION.map((g) => {
                          const gHit = concerns(g.names)
                          const gDim = dimmed(g.names)
                          return (
                            <div
                              key={g.n}
                              className="flex items-center"
                              style={{
                                gap: 12,
                                padding: '9px 14px',
                                borderRadius: 8,
                                background: gHit ? 'rgba(199,123,94,0.12)' : 'var(--ivoire-raise)',
                                border: `1px solid ${gHit ? 'var(--or)' : 'var(--filet)'}`,
                                opacity: gDim ? 0.35 : 1,
                                transition: 'opacity .35s ease, background .35s ease, border-color .35s ease',
                              }}
                            >
                              <span className="font-display" style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--or)', width: 20, textAlign: 'center', flexShrink: 0 }}>{g.n}</span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--nuit)', lineHeight: 1.3 }}>{g.who}</span>
                                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--ciel)', letterSpacing: '0.04em' }}>{g.side}</span>
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--or-deep)', fontWeight: 600, whiteSpace: 'nowrap' }}>{g.t}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        <p className="text-center" style={{ color: 'var(--ciel)', fontSize: '0.72rem', lineHeight: 1.6, maxWidth: '30rem', margin: '8px auto 0' }}>
          Les horaires de la cérémonie peuvent glisser de quelques minutes : suivez Yannis, il donne le tempo.
        </p>
      </div>

      {/* PIED : monogramme, comme sur l'accueil. */}
      <footer className="flex flex-col items-center text-center" style={{ background: '#DDE3D2', padding: '46px 30px' }}>
        <Seal size={56} />
        <p className="font-display italic" style={{ fontSize: '1.15rem', color: 'var(--nuit)', marginTop: 14 }}>{WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
