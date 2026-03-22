import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusAluno } from '@prisma/client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const [aluno] = await prisma.$transaction([
    prisma.aluno.update({
      where: { id: params.id },
      data: { statusAtual: StatusAluno.APROVADO },
    }),
    prisma.registroAprovacao.upsert({
      where: { alunoId: params.id },
      create: {
        alunoId: params.id,
        concurso: body.concurso,
        dataAprovacao: new Date(body.dataAprovacao),
        observacao: body.observacao,
      },
      update: {
        concurso: body.concurso,
        dataAprovacao: new Date(body.dataAprovacao),
        observacao: body.observacao,
      },
    }),
  ])

  return NextResponse.json(aluno)
}
