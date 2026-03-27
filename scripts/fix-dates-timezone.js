/**
 * Corrige datas salvas como UTC midnight (T00:00:00Z) para UTC noon (T12:00:00Z),
 * evitando que o fuso horário BRT (UTC-3) mude o dia exibido.
 * Campos corrigidos: dataEntrada, dataVencimento, dataProva (Aluno)
 *                    prazo (Tarefa)
 * Uso: node scripts/fix-dates-timezone.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

require('dotenv').config({ path: '.env' })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

/** Retorna true se a data estiver salva como UTC midnight */
function ehMeiaNoiteUTC(date) {
  const d = new Date(date)
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0
}

/** Converte uma data de midnight UTC para noon UTC (mesmo dia) */
function paraNoiteUTC(date) {
  const d = new Date(date)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

async function fixAlunos() {
  const alunos = await prisma.aluno.findMany({
    select: { id: true, nome: true, dataEntrada: true, dataVencimento: true, dataProva: true },
  })

  let count = 0
  for (const a of alunos) {
    const update = {}

    if (a.dataEntrada && ehMeiaNoiteUTC(a.dataEntrada))
      update.dataEntrada = paraNoiteUTC(a.dataEntrada)

    if (a.dataVencimento && ehMeiaNoiteUTC(a.dataVencimento))
      update.dataVencimento = paraNoiteUTC(a.dataVencimento)

    if (a.dataProva && ehMeiaNoiteUTC(a.dataProva))
      update.dataProva = paraNoiteUTC(a.dataProva)

    if (Object.keys(update).length > 0) {
      await prisma.aluno.update({ where: { id: a.id }, data: update })
      count++
    }
  }

  return count
}

async function fixTarefas() {
  const tarefas = await prisma.tarefa.findMany({
    where: { prazo: { not: null } },
    select: { id: true, prazo: true },
  })

  let count = 0
  for (const t of tarefas) {
    if (t.prazo && ehMeiaNoiteUTC(t.prazo)) {
      await prisma.tarefa.update({
        where: { id: t.id },
        data: { prazo: paraNoiteUTC(t.prazo) },
      })
      count++
    }
  }

  return count
}

async function main() {
  console.log('🔧 Corrigindo timezone das datas...\n')

  const alunosCorrigidos = await fixAlunos()
  console.log(`✅ Alunos corrigidos: ${alunosCorrigidos}`)

  const tarefasCorrigidas = await fixTarefas()
  console.log(`✅ Tarefas corrigidas: ${tarefasCorrigidas}`)

  console.log('\n🎉 Migração concluída.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
