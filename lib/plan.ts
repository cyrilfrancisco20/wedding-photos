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
// Positions (canevas) définies séparément dans app/plan-de-table/page.tsx.
export type RoundTableInfo = { name: string; diameter: 150 | 180; guests: string[] }

export const ROUND_TABLES: RoundTableInfo[] = [
  { name: 'Volnay', diameter: 150, guests: ['Alexandre', 'Ludivine', 'Ludovic', 'Véronique.S', 'Vincent', 'Sebastien.D', 'Véronique.D'] },
  { name: 'Aloxe-Corton', diameter: 150, guests: ['Michaël.S', 'Caroline', 'David', 'Anne', 'Julien', 'Sylwia', 'Christine', 'Patrick'] },
  { name: 'Gevrey-Chambertin', diameter: 150, guests: ['Paulina (Mémé)', 'Eugène', 'Marie', 'Fernande', 'Pascal', 'Leslie', 'Eddy', 'Mélisa'] },
  { name: 'Saint-Aubin', diameter: 180, guests: ['Anne-Emmanuelle', 'Nicolas.Bi', 'Alexia', 'Guilhem', 'Elise', 'William', 'Kévin', 'Katherine', 'Nicolas.Ba', 'Laura'] },
  { name: 'Vosne-Romanée', diameter: 150, guests: ['Yoann', 'Lexane', 'Jérôme', 'Gaëlle', 'Joris', 'Marjorie', 'Emilande', 'Anthony'] },
  { name: 'Clos de Vougeot', diameter: 150, guests: ['Bastien', 'Madysson', 'Jérémy', 'Emilie', 'Tom', 'Priscille', 'Rémy', 'Laurine'] },
  { name: 'Nuits-Saint-Georges', diameter: 150, guests: ['Antoine', 'Carole', 'Zé (Joseph)', 'Véronique', 'Lionel.V', 'Florence.V', 'Mickael.L', 'Florence.L'] },
  { name: 'Musigny', diameter: 150, guests: ['Muriel', 'Lionel.C', 'Mathilde', 'Elian', 'Donovan', 'Manon', 'Sebastien.R'] },
  { name: 'Santenay', diameter: 150, guests: ['Guillaume', 'Cyrielle', 'Aurélien', 'Sophie', 'Renaud', 'Véréna', 'Benoît.P', 'Chloé'] },
  { name: 'Pommard', diameter: 180, guests: ['Nicolas.C', 'Roxane', 'Cindy', 'Romain', 'Ugo', 'Céline', 'Thomas', 'Ludivine.R', 'Bertrand', 'Nathalie'] },
  { name: 'Mercurey', diameter: 150, guests: ['Aurélie', 'Maxence', 'Anthony.M', 'Amandine', 'Pauline', 'Damien'] },
  { name: 'Meursault', diameter: 150, guests: ['Ulrick', 'Marine.M', 'Isabelle', 'Pierre-Philippe', 'Charles', 'Laurence', 'Ibtisseme'] },
  { name: 'Montrachet', diameter: 150, guests: ['Laëtitia.G', 'Etienne', 'Michael.B', 'Camille', 'Marina', 'Valentin', 'Laurent', 'Claire'] },
]
