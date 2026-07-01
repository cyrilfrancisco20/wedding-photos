import { timingSafeEqual } from 'crypto'

// Vérification du token modérateur en temps constant : évite de fuir la longueur
// ou le préfixe du mot de passe via le temps de réponse. Utilisé par /api/moderate
// (écritures) et /api/photos (lecture du contenu non-approuvé).
export function validModToken(token: unknown): boolean {
  const expected = process.env.MODERATOR_PASSWORD || ''
  if (typeof token !== 'string' || expected.length === 0) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
