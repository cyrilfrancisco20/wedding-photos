// Jeu de photos factices pour les sessions de design (la base prod est vide hors
// jour J). N'est JAMAIS chargé en prod : les pages ne l'appellent que si l'URL
// contient ?demo. Images = SVG inline en data-URI, zéro requête réseau.

import { MOMENTS, type Bucket } from './schedule'

export type DemoPhoto = {
  id: string
  url: string
  moment: Bucket | null
  taken_at: string | null
  created_at: string
}

// Dégradés chauds variés, pour juger la composition sans vraies photos.
const TONES: [string, string][] = [
  ['#caa27a', '#8a6a4f'], ['#9fae8e', '#5c6b4e'], ['#d8b9a0', '#a87a5c'],
  ['#7e8898', '#3c4862'], ['#e0c89a', '#b8924a'], ['#bfae9a', '#7a6a52'],
  ['#a9b3a0', '#6e7b5e'], ['#d6a98f', '#9a6a4f'], ['#c9b48f', '#8f7a52'],
  ['#aeb9c9', '#5a6478'], ['#cdb59a', '#967654'], ['#b6a282', '#7c6a48'],
]

function tile(i: number): string {
  const [a, b] = TONES[i % TONES.length]
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>` +
    `</linearGradient></defs><rect width="600" height="600" fill="url(#g)"/>` +
    `<text x="50%" y="52%" font-family="Georgia,serif" font-size="120" fill="rgba(255,255,255,0.18)" text-anchor="middle">${i + 1}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Quelques photos par moment, en ordre chronologique plausible.
const COUNTS: Record<string, number> = {
  mairie: 4,
  'soiree-vendredi': 5,
  preparatifs: 6,
  aperitif: 14,
  repas: 9,
  'soiree-samedi': 7,
  brunch: 5,
}

export function demoPhotos(): DemoPhoto[] {
  const out: DemoPhoto[] = []
  let i = 0
  for (const m of MOMENTS) {
    const n = COUNTS[m.id] ?? 0
    const start = Date.parse(m.start)
    const span = Date.parse(m.end) - start
    for (let k = 0; k < n; k++) {
      const t = new Date(start + (span * (k + 1)) / (n + 1)).toISOString()
      out.push({ id: `demo-${i}`, url: tile(i), moment: m.id, taken_at: t, created_at: t })
      i++
    }
  }
  return out
}
