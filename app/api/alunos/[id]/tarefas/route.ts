import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusTarefa, TipoTarefa, UrgenciaTarefa } from '@prisma/client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const tarefa = await prisma.tarefa.create({
    data: {
      titulo: body.titulo,
      descricao: body.descricao,
      tipo: TipoTarefa.MANUAL,
      alunoId: params.id,
      responsavelId: body.responsavelId || session.user.id,
      prazo: body.prazo ? new Date(body.prazo) : null,
      urgencia: body.urgencia || UrgenciaTarefa.MEDIA,
      status: StatusTarefa.A_FAZER,
    },
    include: {
      responsavel: { select: { id: true, nome: true } },
      aluno: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(tarefa, { status: 201 })
}
