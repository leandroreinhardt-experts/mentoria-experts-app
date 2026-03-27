/**
 * Redistribui tarefas de Análise do Plano pendentes para no máximo 10/dia útil,
 * mantendo a ordem relativa atual das tarefas.
 * Uso: node scripts/redistribuir-analises.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

require('dotenv').config({ path: '.env' })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

/** Retorna true se a data for sábado ou domingo */
function fimDeSemana(data) {
  const dia = new Date(data).getDay()
  return dia === 0 || dia === 6
}

/** Avança a data para o próximo dia útil (seg–sex), se necessário */
function garantirDiaUtil(data) {
  const d = new Date(data)
  while (fimDeSemana(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/** Avança para o próximo dia útil a partir de d (sempre avança ao menos 1 dia) */
function proximoDiaUtil(d) {
  const next = new Date(d)
  next.setDate(next.getDate() + 1)
  while (fimDeSemana(next)) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

async function main() {
  // Buscar todas as tarefas de análise pendentes, ordenadas pelo prazo atual
  const tarefas = await prisma.tarefa.findMany({
    where: {
      titulo: { startsWith: 'Análise do Plano' },
      status: { in: ['A_FAZER', 'EM_ANDAMENTO'] },
      prazo: { not: null },
    },
    orderBy: { prazo: 'asc' },
    select: { id: true, titulo: true, prazo: true },
  })

  if (tarefas.length === 0) {
    console.log('✅ Nenhuma tarefa de análise pendente encontrada.')
    await prisma.$disconnect()
    return
  }

  console.log(`📋 ${tarefas.length} tarefas pendentes encontradas. Redistribuindo...\n`)

  const POR_DIA = 10

  // Data inicial = prazo da primeira tarefa (já garantindo dia útil)
  let diaAtual = garantirDiaUtil(new Date(tarefas[0].prazo))
  diaAtual.setHours(23, 59, 0, 0)

  let contadorDia = 0
  const atualizacoes = []
  const resumo = new Map() // data → quantidade

  for (const tarefa of tarefas) {
    if (contadorDia >= POR_DIA) {
      diaAtual = proximoDiaUtil(diaAtual)
      diaAtual.setHours(23, 59, 0, 0)
      contadorDia = 0
    }

    const novosPrazo = new Date(diaAtual)
    const chave = novosPrazo.toLocaleDateString('pt-BR')

    atualizacoes.push({ id: tarefa.id, prazo: novosPrazo, titulo: tarefa.titulo })
    resumo.set(chave, (resumo.get(chave) || 0) + 1)
    contadorDia++
  }

  // Aplicar atualizações em lote
  for (const upd of atualizacoes) {
    await prisma.tarefa.update({
      where: { id: upd.id },
      data: { prazo: upd.prazo },
    })
  }

  console.log('📊 Nova distribuição (máx 10/dia útil):\n')
  for (const [data, qtd] of resumo) {
    const barra = '█'.repeat(qtd)
    console.log(`  ${data.padStart(10)}  ${barra} ${qtd}`)
  }

  console.log(`\n✅ ${tarefas.length} tarefas redistribuídas em ${resumo.size} dias úteis.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
