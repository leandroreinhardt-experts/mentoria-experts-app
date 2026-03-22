import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NivelAcesso } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const membros = await prisma.membroEquipe.findMany({
    orderBy: { criadoEm: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      cargo: true,
      nivelAcesso: true,
      ativo: true,
      criadoEm: true,
    },
  })

  return NextResponse.json(membros)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (session.user.nivelAcesso !== NivelAcesso.ADMIN) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()

  const existing = await prisma.membroEquipe.findUnique({ where: { email: body.email } })
  if (existing) return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })

  const senhaHash = await bcrypt.hash(body.senha, 12)

  const membro = await prisma.membroEquipe.create({
    data: {
      nome: body.nome,
      email: body.email,
      senha: senhaHash,
      cargo: body.cargo,
      nivelAcesso: body.nivelAcesso || NivelAcesso.MEMBRO,
    },
    select: { id: true, nome: true, email: true, cargo: true, nivelAcesso: true, ativo: true },
  })

  return NextResponse.json(membro, { status: 201 })
}
