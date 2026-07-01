// Placement nominatif à la table des mariés. Source unique, partagée entre
// /plan-de-table (affichage du plan) et /temoins (« où suis-je placé ? »).
// Tour de table donné par Cyril en partant d'en haut à gauche puis vers la
// droite : côté haut, bout de table à droite, puis côté bas de droite à gauche.

export const HEAD_TABLE_NAME = 'Romanée-Conti'

export const HEAD_TOP = ['Guillaume', 'Marine', 'Michael', 'Benoit', 'Elodie', 'Morgane', 'Cyril', 'Yoan', 'Alexandra', 'Estelle', 'Alexandre', 'Anthony']
export const HEAD_END = 'Laetitia' // bout de table, à droite
// Affiché de gauche à droite ; le tour réel parcourt ce côté de droite à gauche.
export const HEAD_BOTTOM = ['Nathan', 'Audrey', 'Frédéric', 'Roxane', 'Allan', 'Nelly', 'Yannis', 'Jean-Christophe', 'Julie', 'Richard', 'Mathieu', 'Diane']

// Prénoms du déroulé (diminutifs) → prénoms du plan de table.
const TEMOIN_PLAN_NAME: Record<string, string> = { Micka: 'Michael', Fred: 'Frédéric' }
export const planNameFor = (temoin: string) => TEMOIN_PLAN_NAME[temoin] ?? temoin

export type HeadPlace = { side: 'haut' | 'bas' | 'bout'; between: string[] }

// Place d'un convive à la table des mariés (voisins directs inclus), ou null
// s'il n'y est pas assis.
export function headPlace(name: string): HeadPlace | null {
  if (name === HEAD_END) {
    return { side: 'bout', between: [HEAD_TOP[HEAD_TOP.length - 1], HEAD_BOTTOM[HEAD_BOTTOM.length - 1]] }
  }
  const ti = HEAD_TOP.indexOf(name)
  if (ti >= 0) {
    return { side: 'haut', between: [HEAD_TOP[ti - 1], ti === HEAD_TOP.length - 1 ? HEAD_END : HEAD_TOP[ti + 1]].filter(Boolean) }
  }
  const bi = HEAD_BOTTOM.indexOf(name)
  if (bi >= 0) {
    return { side: 'bas', between: [HEAD_BOTTOM[bi - 1], bi === HEAD_BOTTOM.length - 1 ? HEAD_END : HEAD_BOTTOM[bi + 1]].filter(Boolean) }
  }
  return null
}
