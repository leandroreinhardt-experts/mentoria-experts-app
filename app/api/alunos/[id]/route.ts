import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const aluno = await prisma.aluno.findUnique({
    where: { id: params.id },
    include: {
      responsavelAcomp: { select: { id: true, nome: true, cargo: true } },
      tarefas: {
        where: { parentId: null },
        orderBy: { criadoEm: 'desc' },
        include: {
          responsavel: { select: { id: true, nome: true } },
          subtarefas: {
            orderBy: { criadoEm: 'asc' },
            include: { responsavel: { select: { id: true, nome: true } } },
          },
        },
      },
      followUps: {
        orderBy: { realizadoEm: 'desc' },
        include: { responsavel: { select: { id: true, nome: true } } },
      },
      analisesPlanos: {
        orderBy: { realizadaEm: 'desc' },
        include: { responsavel: { select: { id: true, nome: true } } },
      },
      mudancasFase: { orderBy: { criadoEm: 'desc' } },
      comentarios: {
        orderBy: { criadoEm: 'desc' },
        include: { autor: { select: { id: true, nome: true } } },
      },
      registroChurn: true,
      registroAprovacao: true,
    },
  })

  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  return NextResponse.json(aluno)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const aluno = await prisma.aluno.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      email: body.email,
      whatsapp: body.whatsapp,
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : undefined,
      plano: body.plano,
      cursoPrincipal: body.cursoPrincipal,
      plataformaQuestoes: body.plataformaQuestoes,
      areaEstudo: body.areaEstudo,
      dataProva: body.dataProva ? new Date(body.dataProva) : null,
      linkTutory: body.linkTutory,
      incluiAcessoEstrategia: body.incluiAcessoEstrategia,
      onboardingRespostas: body.onboardingRespostas,
      responsavelAcompId: body.responsavelAcompId !== undefined
        ? (body.responsavelAcompId || null)
        : undefined,
    },
    include: { responsavelAcomp: { select: { id: true, nome: true, cargo: true } } },
  })

  return NextResponse.json(aluno)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.aluno.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
