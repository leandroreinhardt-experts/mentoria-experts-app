import 'dotenv/config'
import { PrismaClient, NivelAcesso } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Iniciando seed...')

  // Criar admin padrão
  const senhaHash = await bcrypt.hash('mentoria@2024', 12)

  const admin = await prisma.membroEquipe.upsert({
    where: { email: 'admin@mentoriaexperts.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@mentoriaexperts.com.br',
      senha: senhaHash,
      cargo: 'Admin',
      nivelAcesso: NivelAcesso.ADMIN,
    },
  })

  console.log(`Admin criado: ${admin.email}`)
  console.log('Senha padrão: mentoria@2024')
  console.log('Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
