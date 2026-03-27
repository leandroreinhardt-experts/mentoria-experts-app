import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusTarefa, TipoTarefa, UrgenciaTarefa, Prisma } from '@prisma/client'
import { calcularUrgenciaEscalada } from '@/lib/tarefas'

const tarefaInclude = {
  aluno: { select: { id: true, nome: true, faseAtual: true, plano: true } },
  responsavel: { select: { id: true, nome: true } },
  subtarefas: {
    orderBy: { criadoEm: 'asc' as const },
    include: {
      responsavel: { select: { id: true, nome: true } },
    },
  },
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const responsavelId = searchParams.get('responsavelId')
  const alunoId = searchParams.get('alunoId')
  const urgencia = searchParams.get('urgencia')
  const tipo = searchParams.get('tipo')

  const where: Prisma.TarefaWhereInput = {
    parentId: null, // Retornar apenas tarefas principais (não subtarefas)
  }
  if (status) where.status = status as StatusTarefa
  if (responsavelId) where.responsavelId = responsavelId
  if (alunoId) where.alunoId = alunoId
  if (urgencia) where.urgencia = urgencia as UrgenciaTarefa
  if (tipo) where.tipo = tipo as TipoTarefa

  const tarefas = await prisma.tarefa.findMany({
    where,
    orderBy: [{ prazo: 'asc' }, { criadoEm: 'desc' }],
    include: tarefaInclude,
  })

  // Escalada automática de urgência — agrupada por nível para evitar race condition
  const porNivel = new Map<UrgenciaTarefa, string[]>()
  for (const t of tarefas) {
    if (!t.prazo || t.status === StatusTarefa.CONCLUIDA) continue
    const novaUrgencia = calcularUrgenciaEscalada(t.prazo, t.urgencia)
    if (novaUrgencia !== t.urgencia) {
      const ids = porNivel.get(novaUrgencia) ?? []
      ids.push(t.id)
      porNivel.set(novaUrgencia, ids)
    }
  }

  // Fire-and-forget: não bloqueia a resposta
  if (porNivel.size > 0) {
    Promise.all(
      Array.from(porNivel.entries()).map(([urgencia, ids]) =>
        prisma.tarefa.updateMany({
          where: { id: { in: ids } },
          data: { urgencia, urgenciaAjustadaAutomaticamente: true },
        })
      )
    ).catch(() => {})
  }

  return NextResponse.json(tarefas)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const tarefa = await prisma.tarefa.create({
    data: {
      titulo: body.titulo,
      descricao: body.descricao,
      tipo: TipoTarefa.MANUAL,
      alunoId: body.alunoId || null,
      responsavelId: body.responsavelId || session.user.id,
      prazo: body.prazo ? new Date(`${String(body.prazo).substring(0, 10)}T12:00:00.000Z`) : null,
      urgencia: body.urgencia || UrgenciaTarefa.MEDIA,
      status: StatusTarefa.A_FAZER,
      parentId: body.parentId || null,
    },
    include: tarefaInclude,
  })

  return NextResponse.json(tarefa, { status: 201 })
}
