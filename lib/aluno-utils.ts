import { Plano, StatusAluno, StatusTarefa } from '@prisma/client'
import { prisma } from './prisma'
import { calcularFase } from './fases'
import { getTarefasOnboarding } from './tarefas'

/**
 * Registra a fase inicial de um aluno recém-criado e cria as tarefas de onboarding.
 * Centraliza a lógica que estava duplicada em POST /api/alunos e POST /api/alunos/importar.
 */
export async function inicializarAluno(aluno: {
  id: string
  plano: Plano
  dataEntrada: Date
  dataVencimento: Date
  dataProva: Date | null
  statusAtual: StatusAluno
  faseAtual: import('@prisma/client').FaseMentoria
  faseManualOverride: boolean
  incluiAcessoEstrategia: boolean
}) {
  const faseInicial = calcularFase({
    dataEntrada: aluno.dataEntrada,
    dataVencimento: aluno.dataVencimento,
    dataProva: aluno.dataProva,
    statusAtual: aluno.statusAtual,
    faseManualOverride: aluno.faseManualOverride,
    faseAtual: aluno.faseAtual,
  })

  const updates: Promise<unknown>[] = [
    prisma.mudancaFase.create({
      data: { alunoId: aluno.id, faseNova: faseInicial, automatica: true },
    }),
    prisma.tarefa.createMany({
      data: getTarefasOnboarding(aluno.plano, aluno.incluiAcessoEstrategia, aluno.dataEntrada).map(
        (t) => ({
          titulo: t.titulo,
          tipo: t.tipo,
          alunoId: aluno.id,
          prazo: t.prazo,
          urgencia: t.urgencia,
          status: StatusTarefa.A_FAZER,
        })
      ),
    }),
  ]

  if (faseInicial !== aluno.faseAtual) {
    updates.push(
      prisma.aluno.update({ where: { id: aluno.id }, data: { faseAtual: faseInicial } })
    )
  }

  await Promise.all(updates)

  return faseInicial
}
