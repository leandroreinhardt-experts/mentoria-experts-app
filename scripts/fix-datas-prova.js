/**
 * Corrige dataProva, dataEntrada e dataVencimento salvas como UTC midnight,
 * movendo para meio-dia UTC (T12:00:00Z) para que a exibição em BRT fique correta.
 * Uso: node scripts/fix-datas-prova.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

require('dotenv').config({ path: '.env' })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function precisaCorrigir(date) {
  if (!date) return false
  const d = new Date(date)
  // UTC midnight = hora 0, minuto 0, segundo 0
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
}

function corrigirData(date) {
  const d = new Date(date)
  // Mantém ano/mês/dia UTC, mas seta hora para 12:00:00 UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
}

async function main() {
  const alunos = await prisma.aluno.findMany({
    select: { id: true, nome: true, dataProva: true, dataEntrada: true, dataVencimento: true },
  })

  let total = 0

  for (const aluno of alunos) {
    const update = {}

    if (precisaCorrigir(aluno.dataProva)) {
      update.dataProva = corrigirData(aluno.dataProva)
    }
    if (precisaCorrigir(aluno.dataEntrada)) {
      update.dataEntrada = corrigirData(aluno.dataEntrada)
    }
    if (precisaCorrigir(aluno.dataVencimento)) {
      update.dataVencimento = corrigirData(aluno.dataVencimento)
    }

    if (Object.keys(update).length > 0) {
      await prisma.aluno.update({ where: { id: aluno.id }, data: update })
      const campos = Object.keys(update).join(', ')
      console.log(`  ✓ ${aluno.nome.padEnd(40)} [${campos}]`)
      total++
    }
  }

  if (total === 0) {
    console.log('✅ Nenhuma data precisava de correção.')
  } else {
    console.log(`\n✅ ${total} alunos corrigidos.`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
