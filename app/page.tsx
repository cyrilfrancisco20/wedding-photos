'use client'

// Page d'accueil invité (scannée via le QR). Style « Variante A » éditorial doux.
// Partage des photos PAR JOUR : l'invité choisit Vendredi / Samedi / Dimanche,
// puis prend ou joint une photo, qui part vers /api/upload rangée sur ce jour.

import { useRef, useState, type ReactNode } from 'react'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { DAY_ORDER, DAY_LABELS, dayForInstant, type Day } from '@/lib/schedule'
import { WEDDING, COUPLE } from '@/lib/wedding'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const DAY_PHOTO: Record<Day, string> = {
  vendredi: '/accueil/g1.jpg',
  samedi: '/accueil/g2.jpg',
  dimanche: '/accueil/g3.jpg',
}

const C = { ivory: '#F7F2E9', blush: '#ECD8CF', sage: '#DDE3D2', terra: '#C77B5E', ink: '#4A3A30', muted: '#9A8470' }

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  )
}

export default function GuestPage() {
  const camRef = useRef<HTMLInputElement>(null)
  const albRef = useRef<HTMLInputElement>(null)
  // Jour pré-sélectionné sur le jour courant si on est pendant le mariage.
  const [activeDay, setActiveDay] = useState<Day | null>(() => dayForInstant(new Date()))
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Vercel refuse tout corps de requête au-delà de ~4,5 Mo, AVANT même que la
  // fonction ne démarre : le 413 est renvoyé par la plateforme, la route n'en sait
  // rien (le garde « max 15 Mo » de l'API n'a donc jamais pu s'exécuter). Mesuré
  // en prod le 16/07 : 4,40 Mo passe, 4,93 Mo est rejeté.
  //
  // Une photo d'iPhone pèse 2 à 4 Mo. Donc UNE passait, mais DEUX d'un coup (5-8 Mo)
  // partaient en 413 et étaient perdues toutes les deux, sans message exploitable.
  // C'est le geste le plus courant après un mariage, et c'est ce qui a coûté le plus
  // de photos le 11/07. On découpe donc par TAILLE, jamais par nombre.
  const MAX_REQUEST_BYTES = 3.5 * 1024 * 1024 // marge sous les 4,5 Mo (multipart + champs)

  // Une photo qui, seule, dépasse la limite ne passera jamais telle quelle. On la
  // réduit dans le navigateur à 3000px : c'est EXACTEMENT ce que sharp fait ensuite
  // côté serveur (3000px q88), donc la photo finale est identique — on déplace juste
  // le redimensionnement en amont pour que la requête tienne. Effet de bord assumé :
  // le canvas efface l'EXIF, donc `taken_at` sera nul pour ces photos et la galerie
  // les triera sur l'heure d'envoi. Une photo mal triée reste récupérable ; une photo
  // en 413 est perdue pour toujours.
  async function reduire(file: File): Promise<File> {
    try {
      const bitmap = await createImageBitmap(file)
      const ratio = Math.min(3000 / bitmap.width, 3000 / bitmap.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * ratio)
      canvas.height = Math.round(bitmap.height * ratio)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88))
      if (!blob || blob.size >= file.size) return file
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
    } catch {
      // Format que le navigateur ne sait pas décoder : on envoie l'original et on
      // laisse le serveur tenter. Pas pire que l'ancien comportement.
      return file
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || !activeDay) return
    setState('uploading')

    const all = Array.from(files)

    // Réduction des seules photos qui ne passeraient pas : les autres gardent leur
    // EXIF (donc leur tri chronologique) intact.
    const prets: File[] = []
    for (const [i, f] of all.entries()) {
      if (f.size > MAX_REQUEST_BYTES) {
        setMessage(`Préparation ${i + 1} sur ${all.length}…`)
        prets.push(await reduire(f))
      } else prets.push(f)
    }

    // Paquets par taille cumulée. Une photo encore trop grosse après réduction part
    // seule : au moins elle a sa chance.
    const batches: File[][] = []
    let courant: File[] = []
    let poids = 0
    for (const f of prets) {
      if (courant.length && poids + f.size > MAX_REQUEST_BYTES) {
        batches.push(courant)
        courant = []
        poids = 0
      }
      courant.push(f)
      poids += f.size
    }
    if (courant.length) batches.push(courant)

    let sent = 0
    const failures: string[] = []

    for (const batch of batches) {
      if (all.length > 1) setMessage(`Envoi ${sent + 1}-${sent + batch.length} sur ${all.length}…`)
      const form = new FormData()
      form.append('moment', activeDay)
      batch.forEach((f) => form.append('files', f))
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        // Un 413 de Vercel n'est pas du JSON : le parser aveuglément faisait
        // remonter « Unexpected token » à l'invité au lieu d'une vraie raison.
        const txt = await res.text()
        let data: { error?: string; count?: number } = {}
        try { data = JSON.parse(txt) } catch { data = {} }
        if (!res.ok) {
          throw new Error(
            data.error ?? (res.status === 413 ? 'Photo trop lourde pour être envoyée' : `Erreur ${res.status}`)
          )
        }
        sent += data.count ?? batch.length
      } catch (e: unknown) {
        // Un paquet qui casse ne doit pas emporter les suivants : une photo perdue
        // est perdue pour de bon, on tente tous les paquets et on rend les comptes.
        failures.push(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    }

    if (sent === 0) {
      setState('error')
      setMessage(failures[0] ?? "Erreur lors de l'envoi")
      return
    }
    setState('done')
    const base = `${sent} photo${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''} pour ${DAY_LABELS[activeDay]}`
    setMessage(failures.length ? `${base}. ${all.length - sent} n'ont pas pu être envoyées, réessayez.` : base)
  }

  return (
    <main style={{ background: C.ivory, color: C.ink, fontFamily: 'var(--font-body), system-ui, sans-serif' }}>

      {/* HÉRO plein cadre : le faire-part porte déjà prénoms + date. */}
      <section className="relative overflow-hidden" style={{ height: '64vh', minHeight: 420 }}>
        <img src="/accueil/hero.png" alt="Morgane & Cyril" className="mq-zoom absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,13,8,0.2) 0%, rgba(20,13,8,0.6) 100%), linear-gradient(180deg, rgba(20,13,8,0.5), rgba(20,13,8,0.36) 45%, rgba(20,13,8,0.6))' }}
        />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '30%', background: 'linear-gradient(to top, rgba(40,25,18,0.42), transparent)' }} />
        <div className="absolute inset-x-0 flex flex-col items-center fade-in" style={{ bottom: 22, color: '#FBF6EC' }}>
          <span className="uppercase" style={{ fontSize: '0.58rem', letterSpacing: '0.34em' }}>Partagez vos photos</span>
          <span className="drift" style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: 4 }}>↓</span>
        </div>
      </section>

      {/* PARTAGE PAR JOUR */}
      <section className="text-center" style={{ padding: '64px 24px 28px' }}>
        <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.34em', color: C.terra, fontWeight: 600, margin: 0 }}>{COUPLE}</p>
        <h1 className="font-display" style={{ fontWeight: 500, fontSize: 'clamp(2.1rem, 6vw, 2.8rem)', lineHeight: 1.05, margin: '.3em 0 0' }}>Partagez vos photos</h1>
        <p className="font-display italic" style={{ fontSize: '1.05rem', color: '#5d4736', maxWidth: '28ch', margin: '.7em auto 0' }}>
          Choisissez le jour, prenez ou ajoutez vos photos.
        </p>

        {state === 'done' ? (
          <div className="fade-in flex flex-col items-center" style={{ padding: '32px 0 8px' }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: 54, height: 54, border: `1px solid ${C.terra}`, color: C.terra }}>
              <Icon><path d="M20 6 9 17l-5-5" /></Icon>
            </span>
            <p className="font-display italic" style={{ fontSize: '1.4rem', marginTop: 16 }}>{message}</p>
            <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: 6 }}>Visible après validation des mariés.</p>
            <button onClick={() => { setState('idle'); setMessage('') }} className="lift" style={{ marginTop: 22, padding: '11px 26px', borderRadius: 999, background: C.terra, color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
              Envoyer d&apos;autres photos
            </button>
          </div>
        ) : state === 'uploading' ? (
          <div className="fade-in flex flex-col items-center gap-4" style={{ padding: '44px 0' }}>
            <span className="spin rounded-full" style={{ width: 36, height: 36, border: `2px solid ${C.blush}`, borderTopColor: C.terra }} />
            <p style={{ color: C.muted }}>Envoi en cours…</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3.5 mx-auto" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 560, marginTop: 36 }}>
              {DAY_ORDER.map((d) => {
                const active = activeDay === d
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(active ? null : d)}
                    className="relative overflow-hidden"
                    style={{ aspectRatio: '3 / 4', borderRadius: 6, background: '#ece2d4', border: active ? `2px solid ${C.terra}` : '2px solid transparent', cursor: 'pointer' }}
                    aria-pressed={active}
                  >
                    <img src={DAY_PHOTO[d]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 42%, rgba(40,25,18,0.6))' }} />
                    <span className="font-display absolute left-0 right-0" style={{ bottom: 12, color: '#FBF6EC', fontSize: '1.25rem' }}>{DAY_LABELS[d]}</span>
                    <span className="flex items-center justify-center absolute" style={{ top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: active ? C.terra : 'rgba(251,246,236,0.92)', color: active ? '#fff' : C.ink, fontSize: '0.9rem', lineHeight: 1 }}>{active ? '×' : '+'}</span>
                  </button>
                )
              })}
            </div>

            {activeDay && (
              <div className="fade-in mx-auto" style={{ maxWidth: 400, marginTop: 18, padding: 20, borderRadius: 14, background: '#fff', border: `1px solid ${C.blush}`, boxShadow: '0 14px 36px -18px rgba(120,80,50,0.4)' }}>
                <p className="uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: C.terra, marginBottom: 14 }}>{DAY_LABELS[activeDay]} · vos photos</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => camRef.current?.click()} className="lift flex items-center justify-center gap-2.5" style={{ padding: '13px 0', borderRadius: 12, background: C.terra, color: '#fff', fontWeight: 500 }}>
                    <Icon><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></Icon>
                    Prendre une photo
                  </button>
                  <button onClick={() => albRef.current?.click()} className="lift flex items-center justify-center gap-2.5" style={{ padding: '13px 0', borderRadius: 12, border: `1px solid ${C.blush}`, color: C.ink, fontWeight: 500 }}>
                    <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-4.5-4.5L5 22" /></Icon>
                    Joindre une photo
                  </button>
                </div>
                <p style={{ marginTop: 12, color: C.muted, fontSize: '0.7rem' }}>Rangée automatiquement dans « {DAY_LABELS[activeDay]} ».</p>
              </div>
            )}
            {!activeDay && <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: 16 }}>Choisissez d&apos;abord un jour.</p>}

            {state === 'error' && <p style={{ color: '#c0584a', fontSize: '0.85rem', marginTop: 14 }}>{message}</p>}
          </>
        )}

        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={albRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        <div className="flex flex-col items-center" style={{ gap: 10, marginTop: 40 }}>
          <a href="/galerie" className="font-display italic" style={{ color: C.terra, fontSize: '1.05rem' }}>Voir la galerie du mariage →</a>
        </div>

        {APP_URL && (
          <div className="flex flex-col items-center gap-3" style={{ marginTop: 32 }}>
            <div className="rounded-xl" style={{ padding: 12, background: '#fff', border: `1px solid ${C.blush}` }}>
              <QRCode value={APP_URL} size={130} bgColor="#ffffff" fgColor={C.ink} />
            </div>
            <p className="uppercase" style={{ color: C.muted, fontSize: '0.58rem', letterSpacing: '0.24em' }}>Scannez pour partager autour de vous</p>
          </div>
        )}
      </section>

      <footer className="text-center" style={{ background: C.sage, padding: '48px 30px' }}>
        <span className="font-display inline-flex items-center justify-center rounded-full" style={{ width: 56, height: 56, border: `1px solid rgba(74,58,48,0.4)`, fontSize: '1.35rem', color: C.ink }}>
          {WEDDING.initials[0]}<i className="font-display italic" style={{ fontSize: '0.7em', margin: '0 1px' }}>&amp;</i>{WEDDING.initials[1]}
        </span>
        <p className="font-display italic" style={{ fontSize: '1.15rem', color: C.ink, marginTop: 14 }}>{WEDDING.dateLabel}</p>
      </footer>
    </main>
  )
}
