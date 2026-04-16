require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const alunos = await prisma.aluno.findMany({
    select: { id: true, areaEstudo: true, onboardingRespostas: true, concursos: true, areasEstudo: true }
  })

  let updated = 0
  for (const a of alunos) {
    const updates = {}

    // Migrate areaEstudo string → areasEstudo array
    if (a.areaEstudo && a.areasEstudo.length === 0) {
      updates.areasEstudo = [a.areaEstudo.trim()].filter(Boolean)
    }

    // Migrate concurso from onboardingRespostas → concursos array
    if (a.concursos.length === 0 && Array.isArray(a.onboardingRespostas)) {
      const resp = a.onboardingRespostas.find(
        r => r.pergunta === 'Concurso / Cargo' || r.pergunta === 'Qual concurso almejado?'
      )
      if (resp?.resposta) {
        updates.concursos = [resp.resposta.trim()].filter(Boolean)
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.aluno.update({ where: { id: a.id }, data: updates })
      updated++
    }
  }
  console.log(`Migrated ${updated} students`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
