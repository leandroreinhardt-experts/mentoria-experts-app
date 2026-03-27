import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const analises = await prisma.analisePlano.findMany({
    where: { alunoId: params.id },
    orderBy: { realizadaEm: 'desc' },
    include: { responsavel: { select: { id: true, nome: true } } },
  })

  return NextResponse.json(analises)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const realizadaEm = body.realizadaEm ? new Date(body.realizadaEm) : new Date()
  const responsavelId = body.responsavelId || session.user.id

  const analise = await prisma.analisePlano.create({
    data: {
      alunoId: params.id,
      responsavelId,
      observacao: body.observacao,
      realizadaEm,
    },
  })

  await prisma.aluno.update({
    where: { id: params.id },
    data: { dataUltimaAnalisePlano: realizadaEm },
  })

  return NextResponse.json(analise, { status: 201 })
}
