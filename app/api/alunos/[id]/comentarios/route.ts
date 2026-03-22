import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const comentario = await prisma.comentario.create({
    data: {
      alunoId: params.id,
      autorId: session.user.id,
      texto: body.texto,
      mencoes: body.mencoes || [],
    },
    include: {
      autor: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(comentario, { status: 201 })
}
