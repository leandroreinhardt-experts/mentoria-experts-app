import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const alunos = await prisma.aluno.findMany({
    select: { concursos: true, areasEstudo: true },
  })

  const concursos = Array.from(new Set(alunos.flatMap((a) => a.concursos))).filter(Boolean).sort()
  const areasEstudo = Array.from(new Set(alunos.flatMap((a) => a.areasEstudo))).filter(Boolean).sort()

  return NextResponse.json({ concursos, areasEstudo })
}
