import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plano, TipoTarefa, StatusTarefa } from '@prisma/client'

/**
 * POST /api/admin/cleanup-start
 *
 * Limpeza retroativa: remove todas as tarefas de FOLLOWUP pendentes
 * de alunos com plano START, que ficaram órfãs por mudança de plano.
 *
 * Não afeta tarefas já CONCLUIDAS nem tarefas de outros tipos.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Busca todos os alunos START com tarefas FOLLOWUP pendentes
  const alunosStart = await prisma.aluno.findMany({
    where: { plano: Plano.START },
    select: {
      id: true,
      nome: true,
      tarefas: {
        where: {
          tipo: TipoTarefa.FOLLOWUP,
          status: { in: [StatusTarefa.A_FAZER, StatusTarefa.EM_ANDAMENTO] },
        },
        select: { id: true },
      },
    },
  })

  const afetados = alunosStart.filter((a) => a.tarefas.length > 0)

  if (afetados.length === 0) {
    return NextResponse.json({
      ok: true,
      mensagem: 'Nenhuma tarefa de follow-up pendente encontrada para alunos START.',
      tarefasRemovidas: 0,
      alunosAfetados: 0,
    })
  }

  const idsAfetados = afetados.map((a) => a.id)

  const { count } = await prisma.tarefa.deleteMany({
    where: {
      alunoId: { in: idsAfetados },
      tipo: TipoTarefa.FOLLOWUP,
      status: { in: [StatusTarefa.A_FAZER, StatusTarefa.EM_ANDAMENTO] },
    },
  })

  return NextResponse.json({
    ok: true,
    mensagem: `${count} tarefa(s) de follow-up removida(s) de ${afetados.length} aluno(s) START.`,
    tarefasRemovidas: count,
    alunosAfetados: afetados.length,
    detalhe: afetados.map((a) => ({
      id: a.id,
      nome: a.nome,
      tarefasRemovidas: a.tarefas.length,
    })),
  })
}
