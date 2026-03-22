import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plano, StatusAluno, StatusTarefa, UrgenciaTarefa } from '@prisma/client'
import { calcularRiscoChurn } from '@/lib/churn-risk'

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const now = new Date()
  const em7Dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const em30Dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const ha20Dias = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)
  const ha15Dias = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

  const [followUpsAtrasados, vencendoEm7Dias, tarefasAtrasadas, alunosCandidatos] =
    await Promise.all([
      // Follow-ups atrasados — PRO/ELITE sem follow-up há 20+ dias
      prisma.aluno.findMany({
        where: {
          statusAtual: StatusAluno.ATIVO,
          plano: { in: [Plano.PRO, Plano.ELITE] },
          OR: [
            { dataUltimoFollowUp: { lte: ha20Dias } },
            { dataUltimoFollowUp: null },
          ],
        },
        select: { id: true, nome: true, plano: true, dataUltimoFollowUp: true },
        orderBy: { dataUltimoFollowUp: 'asc' },
        take: 5,
      }),

      // Vencendo em até 7 dias (urgente)
      prisma.aluno.findMany({
        where: {
          statusAtual: StatusAluno.ATIVO,
          dataVencimento: { lte: em7Dias, gte: now },
        },
        select: { id: true, nome: true, plano: true, dataVencimento: true },
        orderBy: { dataVencimento: 'asc' },
        take: 5,
      }),

      // Tarefas atrasadas de alta/crítica urgência
      prisma.tarefa.findMany({
        where: {
          status: { not: StatusTarefa.CONCLUIDA },
          prazo: { lt: now },
          parentId: null,
          urgencia: { in: [UrgenciaTarefa.ALTA, UrgenciaTarefa.CRITICA] },
        },
        select: {
          id: true,
          titulo: true,
          prazo: true,
          urgencia: true,
          aluno: { select: { id: true, nome: true } },
        },
        orderBy: [{ urgencia: 'desc' }, { prazo: 'asc' }],
        take: 5,
      }),

      // Candidatos a risco crítico (vencimento próximo ou follow-up antigo)
      prisma.aluno.findMany({
        where: {
          statusAtual: StatusAluno.ATIVO,
          OR: [
            { dataVencimento: { lte: em30Dias } },
            { dataUltimoFollowUp: { lte: ha15Dias } },
            { dataUltimoFollowUp: null },
          ],
        },
        select: {
          id: true,
          nome: true,
          plano: true,
          dataUltimoFollowUp: true,
          dataVencimento: true,
          dataUltimaAnalisePlano: true,
          _count: {
            select: {
              tarefas: {
                where: {
                  status: { not: StatusTarefa.CONCLUIDA },
                  prazo: { lt: now },
                  parentId: null,
                },
              },
            },
          },
        },
      }),
    ])

  // Calcular risco apenas para os candidatos filtrados
  const criticos = alunosCandidatos
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      plano: a.plano,
      risco: calcularRiscoChurn({
        dataUltimoFollowUp: a.dataUltimoFollowUp,
        dataVencimento: a.dataVencimento,
        dataUltimaAnalisePlano: a.dataUltimaAnalisePlano,
        tarefasAtrasadas: a._count.tarefas,
        statusAtual: 'ATIVO',
      }),
    }))
    .filter((a) => a.risco.nivel === 'CRITICO')
    .sort((a, b) => b.risco.score - a.risco.score)
    .slice(0, 5)
    .map(({ id, nome, plano, risco }) => ({ id, nome, plano, score: risco.score }))

  const total =
    followUpsAtrasados.length +
    vencendoEm7Dias.length +
    tarefasAtrasadas.length +
    criticos.length

  return NextResponse.json({
    followUpsAtrasados,
    vencendoEm7Dias,
    tarefasAtrasadas,
    criticos,
    total,
  })
}
