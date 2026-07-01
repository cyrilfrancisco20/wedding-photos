import { WEDDING } from '@/lib/wedding'

// Sceau M&C en or — filigrane partagé par l'accueil, la galerie et la projection.
export function Seal({ size }: { size: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, border: '1px solid var(--or)' }}
      aria-hidden="true"
    >
      <span className="font-display flex items-baseline" style={{ color: 'var(--or)', fontSize: size * 0.42, letterSpacing: '0.02em' }}>
        {WEDDING.initials[0]}
        <span className="font-display italic" style={{ fontSize: size * 0.26, margin: '0 1px' }}>&amp;</span>
        {WEDDING.initials[1]}
      </span>
    </span>
  )
}
