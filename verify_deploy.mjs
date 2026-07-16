import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const SITE = 'https://wedding-photos-phi-beige.vercel.app'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const magic = b => [...b.subarray(0,6)].map(x=>x.toString(16).padStart(2,'0')).join(' ')

const img = fs.readFileSync(process.argv[2])
const fd = new FormData()
fd.append('moment', 'dimanche')
fd.append('files', new Blob([new Uint8Array(img)], { type: 'image/jpeg' }), 'verify-test.jpg')

// Empreinte des lignes existantes AVANT l'upload. Ne jamais identifier la ligne
// de test par « la plus recente » : si l'upload echoue, ca designe une vraie photo
// d'invite et le nettoyage plus bas la supprime definitivement.
const { data: before } = await admin.from('photos').select('id')
const knownIds = new Set((before ?? []).map((r) => r.id))

const t0 = Date.now()
const res = await fetch(`${SITE}/api/upload`, { method: 'POST', body: fd })
const body = await res.json()
console.log('UPLOAD http', res.status, JSON.stringify(body), `| ${Date.now() - t0} ms`)

// La ligne de test = la seule dont l'id n'existait pas avant. Zero ambiguite.
const { data: after } = await admin.from('photos').select('id, filename, status, created_at')
const fresh = (after ?? []).filter((r) => !knownIds.has(r.id))
if (fresh.length !== 1) {
  console.log(`ABANDON : ${fresh.length} ligne(s) nouvelle(s) au lieu d'1. Aucun nettoyage, rien supprime.`)
  process.exit(1)
}
const row = fresh[0]
console.log('DB row:', row.filename, 'status=', row.status)

const signed = await admin.storage.from('Photos').createSignedUrl(row.filename, 120)
const back = Buffer.from(await (await fetch(signed.data.signedUrl)).arrayBuffer())
const ok = back[0]===0xff && back[1]===0xd8
console.log('STORED magic:', magic(back), '| valid JPEG:', ok, '| len', back.length)

// Nettoyage : storage (plein + vignette) + ligne DB
const thumb = row.filename.replace(/\.[^./]+$/, '.thumb.jpg')
await admin.storage.from('Photos').remove([row.filename, thumb])
await admin.from('photos').delete().eq('id', row.id)
console.log('CLEANUP: fichier + vignette + ligne DB supprimes')
console.log(ok ? '\n>>> FIX CONFIRME : le fichier stocke est un vrai JPEG.' : '\n>>> ENCORE CORROMPU (deploy pas pret, ou fix insuffisant).')
