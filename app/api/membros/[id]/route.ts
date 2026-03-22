import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NivelAcesso, Prisma } from '@prisma/client'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Somente admins podem editar outros membros; membros podem editar a si mesmo
  const isAdmin = session.user.nivelAcesso === NivelAcesso.ADMIN
  const isSelf = session.user.id === params.id
  if (!isAdmin && !isSelf) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const data: Prisma.MembroEquipeUpdateInput = {
    nome: body.nome,
    cargo: body.cargo,
  }

  if (isAdmin) {
    data.nivelAcesso = body.nivelAcesso
    data.ativo = body.ativo
  }

  if (body.novaSenha) {
    data.senha = await bcrypt.hash(body.novaSenha, 12)
  }

  const membro = await prisma.membroEquipe.update({
    where: { id: params.id },
    data,
    select: { id: true, nome: true, email: true, cargo: true, nivelAcesso: true, ativo: true },
  })

  return NextResponse.json(membro)
}
