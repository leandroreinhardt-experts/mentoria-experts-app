import { FaseMentoria, StatusAluno } from '@prisma/client'
import { daysUntil, daysDiff } from './utils'

export function calcularFase(aluno: {
  dataEntrada: Date
  dataVencimento: Date
  dataProva?: Date | null
  statusAtual: StatusAluno
  faseManualOverride: boolean
  faseAtual: FaseMentoria
}): FaseMentoria {
  // Alunos com status especial ficam fora do fluxo
  if (
    aluno.statusAtual === StatusAluno.APROVADO ||
    aluno.statusAtual === StatusAluno.CHURN ||
    aluno.statusAtual === StatusAluno.INATIVO
  ) {
    return aluno.faseAtual
  }

  // Se foi sobrescrita manualmente, mantém
  if (aluno.faseManualOverride) return aluno.faseAtual

  const diasDeEntrada = daysDiff(aluno.dataEntrada)
  const diasParaVencimento = daysUntil(aluno.dataVencimento)

  // 1. Em onboarding: entrada há menos de 30 dias
  if (diasDeEntrada < 30) return FaseMentoria.ONBOARDING

  // 2. Próximo ao vencimento: vence em menos de 30 dias
  if (diasParaVencimento < 30 && diasParaVencimento >= 0) return FaseMentoria.PROXIMO_VENCIMENTO

  // 3. Em pós-edital: tem data de prova cadastrada
  if (aluno.dataProva) return FaseMentoria.POS_EDITAL

  // 4. Em pré-edital: nenhuma das anteriores
  return FaseMentoria.PRE_EDITAL
}

export const faseCores: Record<FaseMentoria, string> = {
  ONBOARDING: 'bg-blue-100 text-blue-800 border-blue-200',
  PRE_EDITAL: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  POS_EDITAL: 'bg-green-100 text-green-800 border-green-200',
  PROXIMO_VENCIMENTO: 'bg-red-100 text-red-800 border-red-200',
}

export const faseLabels: Record<FaseMentoria, string> = {
  ONBOARDING: 'Onboarding',
  PRE_EDITAL: 'Pré-edital',
  POS_EDITAL: 'Pós-edital',
  PROXIMO_VENCIMENTO: 'Próx. vencimento',
}
