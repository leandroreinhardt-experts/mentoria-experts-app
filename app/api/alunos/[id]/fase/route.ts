import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FaseMentoria } from '@prisma/client'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { faseNova, motivo } = body as { faseNova: FaseMentoria; motivo: string }

  const aluno = await prisma.aluno.findUnique({ where: { id: params.id } })
  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  const [alunoAtualizado] = await prisma.$transaction([
    prisma.aluno.update({
      where: { id: params.id },
      data: { faseAtual: faseNova, faseManualOverride: true },
    }),
    prisma.mudancaFase.create({
      data: {
        alunoId: params.id,
        fasAnterior: aluno.faseAtual,
        faseNova,
        motivo,
        automatica: false,
        autorId: session.user.id,
      },
    }),
  ])

  return NextResponse.json(alunoAtualizado)
}
