import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plano, StatusTarefa, TipoTarefa, UrgenciaTarefa } from '@prisma/client'
import { addDaysUtil } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const aluno = await prisma.aluno.findUnique({
    where: { id: params.id },
    select: { id: true, plano: true, responsavelAcompId: true },
  })
  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  const now = new Date()
  const followUp = await prisma.followUp.create({
    data: {
      alunoId: params.id,
      responsavelId: session.user.id,
      observacao: body.observacao,
      realizadoEm: now,
    },
  })

  // Atualizar data do último follow-up
  await prisma.aluno.update({
    where: { id: params.id },
    data: { dataUltimoFollowUp: now },
  })

  // Marcar tarefa de follow-up em aberto como concluída
  await prisma.tarefa.updateMany({
    where: {
      alunoId: params.id,
      tipo: TipoTarefa.FOLLOWUP,
      status: { not: StatusTarefa.CONCLUIDA },
    },
    data: { status: StatusTarefa.CONCLUIDA, concluidaEm: now },
  })

  // Criar próximo follow-up automático (somente PRO/ELITE)
  if (aluno.plano === Plano.PRO || aluno.plano === Plano.ELITE || aluno.plano === Plano.RETA_FINAL) {
    await prisma.tarefa.create({
      data: {
        titulo: 'Realizar follow-up',
        tipo: TipoTarefa.FOLLOWUP,
        alunoId: params.id,
        responsavelId: aluno.responsavelAcompId ?? undefined,
        prazo: addDaysUtil(now, 15),
        urgencia: UrgenciaTarefa.MEDIA,
        status: StatusTarefa.A_FAZER,
      },
    })
  }

  return NextResponse.json(followUp, { status: 201 })
}
