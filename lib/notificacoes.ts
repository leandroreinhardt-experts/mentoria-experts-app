import { prisma } from './prisma'

/**
 * Cria uma notificação para todos os membros ativos da equipe.
 */
export async function notificarEquipe({
  titulo,
  descricao,
  url,
  excluirMembroId,
}: {
  titulo: string
  descricao?: string
  url?: string
  excluirMembroId?: string
}) {
  const membros = await prisma.membroEquipe.findMany({
    where: { ativo: true, ...(excluirMembroId ? { id: { not: excluirMembroId } } : {}) },
    select: { id: true },
  })

  if (membros.length === 0) return

  await prisma.notificacao.createMany({
    data: membros.map((m) => ({
      membroId: m.id,
      titulo,
      descricao: descricao ?? null,
      url: url ?? null,
    })),
  })
}
