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

// Tables rondes : source unique des convives par table (liste réelle fournie
// par Cyril, "Sans titre.pages" du 07/07/2026). Diamètre 150 ou 180cm — les
// deux tables à 180 (Saint-Aubin, Pommard) sont les seules à 10 convives.
// Ordre au sein de chaque table = placement au hasard (demandé par Cyril le
// 07/07/2026), tiré une fois puis figé ici — jamais re-tiré au chargement,
// sinon le plan changerait à chaque visite.
// Positions (canevas) définies séparément dans app/plan-de-table/page.tsx.
export type RoundTableInfo = { name: string; diameter: 150 | 180; guests: string[] }

export const ROUND_TABLES: RoundTableInfo[] = [
  { name: 'Volnay', diameter: 150, guests: ['Alexandre', 'Ludovic', 'Vincent', 'Ludivine', 'Véronique.S', 'Sebastien.D', 'Véronique.D'] },
  { name: 'Aloxe-Corton', diameter: 150, guests: ['Christine', 'Anne', 'Sylwia', 'Michaël.S', 'Julien', 'Caroline', 'David', 'Patrick'] },
  { name: 'Gevrey-Chambertin', diameter: 150, guests: ['Mélisa', 'Eddy', 'Marie', 'Leslie', 'Eugène', 'Fernande', 'Pascal', 'Paulina (Mémé)'] },
  { name: 'Saint-Aubin', diameter: 180, guests: ['Guilhem', 'Nicolas.Bi', 'Elise', 'Nicolas.Ba', 'Laura', 'Catherine', 'Anne-Emmanuelle', 'William', 'Alexia', 'Kévin'] },
  { name: 'Vosne-Romanée', diameter: 150, guests: ['Lexane', 'Gaëlle', 'Joris', 'Marjorie', 'Emilande', 'Jérôme', 'Anthony', 'Yoann'] },
  { name: 'Clos de Vougeot', diameter: 150, guests: ['Rémy', 'Emilie', 'Jérémy', 'Madysson', 'Bastien', 'Tom', 'Laurine', 'Priscille'] },
  { name: 'Nuits-Saint-Georges', diameter: 150, guests: ['Mickael.L', 'Carole', 'Zé (Joseph)', 'Véronique', 'Florence.V', 'Antoine', 'Florence.L', 'Lionel.V'] },
  { name: 'Musigny', diameter: 150, guests: ['Elian', 'Lionel.C', 'Muriel', 'Donovan', 'Manon', 'Sebastien.R', 'Mathilde'] },
  { name: 'Santenay', diameter: 150, guests: ['Sophie', 'Benoît.P', 'Véréna', 'Chloé', 'Renaud', 'Cyrielle', 'Guillaume', 'Aurélien'] },
  { name: 'Pommard', diameter: 180, guests: ['Ludivine.R', 'Thomas', 'Cindy', 'Nathalie', 'Nicolas.C', 'Roxane', 'Céline', 'Ugo', 'Romain', 'Bertrand'] },
  { name: 'Mercurey', diameter: 150, guests: ['Amandine', 'Anthony.M', 'Pauline', 'Damien', 'Aurélie', 'Maxence'] },
  { name: 'Meursault', diameter: 150, guests: ['Marine.M', 'Charles', 'Laurence', 'Ulrick', 'Isabelle', 'Ibtisseme', 'Pierre-Philippe'] },
  { name: 'Montrachet', diameter: 150, guests: ['Claire', 'Etienne', 'Valentin', 'Michael.B', 'Laurent', 'Camille', 'Laëtitia.G', 'Marina'] },
]

// Menus spéciaux (demande Cyril du 07/07/2026, orthographe "Catherine"
// confirmée par Cyril le 07/07/2026 après vérification).
export type SpecialMenu = 'enceinte' | 'vege' | 'vegan'
export const SPECIAL_MENUS: Record<string, SpecialMenu> = {
  'Gaëlle': 'enceinte',
  'Nathalie': 'enceinte',
  'Kévin': 'vege',
  'William': 'vege',
  'Elise': 'vege',
  'Catherine': 'vegan',
}
