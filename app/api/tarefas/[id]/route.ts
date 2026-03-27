import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusTarefa } from '@prisma/client'

const tarefaInclude = {
  aluno: { select: { id: true, nome: true, faseAtual: true, plano: true } },
  responsavel: { select: { id: true, nome: true } },
  subtarefas: {
    orderBy: { criadoEm: 'asc' as const },
    include: { responsavel: { select: { id: true, nome: true } } },
  },
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const now = new Date()

  const tarefa = await prisma.tarefa.update({
    where: { id: params.id },
    data: {
      titulo: body.titulo,
      descricao: body.descricao,
      responsavelId: body.responsavelId,
      prazo: body.prazo ? new Date(`${String(body.prazo).substring(0, 10)}T12:00:00.000Z`) : undefined,
      urgencia: body.urgencia,
      status: body.status,
      alunoId: body.alunoId,
      concluidaEm: body.status === StatusTarefa.CONCLUIDA ? (body.concluidaEm ?? now) : null,
    },
    include: tarefaInclude,
  })

  return NextResponse.json(tarefa)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.tarefa.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
