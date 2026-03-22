import { UrgenciaTarefa } from '@prisma/client'
import { cn } from '@/lib/utils'
import { AnimatedBadge } from '@/components/ui/animated-badge'

const urgenciaCores: Record<UrgenciaTarefa, string> = {
  BAIXA:   'bg-gray-100   text-gray-600   border border-gray-200',
  MEDIA:   'bg-blue-100   text-blue-700   border border-blue-200',
  ALTA:    'bg-orange-100 text-orange-700 border border-orange-200',
  CRITICA: 'bg-red-100    text-red-700    border border-red-200',
}

const urgenciaGlow: Record<UrgenciaTarefa, string> = {
  BAIXA:   'rgba(156, 163, 175, 0.9)',  // gray
  MEDIA:   'rgba(59,  130, 246, 0.9)',  // blue
  ALTA:    'rgba(249, 115, 22,  0.9)',  // orange
  CRITICA: 'rgba(239, 68,  68,  0.9)',  // red
}

const urgenciaLabels: Record<UrgenciaTarefa, string> = {
  BAIXA:   'Baixa',
  MEDIA:   'Média',
  ALTA:    'Alta',
  CRITICA: 'Crítica',
}

interface UrgenciaBadgeProps {
  urgencia: UrgenciaTarefa
  className?: string
}

export function UrgenciaBadge({ urgencia, className }: UrgenciaBadgeProps) {
  return (
    <AnimatedBadge
      glowColor={urgenciaGlow[urgencia]}
      className={cn(urgenciaCores[urgencia], className)}
    >
      {urgenciaLabels[urgencia]}
    </AnimatedBadge>
  )
}

export { urgenciaLabels, urgenciaCores }
