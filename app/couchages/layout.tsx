import type { Metadata } from 'next'
import { COUPLE } from '@/lib/wedding'

// Dispatching des chambres : pas d'indexation. Accessible via le lien discret
// depuis l'accueil et le déroulé des témoins.
export const metadata: Metadata = {
  title: `Où dormez-vous ? · ${COUPLE}`,
  description: 'Le dispatching des chambres sur place : château, annexe et gîte.',
  robots: { index: false, follow: false },
}

export default function CouchagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
