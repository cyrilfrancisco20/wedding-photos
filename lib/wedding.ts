// Identité du couple — source unique. Toutes les surfaces (galerie, projection,
// upload, modérateur) lisent ce fichier. Pour un autre mariage, éditer ici.

export const WEDDING = {
  name1: 'Morgane',
  name2: 'Cyril',
  initials: ['M', 'C'] as const, // monogramme du sceau
  dateLabel: '11 juillet 2026',
} as const

export const COUPLE = `${WEDDING.name1} & ${WEDDING.name2}`
