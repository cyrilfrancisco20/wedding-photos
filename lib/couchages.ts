// Dispatching des couchages sur place — source unique (lue par /couchages).
// 51 dormeurs répartis sur 3 bâtiments du Clos des Tourelles : Château, Annexe,
// Gîte. Établi et validé par Cyril (aucun doublon, aucun couple séparé de sa
// chambre). Deux nuits : vendredi et samedi. Trois personnes ne dorment qu'une
// seule des deux nuits (voir `nights`).
//
// Pour corriger une affectation : éditer ICI, la page se met à jour seule.

export type Nights = 'ven' | 'sam' // absent = les deux nuits
export type Person = {
  name: string
  kid?: boolean // enfant (badge)
  nights?: Nights // ne dort qu'une seule nuit
  note?: string // précision de couchage (ex. « matelas »)
}

export type Room = {
  name: string
  floor?: string // étage / niveau
  beds: string // configuration des lits (site du domaine)
  people: Person[]
  spare?: string // lit libre éventuel
}

export type Building = {
  id: string // ancre + clé de carte
  name: string
  accent: string // couleur de la charte, partagée carte ↔ section
  capacity: number // nombre de couchages du bâtiment
  intro: string // repère pour situer le bâtiment
  photo?: string // façade du bâtiment (dans public/couchages/), masquée si absente
  photoFocus?: string // object-position du bandeau (ex. 'center 75%' pour cadrer plus bas)
  rooms: Room[]
}

export const BUILDINGS: Building[] = [
  {
    id: 'chateau',
    name: 'Château',
    accent: '#C77B5E', // terra
    capacity: 26,
    intro: 'Le manoir, à l’est du domaine, isolé dans sa clairière avec l’allée circulaire. Chambres réparties sur les 1er et 2e étages.',
    photo: '/couchages/chateau.jpg',
    rooms: [
      { name: 'Natacha', floor: '1er étage', beds: 'Grande chambre double', people: [{ name: 'Morgane' }, { name: 'Cyril' }] },
      { name: 'Melissa', floor: '1er étage', beds: 'Lit 160', people: [{ name: 'Marine.B' }, { name: 'Guillaume.M' }] },
      { name: 'Victoria', floor: '1er étage', beds: 'Lit à baldaquin 160', people: [{ name: 'Yoan' }, { name: 'Alexandra' }] },
      { name: 'Sophie', floor: '1er étage', beds: 'Lit 160', people: [{ name: 'Elodie' }, { name: 'Benoit.F' }] },
      {
        name: 'Alexandra', floor: '1er étage', beds: '2 lits simples + 1 lit d’appoint',
        people: [{ name: 'Antoine' }, { name: 'Carole' }, { name: 'Charlotte', kid: true }, { name: 'Léon', kid: true, note: 'matelas au sol' }],
      },
      { name: 'Elisabeth', floor: '2e étage', beds: 'Lit 160', people: [{ name: 'Alexandre.R' }, { name: 'Estelle' }] },
      {
        name: 'Katherine', floor: '2e étage', beds: '3 lits simples + 1 lit d’appoint',
        people: [{ name: 'Allan' }, { name: 'Nelly' }, { name: 'Mila', kid: true }, { name: 'Loni', kid: true }],
      },
      {
        name: 'Olivia', floor: '2e étage', beds: '1 lit à baldaquin 160 + 3 lits simples',
        people: [{ name: 'Fredéric' }, { name: 'Roxane.M', nights: 'sam' }, { name: 'Michael.G', nights: 'sam' }, { name: 'Gaelle' }, { name: 'Jérôme' }],
      },
      { name: 'Georgina', floor: '2e étage', beds: 'Lit à baldaquin 160', people: [{ name: 'JC' }, { name: 'Julie.L' }] },
      { name: 'Emily', floor: '2e étage', beds: 'Lit 140', people: [{ name: 'Anthony.C' }, { name: 'Laetitia.C' }] },
    ],
  },
  {
    id: 'annexe',
    name: 'Annexe',
    accent: '#7E9770', // sauge
    capacity: 10,
    intro: 'Le grand bâtiment en L des communs, à l’ouest, face à l’entrée. Chambres familiales au 1er étage et au rez-de-chaussée.',
    photo: '/couchages/annexe.jpg',
    rooms: [
      {
        name: 'Chambre 3 lits', floor: '1er étage', beds: '3 lits simples',
        people: [{ name: 'Sébastien.R' }, { name: 'Liam', kid: true }, { name: 'Lyana', kid: true }],
        spare: '1 lit libre',
      },
      {
        name: 'Chambre 4 lits', floor: '1er étage', beds: '4 lits simples',
        people: [{ name: 'Yannis' }, { name: 'Richard' }, { name: 'Mathieu.D' }, { name: 'Diane' }],
      },
      { name: 'Chambre du rez-de-chaussée', floor: 'RDC', beds: 'Lits simples', people: [{ name: 'Audrey' }, { name: 'Nathan' }] },
    ],
  },
  {
    id: 'gite',
    name: 'Gîte',
    accent: '#8E6E9E', // prune
    capacity: 15,
    intro: 'Le gîte indépendant, à l’écart au sud du domaine, en bordure de la route de Jugy. Deux chambres au rez-de-chaussée, deux à l’étage.',
    photo: '/couchages/gite.jpg',
    photoFocus: 'center 72%',
    rooms: [
      { name: 'Chambre 1', floor: 'RDC', beds: 'Lit double', people: [{ name: 'Murielle' }, { name: 'Lionel.C' }] },
      { name: 'Chambre 2', floor: 'RDC', beds: 'Lit double', people: [{ name: 'Benoit.P' }, { name: 'Chloé' }] },
      {
        name: 'Chambre lit double + simple', floor: 'RDC', beds: '1 lit double + 1 lit simple',
        people: [{ name: 'Joseph' }, { name: 'Véronique.F' }, { name: 'Mémé', nights: 'ven' }],
      },
      {
        name: 'Chambre 2 lits superposés', floor: '1er étage', beds: '2 lits superposés',
        people: [{ name: 'Mathilde' }, { name: 'Donovan' }, { name: 'Manon' }, { name: 'Elian' }],
      },
      {
        name: 'Chambre lit double + superposé', floor: '1er étage', beds: '1 lit double + 1 lit superposé',
        people: [{ name: 'Yoann' }, { name: 'Lexane' }, { name: 'Damien' }, { name: 'Pauline' }],
      },
    ],
  },
]

// Recherche d'une personne par prénom saisi (insensible casse/accents, tolère
// l'initiale de famille : « marine » retrouve « Marine.B »).
export type Found = { person: Person; room: Room; building: Building }

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\s]+/g, ' ').trim()

export function findByName(query: string): Found[] {
  const q = norm(query)
  if (q.length < 2) return []
  const out: Found[] = []
  for (const building of BUILDINGS) {
    for (const room of building.rooms) {
      for (const person of room.people) {
        const n = norm(person.name)
        const first = n.split(' ')[0]
        if (n === q || first === q || n.startsWith(q)) out.push({ person, room, building })
      }
    }
  }
  return out
}

export const TOTAL_SLEEPERS = BUILDINGS.reduce((n, b) => n + b.rooms.reduce((m, r) => m + r.people.length, 0), 0)
