import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusAluno, StatusTarefa } from '@prisma/client'
import { calcularRiscoChurn } from '@/lib/churn-risk'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search        = searchParams.get('search') || ''
  const plano         = searchParams.get('plano') || ''
  const responsavelId = searchParams.get('responsavelId') || ''

  const where: any = { statusAtual: StatusAluno.ATIVO }

  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { cpf: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (plano) where.plano = plano
  if (responsavelId) where.responsavelAcompId = responsavelId

  const now = new Date()

  const alunosRaw = await prisma.aluno.findMany({
    where,
    orderBy: { dataVencimento: 'asc' },
    select: {
      id: true,
      nome: true,
      plano: true,
      faseAtual: true,
      statusAtual: true,
      dataEntrada: true,
      dataVencimento: true,
      dataUltimoFollowUp: true,
      dataUltimaAnalisePlano: true,
      cursoPrincipal: true,
      areaEstudo: true,
      dataProva: true,
      responsavelAcomp: { select: { id: true, nome: true } },
      _count: {
        select: {
          tarefas: {
            where: { status: { not: StatusTarefa.CONCLUIDA }, prazo: { lt: now }, parentId: null },
          },
        },
      },
    },
  })

  const alunos = alunosRaw.map((a) => {
    const { _count, ...rest } = a
    const riscoChurn = calcularRiscoChurn({
      dataUltimoFollowUp: a.dataUltimoFollowUp,
      dataVencimento: a.dataVencimento,
      dataUltimaAnalisePlano: a.dataUltimaAnalisePlano,
      tarefasAtrasadas: _count.tarefas,
      statusAtual: a.statusAtual,
    })
    return { ...rest, tarefasAtrasadas: _count.tarefas, riscoChurn }
  })

  return NextResponse.json({ alunos, total: alunos.length })
}
