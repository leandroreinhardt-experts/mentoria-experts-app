/**
 * Corrige tarefas de Análise do Plano agendadas em finais de semana,
 * movendo-as para a segunda-feira seguinte.
 * Uso: node scripts/fix-analise-weekends.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

require('dotenv').config({ path: '.env' })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function proximaSegunda(data) {
  const d = new Date(data)
  const dia = d.getDay() // 0=dom, 6=sab
  if (dia === 6) d.setDate(d.getDate() + 2) // sáb → seg
  else if (dia === 0) d.setDate(d.getDate() + 1) // dom → seg
  return d
}

async function main() {
  // Buscar tarefas de análise pendentes agendadas em fim de semana
  const tarefas = await prisma.tarefa.findMany({
    where: {
      titulo: { startsWith: 'Análise do Plano' },
      status: { in: ['A_FAZER', 'EM_ANDAMENTO'] },
      prazo: { not: null },
    },
    select: { id: true, titulo: true, prazo: true },
  })

  const paraCorrigir = tarefas.filter((t) => {
    const dia = new Date(t.prazo).getDay()
    return dia === 0 || dia === 6
  })

  if (paraCorrigir.length === 0) {
    console.log('✅ Nenhuma tarefa de análise agendada em fim de semana encontrada.')
    await prisma.$disconnect()
    return
  }

  console.log(`🔧 Corrigindo ${paraCorrigir.length} tarefas agendadas em fins de semana...\n`)

  for (const t of paraCorrigir) {
    const dataOriginal = new Date(t.prazo)
    const novaData = proximaSegunda(dataOriginal)
    novaData.setHours(23, 59, 0, 0)

    await prisma.tarefa.update({
      where: { id: t.id },
      data: { prazo: novaData },
    })

    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    console.log(
      `  ${t.titulo.slice(0, 50).padEnd(50)} | ` +
      `${nomesDias[dataOriginal.getDay()]} ${dataOriginal.toLocaleDateString('pt-BR')} → ` +
      `${nomesDias[novaData.getDay()]} ${novaData.toLocaleDateString('pt-BR')}`
    )
  }

  console.log(`\n✅ ${paraCorrigir.length} tarefas corrigidas com sucesso.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
