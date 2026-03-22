// ─── Score de risco de churn ──────────────────────────────────────────────────
// Score 0–100 calculado a partir de 4 fatores ponderados

export type NivelRisco = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'

export interface RiscoChurn {
  score: number
  nivel: NivelRisco
  label: string
  fatores: {
    semFollowUp: number    // pontos por dias sem follow-up
    vencimento: number     // pontos por proximidade do vencimento
    semAnalise: number     // pontos por falta de análise recente
    tarefasAtrasadas: number // pontos por tarefas atrasadas
  }
}

export function calcularRiscoChurn(aluno: {
  dataUltimoFollowUp: Date | null | string
  dataVencimento: Date | string
  dataUltimaAnalisePlano?: Date | null | string
  tarefasAtrasadas?: number
  statusAtual?: string
}): RiscoChurn {
  // Não calcular para alunos inativos / aprovados / churn
  if (aluno.statusAtual && aluno.statusAtual !== 'ATIVO') {
    return { score: 0, nivel: 'BAIXO', label: 'N/A', fatores: { semFollowUp: 0, vencimento: 0, semAnalise: 0, tarefasAtrasadas: 0 } }
  }

  const now = new Date()
  const toDate = (d: Date | string | null | undefined) => d ? new Date(d) : null

  // ── Fator 1: dias sem follow-up (0–35 pts) ───────────────────────────────
  const ultimoFollowUp = toDate(aluno.dataUltimoFollowUp)
  const diasSemFollowUp = ultimoFollowUp
    ? Math.floor((now.getTime() - ultimoFollowUp.getTime()) / 864e5)
    : 90 // nunca teve = pior caso
  // 0 dias = 0 pts | 30 dias = 35 pts | ≥45 dias = 35 pts
  const ptFollowUp = Math.min(35, Math.round(diasSemFollowUp * 35 / 30))

  // ── Fator 2: proximidade do vencimento (0–35 pts) ────────────────────────
  const vencimento = toDate(aluno.dataVencimento) ?? now
  const diasAteVencer = Math.floor((vencimento.getTime() - now.getTime()) / 864e5)
  let ptVencimento = 0
  if (diasAteVencer <= 0)   ptVencimento = 35
  else if (diasAteVencer <= 15)  ptVencimento = 30
  else if (diasAteVencer <= 30)  ptVencimento = 20
  else if (diasAteVencer <= 60)  ptVencimento = 10

  // ── Fator 3: sem análise de plano recente (0–20 pts) ─────────────────────
  const ultimaAnalise = toDate(aluno.dataUltimaAnalisePlano)
  const diasSemAnalise = ultimaAnalise
    ? Math.floor((now.getTime() - ultimaAnalise.getTime()) / 864e5)
    : 90
  const ptAnalise = Math.min(20, Math.round(diasSemAnalise * 20 / 45))

  // ── Fator 4: tarefas atrasadas (0–10 pts) ────────────────────────────────
  const ptTarefas = (aluno.tarefasAtrasadas ?? 0) > 0 ? 10 : 0

  const score = Math.min(100, ptFollowUp + ptVencimento + ptAnalise + ptTarefas)

  let nivel: NivelRisco
  let label: string
  if (score >= 75)      { nivel = 'CRITICO'; label = 'Crítico' }
  else if (score >= 50) { nivel = 'ALTO';    label = 'Alto' }
  else if (score >= 25) { nivel = 'MEDIO';   label = 'Médio' }
  else                  { nivel = 'BAIXO';   label = 'Baixo' }

  return {
    score,
    nivel,
    label,
    fatores: {
      semFollowUp: ptFollowUp,
      vencimento: ptVencimento,
      semAnalise: ptAnalise,
      tarefasAtrasadas: ptTarefas,
    },
  }
}

export const riscoConfig: Record<NivelRisco, { bg: string; text: string; border: string; badge: string; bar: string; glow: string }> = {
  BAIXO:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', glow: 'rgba(16, 185, 129, 0.9)'  },
  MEDIO:   { bg: 'bg-yellow-50',   text: 'text-yellow-700',  border: 'border-yellow-200',  badge: 'bg-yellow-100 text-yellow-700',  bar: 'bg-yellow-500',  glow: 'rgba(234, 179, 8, 0.9)'   },
  ALTO:    { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700',  bar: 'bg-orange-500',  glow: 'rgba(249, 115, 22, 0.9)'  },
  CRITICO: { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700',        bar: 'bg-red-500',     glow: 'rgba(239, 68, 68, 0.9)'   },
}
