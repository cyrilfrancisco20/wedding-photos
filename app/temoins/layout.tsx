import type { Metadata } from 'next'
import { COUPLE } from '@/lib/wedding'

// Page réservée aux témoins : pas d'indexation, pas de lien depuis l'accueil.
export const metadata: Metadata = {
  title: `Déroulé du jour J · ${COUPLE}`,
  description: 'Le déroulé minute par minute, réservé aux témoins.',
  robots: { index: false, follow: false },
}

export default function TemoinsLayout({ children }: { children: React.ReactNode }) {
  return children
}
