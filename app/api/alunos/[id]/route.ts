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

// Converte string "YYYY-MM-DD" para Date ao meio-dia UTC, evitando
// que a conversão de fuso horário (UTC→BRT) mude o dia exibido.
function parseDateOnly(str: string | null | undefined): Date | null {
  if (!str) return null
  // "YYYY-MM-DD" → adiciona T12:00:00Z (meio-dia UTC = 09:00 BRT, mesmo dia)
  return new Date(`${str.substring(0, 10)}T12:00:00.000Z`)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const aluno = await prisma.aluno.update({
    where: { id: params.id },
    data: {
      ...(body.nome              !== undefined && { nome: body.nome }),
      ...(body.cpf               !== undefined && { cpf: body.cpf }),
      ...(body.email             !== undefined && { email: body.email || null }),
      ...(body.whatsapp          !== undefined && { whatsapp: body.whatsapp || null }),
      ...(body.dataEntrada       !== undefined && { dataEntrada: parseDateOnly(body.dataEntrada)! }),
      ...(body.dataVencimento    !== undefined && { dataVencimento: parseDateOnly(body.dataVencimento)! }),
      ...(body.plano             !== undefined && { plano: body.plano }),
      ...(body.statusAtual       !== undefined && { statusAtual: body.statusAtual }),
      ...(body.cursoPrincipal    !== undefined && { cursoPrincipal: body.cursoPrincipal || null }),
      ...(body.plataformaQuestoes !== undefined && { plataformaQuestoes: body.plataformaQuestoes || null }),
      ...(body.areaEstudo        !== undefined && { areaEstudo: body.areaEstudo || null }),
      ...(body.dataProva         !== undefined && { dataProva: parseDateOnly(body.dataProva) }),
      ...(body.linkTutory        !== undefined && { linkTutory: body.linkTutory || null }),
      ...(body.incluiAcessoEstrategia !== undefined && { incluiAcessoEstrategia: body.incluiAcessoEstrategia }),
      ...(body.onboardingRespostas !== undefined && { onboardingRespostas: body.onboardingRespostas }),
      ...(body.responsavelAcompId !== undefined && { responsavelAcompId: body.responsavelAcompId || null }),
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
