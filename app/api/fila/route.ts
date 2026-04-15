import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plano, StatusAluno } from '@prisma/client'

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const now = new Date()
  const ha15Dias = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
  const ha20Dias = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)

  // Alunos PRO/ELITE ativos com follow-up atrasado (15+ dias)
  const alunosPendentes = await prisma.aluno.findMany({
    where: {
      statusAtual: StatusAluno.ATIVO,
      plano: { in: [Plano.PRO, Plano.ELITE, Plano.RETA_FINAL] },
      OR: [
        { dataUltimoFollowUp: { lte: ha15Dias } },
        { dataUltimoFollowUp: null },
      ],
    },
    orderBy: { dataUltimoFollowUp: 'asc' },
    select: {
      id: true,
      nome: true,
      plano: true,
      faseAtual: true,
      dataUltimoFollowUp: true,
      dataUltimaAnalisePlano: true,
      dataProva: true,
      responsavelAcompId: true,
      responsavelAcomp: { select: { id: true, nome: true, cargo: true } },
    },
  })

  // Calcular slots diários: total PRO+ELITE ÷ 15, arredondado para cima
  const totalProElite = await prisma.aluno.count({
    where: {
      statusAtual: StatusAluno.ATIVO,
      plano: { in: [Plano.PRO, Plano.ELITE, Plano.RETA_FINAL] },
    },
  })
  const maxDiario = Math.ceil(totalProElite / 15)

  // Marcar urgentes (20+ dias)
  const comUrgencia = alunosPendentes.map((a) => {
    const diasSemFollowUp = a.dataUltimoFollowUp
      ? Math.floor((now.getTime() - a.dataUltimoFollowUp.getTime()) / (1000 * 60 * 60 * 24))
      : 999
    return {
      ...a,
      diasSemFollowUp,
      urgente: diasSemFollowUp >= 20,
    }
  })

  // Urgentes primeiro, depois por dias sem follow-up
  const ordenados = comUrgencia.sort((a, b) => {
    if (a.urgente && !b.urgente) return -1
    if (!a.urgente && b.urgente) return 1
    return b.diasSemFollowUp - a.diasSemFollowUp
  })

  // Mostrar apenas o slot do dia
  const filaDoDia = ordenados.slice(0, maxDiario)

  return NextResponse.json({ filaDoDia, maxDiario, totalPendentes: alunosPendentes.length })
}
