import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plano, TipoTarefa, StatusTarefa, UrgenciaTarefa } from '@prisma/client'

// ─── helpers ─────────────────────────────────────────────────────────────────

function diasAtrasada(prazo: Date): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const p = new Date(prazo)
  p.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje.getTime() - p.getTime()) / 86_400_000))
}

function novaUrgencia(dias: number): UrgenciaTarefa {
  if (dias >= 15) return UrgenciaTarefa.CRITICA
  if (dias >= 7)  return UrgenciaTarefa.ALTA
  if (dias >= 3)  return UrgenciaTarefa.ALTA
  return UrgenciaTarefa.MEDIA
}

function ordemUrgencia(u: UrgenciaTarefa): number {
  return { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 }[u] ?? 1
}

// Retorna Date para "hoje + N dias úteis" (pula sáb/dom)
function addDiasUteis(base: Date, dias: number): Date {
  const d = new Date(base)
  let adicionados = 0
  while (adicionados < dias) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) adicionados++
  }
  return d
}

// ─── algoritmo de redistribuição ─────────────────────────────────────────────

async function calcularRedistribuicao(dryRun: boolean) {
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)

  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  amanha.setHours(12, 0, 0, 0)

  // 1. Membros ativos
  const membros = await prisma.membroEquipe.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
    orderBy: { criadoEm: 'asc' },
  })

  if (membros.length === 0) {
    return { ok: false, erro: 'Nenhum membro ativo encontrado.' }
  }

  // 2. Todas as tarefas atrasadas (sem subtarefas)
  const tarefasAtrasadas = await prisma.tarefa.findMany({
    where: {
      parentId: null,
      status: { in: [StatusTarefa.A_FAZER, StatusTarefa.EM_ANDAMENTO] },
      prazo: { lt: amanha },
    },
    include: {
      aluno: {
        select: { id: true, nome: true, plano: true, faseAtual: true, responsavelAcompId: true },
      },
      responsavel: { select: { id: true, nome: true } },
    },
    orderBy: { prazo: 'asc' },
  })

  if (tarefasAtrasadas.length === 0) {
    return {
      ok: true,
      mensagem: 'Nenhuma tarefa atrasada encontrada. Tudo em dia!',
      tarefasAtualizadas: 0,
      followUpsAtualizados: 0,
      preview: [],
    }
  }

  // 3. Total de alunos ativos PRO/ELITE para calcular maxDiario
  const totalProElite = await prisma.aluno.count({
    where: {
      statusAtual: 'ATIVO',
      plano: { in: [Plano.PRO, Plano.ELITE, Plano.RETA_FINAL] },
    },
  })
  const maxFollowUpDiario = Math.max(1, Math.ceil(totalProElite / 15))

  // 4. Separar follow-ups de tarefas comuns
  const followUps   = tarefasAtrasadas.filter(t => t.tipo === TipoTarefa.FOLLOWUP)
  const outrasOrdBy = tarefasAtrasadas
    .filter(t => t.tipo !== TipoTarefa.FOLLOWUP)
    .map(t => ({ ...t, dias: diasAtrasada(t.prazo!) }))
    .sort((a, b) => ordemUrgencia(novaUrgencia(b.dias)) - ordemUrgencia(novaUrgencia(a.dias)) || b.dias - a.dias)

  // 5. Distribuição de FOLLOW-UPS
  //    - Respeita o responsavelAcompId do aluno; se nulo, distribui round-robin
  //    - Agrupa por dia a partir de amanhã, no máximo maxFollowUpDiario por dia
  const followUpUpdates: Array<{
    id: string; prazo: Date; responsavelId: string | null
    titulo: string; alunoNome: string | null; urgencia: UrgenciaTarefa; dias: number
  }> = []

  let fuDiaOffset = 0
  let fuNoDia = 0
  let fuMemberIdx = 0

  for (const t of followUps) {
    if (fuNoDia >= maxFollowUpDiario) {
      fuDiaOffset++
      fuNoDia = 0
    }
    const novoPrazo = addDiasUteis(amanha, fuDiaOffset)
    novoPrazo.setHours(12, 0, 0, 0)

    // Prioriza responsável de acompanhamento do aluno
    const responsavelId =
      t.aluno?.responsavelAcompId ??
      membros[fuMemberIdx % membros.length].id

    if (!t.aluno?.responsavelAcompId) {
      fuMemberIdx++
    }

    const dias = diasAtrasada(t.prazo!)
    followUpUpdates.push({
      id: t.id,
      prazo: novoPrazo,
      responsavelId,
      titulo: t.titulo,
      alunoNome: t.aluno?.nome ?? null,
      urgencia: novaUrgencia(dias),
      dias,
    })
    fuNoDia++
  }

  // 6. Distribuição de OUTRAS TAREFAS
  //    - Round-robin por membro com menos tarefas atribuídas
  //    - Capacidade: ceil(outrasOrdBy.length / membros.length / 10) por membro por dia, mín 3
  const capacidadePorMembroDia = Math.max(
    3,
    Math.ceil(outrasOrdBy.length / membros.length / 10),
  )

  // Mapa: memberId → próximo dia disponível e contagem no dia
  const membroState = Object.fromEntries(
    membros.map(m => [m.id, { offset: 0, noDia: 0 }]),
  )

  const outrasUpdates: Array<{
    id: string; prazo: Date; responsavelId: string
    titulo: string; alunoNome: string | null; urgencia: UrgenciaTarefa; dias: number
  }> = []

  // Contador de tarefas por membro para balancear
  const cargaMembro: Record<string, number> = Object.fromEntries(
    membros.map(m => [m.id, 0]),
  )

  for (const t of outrasOrdBy) {
    // Escolhe membro com menor carga
    const escolhido = membros.reduce((a, b) =>
      cargaMembro[a.id] <= cargaMembro[b.id] ? a : b,
    )
    const st = membroState[escolhido.id]

    if (st.noDia >= capacidadePorMembroDia) {
      st.offset++
      st.noDia = 0
    }

    const novoPrazo = addDiasUteis(amanha, st.offset)
    novoPrazo.setHours(12, 0, 0, 0)

    outrasUpdates.push({
      id: t.id,
      prazo: novoPrazo,
      responsavelId: escolhido.id,
      titulo: t.titulo,
      alunoNome: t.aluno?.nome ?? null,
      urgencia: novaUrgencia(t.dias),
      dias: t.dias,
    })

    st.noDia++
    cargaMembro[escolhido.id]++
  }

  const todosUpdates = [...followUpUpdates, ...outrasUpdates]

  // 7. Executar (se não for dry-run)
  if (!dryRun) {
    await prisma.$transaction(
      todosUpdates.map(u =>
        prisma.tarefa.update({
          where: { id: u.id },
          data: {
            prazo: u.prazo,
            urgencia: u.urgencia,
            responsavelId: u.responsavelId,
            urgenciaAjustadaAutomaticamente: true,
          },
        }),
      ),
    )
  }

  // 8. Estatísticas por membro
  const porMembro = membros.map(m => {
    const tarefas = todosUpdates.filter(u => u.responsavelId === m.id)
    return {
      membro: m.nome,
      total: tarefas.length,
      followUps: tarefas.filter(u => followUpUpdates.some(f => f.id === u.id)).length,
      outras: tarefas.filter(u => outrasUpdates.some(o => o.id === u.id)).length,
    }
  })

  return {
    ok: true,
    dryRun,
    tarefasAtualizadas: todosUpdates.length,
    followUpsAtualizados: followUpUpdates.length,
    outrasAtualizadas: outrasUpdates.length,
    maxFollowUpDiario,
    capacidadePorMembroDia,
    porMembro,
    preview: todosUpdates.map(u => ({
      id: u.id,
      titulo: u.titulo,
      aluno: u.alunoNome,
      urgencia: u.urgencia,
      diasAtrasada: u.dias,
      novoPrazo: u.prazo.toISOString().split('T')[0],
      responsavel: membros.find(m => m.id === u.responsavelId)?.nome ?? '—',
      tipo: followUpUpdates.some(f => f.id === u.id) ? 'follow-up' : 'tarefa',
    })),
  }
}

// ─── routes ──────────────────────────────────────────────────────────────────

/** GET — dry-run: mostra o que seria feito sem salvar */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const resultado = await calcularRedistribuicao(true)
  return NextResponse.json(resultado)
}

/** POST — executa a reorganização e salva no banco */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const resultado = await calcularRedistribuicao(false)
  return NextResponse.json(resultado)
}
