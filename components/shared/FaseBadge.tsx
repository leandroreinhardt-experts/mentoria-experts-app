import { FaseMentoria } from '@prisma/client'
import { cn } from '@/lib/utils'
import { faseCores, faseLabels } from '@/lib/fases'
import { AnimatedBadge } from '@/components/ui/animated-badge'

// Cor do glow por fase (combina com a cor semântica do chip)
const faseGlow: Record<FaseMentoria, string> = {
  ONBOARDING:          'rgba(59,  130, 246, 0.9)',  // blue
  PRE_EDITAL:          'rgba(234, 179, 8,   0.9)',  // yellow
  POS_EDITAL:          'rgba(34,  197, 94,  0.9)',  // green
  PROXIMO_VENCIMENTO:  'rgba(239, 68,  68,  0.9)',  // red
}

interface FaseBadgeProps {
  fase: FaseMentoria
  className?: string
}

export function FaseBadge({ fase, className }: FaseBadgeProps) {
  return (
    <AnimatedBadge
      glowColor={faseGlow[fase]}
      className={cn(faseCores[fase], className)}
    >
      {faseLabels[fase]}
    </AnimatedBadge>
  )
}
