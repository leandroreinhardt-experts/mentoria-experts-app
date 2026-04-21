import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; followupId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const followUp = await prisma.followUp.update({
    where: { id: params.followupId },
    data: { observacao: body.observacao },
  })

  return NextResponse.json(followUp)
}
