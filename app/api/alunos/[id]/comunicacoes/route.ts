import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [followUps, analises, comentarios, mudancasFase, tarefasConcluidas] = await Promise.all([
    prisma.followUp.findMany({
      where: { alunoId: params.id },
      include: { responsavel: { select: { id: true, nome: true } } },
      orderBy: { realizadoEm: 'desc' },
    }),
    prisma.analisePlano.findMany({
      where: { alunoId: params.id },
      include: { responsavel: { select: { id: true, nome: true } } },
      orderBy: { realizadaEm: 'desc' },
    }),
    prisma.comentario.findMany({
      where: { alunoId: params.id },
      include: { autor: { select: { id: true, nome: true } } },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.mudancaFase.findMany({
      where: { alunoId: params.id },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.tarefa.findMany({
      where: { alunoId: params.id, status: 'CONCLUIDA' },
      include: { responsavel: { select: { id: true, nome: true } } },
      orderBy: { concluidaEm: 'desc' },
      take: 20,
    }),
  ])

  // Montar timeline unificada
  const eventos: any[] = [
    ...followUps.map((f) => ({
      id: f.id,
      tipo: 'FOLLOWUP',
      titulo: 'Follow-up realizado',
      descricao: f.observacao,
      responsavel: f.responsavel,
      data: f.realizadoEm,
    })),
    ...analises.map((a) => ({
      id: a.id,
      tipo: 'ANALISE',
      titulo: 'Alteração no plano de estudos',
      descricao: a.observacao,
      responsavel: a.responsavel,
      data: a.realizadaEm,
    })),
    ...comentarios.map((c) => ({
      id: c.id,
      tipo: 'COMENTARIO',
      titulo: 'Comentário interno',
      descricao: c.texto,
      responsavel: c.autor,
      data: c.criadoEm,
    })),
    ...mudancasFase.map((m) => ({
      id: m.id,
      tipo: 'FASE',
      titulo: `Fase alterada → ${m.faseNova}`,
      descricao: m.motivo,
      responsavel: null,
      data: m.criadoEm,
      extra: { fasAnterior: m.fasAnterior, faseNova: m.faseNova, automatica: m.automatica },
    })),
    ...tarefasConcluidas.map((t) => ({
      id: t.id,
      tipo: 'TAREFA_CONCLUIDA',
      titulo: `Tarefa concluída: ${t.titulo}`,
      descricao: t.descricao,
      responsavel: t.responsavel,
      data: t.concluidaEm ?? t.atualizadoEm,
    })),
  ]

  // Ordenar por data decrescente
  eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  return NextResponse.json(eventos)
}
