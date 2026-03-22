import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inicializarAluno } from '@/lib/aluno-utils'
import { calcularRiscoChurn } from '@/lib/churn-risk'
import { StatusTarefa } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const fase = searchParams.get('fase') || ''
  const plano = searchParams.get('plano') || ''
  const status = searchParams.get('status') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { cpf: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (fase) where.faseAtual = fase
  if (plano) where.plano = plano
  if (status) where.statusAtual = status

  const now = new Date()

  const [total, alunosRaw] = await Promise.all([
    prisma.aluno.count({ where }),
    prisma.aluno.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        nome: true,
        cpf: true,
        email: true,
        whatsapp: true,
        plano: true,
        statusAtual: true,
        faseAtual: true,
        dataEntrada: true,
        dataVencimento: true,
        dataProva: true,
        dataUltimoFollowUp: true,
        dataUltimaAnalisePlano: true,
        faseManualOverride: true,
        cursoPrincipal: true,
        areaEstudo: true,
        responsavelAcomp: { select: { id: true, nome: true } },
        _count: {
          select: {
            tarefas: {
              where: { status: { not: StatusTarefa.CONCLUIDA }, prazo: { lt: now }, parentId: null },
            },
          },
        },
      },
    }),
  ])

  const alunos = alunosRaw.map((a) => {
    const { _count, ...rest } = a
    const risco = calcularRiscoChurn({
      dataUltimoFollowUp: a.dataUltimoFollowUp,
      dataVencimento: a.dataVencimento,
      dataUltimaAnalisePlano: a.dataUltimaAnalisePlano,
      tarefasAtrasadas: _count.tarefas,
      statusAtual: a.statusAtual,
    })
    return { ...rest, tarefasAtrasadas: _count.tarefas, riscoChurn: risco }
  })

  return NextResponse.json({ alunos, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  // Verificar CPF duplicado
  const existing = await prisma.aluno.findUnique({ where: { cpf: body.cpf } })
  if (existing) {
    return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 409 })
  }

  const dataEntrada = new Date(body.dataEntrada)
  const dataVencimento = new Date(body.dataVencimento)

  const aluno = await prisma.aluno.create({
    data: {
      nome: body.nome,
      cpf: body.cpf.replace(/\D/g, ''),
      email: body.email,
      whatsapp: body.whatsapp,
      dataEntrada,
      dataVencimento,
      plano: body.plano,
      cursoPrincipal: body.cursoPrincipal,
      plataformaQuestoes: body.plataformaQuestoes,
      areaEstudo: body.areaEstudo,
      dataProva: body.dataProva ? new Date(body.dataProva) : null,
      linkTutory: body.linkTutory,
      incluiAcessoEstrategia: body.incluiAcessoEstrategia ?? false,
      onboardingRespostas: body.onboardingRespostas,
    },
  })

  await inicializarAluno(aluno)

  return NextResponse.json(aluno, { status: 201 })
}
