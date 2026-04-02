import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plano, StatusAluno, StatusTarefa } from '@prisma/client'
import { calcularRiscoChurn } from '@/lib/churn-risk'

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const now = new Date()

  // Hoje em horário de Brasília (UTC-3)
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000
  const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS)
  const hojeBRTAno  = nowBRT.getUTCFullYear()
  const hojeBRTMes  = nowBRT.getUTCMonth()
  const hojeBRTDia  = nowBRT.getUTCDate()
  // 00:00 BRT = 03:00 UTC ; 23:59:59 BRT = 02:59:59 UTC do dia seguinte
  const hojeInicio  = new Date(Date.UTC(hojeBRTAno, hojeBRTMes, hojeBRTDia,  3,  0,  0))
  const hojeFim     = new Date(Date.UTC(hojeBRTAno, hojeBRTMes, hojeBRTDia + 1, 2, 59, 59))

  // Períodos
  const inicioMes        = new Date(now.getFullYear(), now.getMonth(), 1)
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const fimMesAnterior   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const seisMesesAtras   = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const em30Dias         = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const em15Dias         = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const ha20Dias         = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)

  const [
    // ── Métricas atuais ──────────────────────────────────────
    totalAtivos,
    novosNoMes,
    churnsNoMes,
    totalAprovados,
    proAtivos,
    startAtivos,
    eliteAtivos,
    distribuicaoFases,

    // ── Alertas existentes ───────────────────────────────────
    followUpsAtrasados,
    vencendoEm15Dias,
    tarefasAtrasadas,
    provasEm30Dias,

    // ── Risco de churn ───────────────────────────────────────
    alunosAtivosParaRisco,

    // ── Tendências (mês anterior) ────────────────────────────
    novosNoMesAnterior,
    churnsNoMesAnterior,
    aprovadosNoMes,
    aprovadosNoMesAnterior,

    // ── Histórico 6 meses ────────────────────────────────────
    entrantesHistorico,
    churnsHistorico,

    // ── Hoje ─────────────────────────────────────────────────
    tarefasHoje,
    tarefasEmAndamento,

    // ── Produtividade do time ────────────────────────────────
    followUpsDoMes,
    analisesDoMes,
    tarefasAtrasadasGrupo,
    membrosAtivos,
  ] = await Promise.all([
    // ── Métricas atuais ──────────────────────────────────────
    prisma.aluno.count({ where: { statusAtual: StatusAluno.ATIVO } }),
    prisma.aluno.count({ where: { dataEntrada: { gte: inicioMes } } }),
    prisma.registroChurn.count({ where: { dataChurn: { gte: inicioMes } } }),
    prisma.registroAprovacao.count(),
    prisma.aluno.count({ where: { statusAtual: StatusAluno.ATIVO, plano: Plano.PRO } }),
    prisma.aluno.count({ where: { statusAtual: StatusAluno.ATIVO, plano: Plano.START } }),
    prisma.aluno.count({ where: { statusAtual: StatusAluno.ATIVO, plano: Plano.ELITE } }),
    prisma.aluno.groupBy({
      by: ['faseAtual'],
      where: { statusAtual: StatusAluno.ATIVO },
      _count: true,
    }),

    // ── Alertas existentes ───────────────────────────────────
    prisma.aluno.findMany({
      where: {
        statusAtual: StatusAluno.ATIVO,
        plano: { in: [Plano.PRO, Plano.ELITE] },
        OR: [{ dataUltimoFollowUp: { lte: ha20Dias } }, { dataUltimoFollowUp: null }],
      },
      select: { id: true, nome: true, plano: true, dataUltimoFollowUp: true, faseAtual: true },
      take: 10,
    }),
    prisma.aluno.findMany({
      where: { statusAtual: StatusAluno.ATIVO, dataVencimento: { lte: em15Dias, gte: now } },
      select: { id: true, nome: true, plano: true, dataVencimento: true },
      take: 10,
    }),
    prisma.tarefa.findMany({
      where: { status: { not: StatusTarefa.CONCLUIDA }, prazo: { lt: now }, parentId: null },
      select: {
        id: true, titulo: true, prazo: true, urgencia: true,
        responsavel: { select: { id: true, nome: true } },
        aluno: { select: { id: true, nome: true } },
      },
      orderBy: { prazo: 'asc' },
      take: 50,
    }),
    prisma.aluno.findMany({
      where: { statusAtual: StatusAluno.ATIVO, dataProva: { gte: now, lte: em30Dias } },
      select: { id: true, nome: true, dataProva: true, areaEstudo: true },
      take: 10,
    }),

    // ── Risco de churn ───────────────────────────────────────
    prisma.aluno.findMany({
      where: { statusAtual: StatusAluno.ATIVO },
      select: {
        id: true, nome: true, plano: true, faseAtual: true,
        dataUltimoFollowUp: true, dataVencimento: true, dataUltimaAnalisePlano: true,
        responsavelAcomp: { select: { id: true, nome: true } },
        _count: {
          select: {
            tarefas: { where: { status: { not: StatusTarefa.CONCLUIDA }, prazo: { lt: now }, parentId: null } },
          },
        },
      },
    }),

    // ── Tendências ───────────────────────────────────────────
    prisma.aluno.count({ where: { dataEntrada: { gte: inicioMesAnterior, lte: fimMesAnterior } } }),
    prisma.registroChurn.count({ where: { dataChurn: { gte: inicioMesAnterior, lte: fimMesAnterior } } }),
    prisma.registroAprovacao.count({ where: { dataAprovacao: { gte: inicioMes } } }),
    prisma.registroAprovacao.count({ where: { dataAprovacao: { gte: inicioMesAnterior, lte: fimMesAnterior } } }),

    // ── Histórico 6 meses ────────────────────────────────────
    prisma.aluno.findMany({
      where: { dataEntrada: { gte: seisMesesAtras } },
      select: { dataEntrada: true },
    }),
    prisma.registroChurn.findMany({
      where: { dataChurn: { gte: seisMesesAtras } },
      select: { dataChurn: true },
    }),

    // ── Tarefas de hoje ──────────────────────────────────────
    prisma.tarefa.findMany({
      where: {
        status: { not: StatusTarefa.CONCLUIDA },
        prazo: { gte: hojeInicio, lte: hojeFim },
        parentId: null,
      },
      select: {
        id: true, titulo: true, prazo: true, urgencia: true,
        responsavel: { select: { id: true, nome: true } },
        aluno: { select: { id: true, nome: true } },
      },
      orderBy: [{ urgencia: 'desc' }, { prazo: 'asc' }],
      take: 10,
    }),

    // ── Tarefas em andamento ─────────────────────────────────
    prisma.tarefa.findMany({
      where: { status: StatusTarefa.EM_ANDAMENTO, parentId: null },
      select: {
        id: true, titulo: true, prazo: true, urgencia: true,
        responsavel: { select: { id: true, nome: true } },
        aluno: { select: { id: true, nome: true } },
      },
      orderBy: [{ urgencia: 'desc' }, { prazo: 'asc' }],
      take: 20,
    }),

    // ── Produtividade ────────────────────────────────────────
    prisma.followUp.findMany({
      where: { realizadoEm: { gte: inicioMes } },
      select: { responsavelId: true },
    }),
    prisma.analisePlano.findMany({
      where: { realizadaEm: { gte: inicioMes } },
      select: { responsavelId: true },
    }),
    prisma.tarefa.groupBy({
      by: ['responsavelId'],
      where: {
        status: { not: StatusTarefa.CONCLUIDA },
        prazo: { lt: now },
        parentId: null,
        responsavelId: { not: null },
      },
      _count: true,
    }),
    prisma.membroEquipe.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, cargo: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  // ── Churn risk ──────────────────────────────────────────────────────────────
  const alunosComRisco = alunosAtivosParaRisco.map((a) => {
    const risco = calcularRiscoChurn({
      dataUltimoFollowUp: a.dataUltimoFollowUp,
      dataVencimento: a.dataVencimento,
      dataUltimaAnalisePlano: a.dataUltimaAnalisePlano,
      tarefasAtrasadas: a._count.tarefas,
      statusAtual: 'ATIVO',
    })
    return { id: a.id, nome: a.nome, plano: a.plano, faseAtual: a.faseAtual, responsavelAcomp: a.responsavelAcomp, riscoChurn: risco }
  })
  const alunosEmRisco = alunosComRisco
    .filter((a) => a.riscoChurn.nivel === 'ALTO' || a.riscoChurn.nivel === 'CRITICO')
    .sort((a, b) => b.riscoChurn.score - a.riscoChurn.score)
    .slice(0, 20)
  const resumoRisco = {
    CRITICO: alunosComRisco.filter((a) => a.riscoChurn.nivel === 'CRITICO').length,
    ALTO:    alunosComRisco.filter((a) => a.riscoChurn.nivel === 'ALTO').length,
    MEDIO:   alunosComRisco.filter((a) => a.riscoChurn.nivel === 'MEDIO').length,
    BAIXO:   alunosComRisco.filter((a) => a.riscoChurn.nivel === 'BAIXO').length,
  }

  // ── Taxa de churn ───────────────────────────────────────────────────────────
  const totalInicioMes = totalAtivos + churnsNoMes - novosNoMes
  const taxaChurn = totalInicioMes > 0 ? parseFloat(((churnsNoMes / totalInicioMes) * 100).toFixed(1)) : 0

  const totalInicioMesAnterior = totalInicioMes + churnsNoMesAnterior - novosNoMesAnterior
  const taxaChurnAnterior = totalInicioMesAnterior > 0
    ? parseFloat(((churnsNoMesAnterior / totalInicioMesAnterior) * 100).toFixed(1))
    : 0

  // ── Tendências ──────────────────────────────────────────────────────────────
  const tendencias = {
    ativos:    { delta: novosNoMes - churnsNoMes },
    novos:     { delta: novosNoMes - novosNoMesAnterior },
    churns:    { delta: churnsNoMes - churnsNoMesAnterior },
    taxaChurn: { delta: parseFloat((taxaChurn - taxaChurnAnterior).toFixed(1)) },
    aprovados: { noMes: aprovadosNoMes, noMesAnterior: aprovadosNoMesAnterior },
  }

  // ── Histórico 6 meses ───────────────────────────────────────────────────────
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return {
      key: getMonthKey(d),
      mes: d.toLocaleDateString('pt-BR', { month: 'short' }),
      novos: 0,
      churns: 0,
    }
  })
  entrantesHistorico.forEach((a) => {
    const key = getMonthKey(new Date(a.dataEntrada))
    const m = meses.find((x) => x.key === key)
    if (m) m.novos++
  })
  churnsHistorico.forEach((c) => {
    const key = getMonthKey(new Date(c.dataChurn))
    const m = meses.find((x) => x.key === key)
    if (m) m.churns++
  })

  // ── Produtividade do time ───────────────────────────────────────────────────
  const followUpCount: Record<string, number> = {}
  followUpsDoMes.forEach((f) => { followUpCount[f.responsavelId] = (followUpCount[f.responsavelId] ?? 0) + 1 })

  const analiseCount: Record<string, number> = {}
  analisesDoMes.forEach((a) => { analiseCount[a.responsavelId] = (analiseCount[a.responsavelId] ?? 0) + 1 })

  const tarefasAtrasadasCount: Record<string, number> = {}
  tarefasAtrasadasGrupo.forEach((g) => {
    if (g.responsavelId) tarefasAtrasadasCount[g.responsavelId] = g._count
  })

  const produtividadeTime = membrosAtivos
    .map((m) => ({
      id:              m.id,
      nome:            m.nome,
      cargo:           m.cargo,
      followUps:       followUpCount[m.id] ?? 0,
      analises:        analiseCount[m.id] ?? 0,
      tarefasAtrasadas: tarefasAtrasadasCount[m.id] ?? 0,
    }))
    .sort((a, b) => (b.followUps + b.analises) - (a.followUps + a.analises))

  const totalFollowUpsNoMes = followUpsDoMes.length

  return NextResponse.json({
    cards: {
      totalAtivos,
      novosNoMes,
      churnsNoMes,
      taxaChurn,
      proAtivos,
      startAtivos,
      eliteAtivos,
      totalAprovados,
      totalFollowUpsNoMes,
    },
    tendencias,
    distribuicaoFases: distribuicaoFases.map((d) => ({ fase: d.faseAtual, total: d._count })),
    distribuicaoPlanos: [
      { plano: 'PRO',   label: 'PRO',   count: proAtivos,   color: '#8b5cf6' },
      { plano: 'START', label: 'START', count: startAtivos, color: '#6b7280' },
      { plano: 'ELITE', label: 'ELITE', count: eliteAtivos, color: '#f59e0b' },
    ],
    historicoMensal: meses.map(({ key: _k, ...rest }) => rest),
    riscoChurn: { resumo: resumoRisco, alunos: alunosEmRisco },
    hoje: {
      tarefas: tarefasHoje,
      tarefasEmAndamento,
    },
    produtividadeTime,
    alertas: {
      followUpsAtrasados,
      vencendoEm15Dias,
      tarefasAtrasadas,
      provasEm30Dias,
    },
  })
}
