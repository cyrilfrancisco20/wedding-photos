import type { Metadata } from 'next'
import { COUPLE } from '@/lib/wedding'

// Plan de table : pas d'indexation, lien discret depuis /temoins uniquement.
export const metadata: Metadata = {
  title: `Plan de table · ${COUPLE}`,
  description: 'Le plan de table du dîner.',
  robots: { index: false, follow: false },
}

export default function PlanDeTableLayout({ children }: { children: React.ReactNode }) {
  return children
}
