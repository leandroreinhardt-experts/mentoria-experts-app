import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MotivoChurn, StatusAluno } from '@prisma/client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const aluno = await prisma.aluno.findUnique({ where: { id: params.id }, select: { statusAtual: true } })
  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  if (aluno.statusAtual === StatusAluno.CHURN) {
    return NextResponse.json({ error: 'Aluno já está em churn' }, { status: 409 })
  }

  const [alunoAtualizado] = await prisma.$transaction([
    prisma.aluno.update({
      where: { id: params.id },
      data: { statusAtual: StatusAluno.CHURN },
    }),
    prisma.registroChurn.upsert({
      where: { alunoId: params.id },
      create: {
        alunoId: params.id,
        motivo: body.motivo as MotivoChurn,
        observacao: body.observacao,
        dataChurn: new Date(),
      },
      update: {
        motivo: body.motivo as MotivoChurn,
        observacao: body.observacao,
        dataChurn: new Date(),
      },
    }),
  ])

  return NextResponse.json(alunoAtualizado)
}
