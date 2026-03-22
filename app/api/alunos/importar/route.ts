import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inicializarAluno } from '@/lib/aluno-utils'
import { Plano } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { alunos } = body as { alunos: any[] }

  let importados = 0
  let duplicados = 0
  let erros = 0
  const detalhesErros: any[] = []

  for (let i = 0; i < alunos.length; i++) {
    const row = alunos[i]
    try {
      const cpf = String(row.cpf || '').replace(/\D/g, '')
      if (!cpf || !row.nome) {
        detalhesErros.push({ linha: i + 2, cpf, erro: 'CPF ou nome ausente' })
        erros++
        continue
      }

      const existing = await prisma.aluno.findUnique({ where: { cpf } })
      if (existing) {
        duplicados++
        continue
      }

      const dataEntrada = row.dataEntrada ? new Date(row.dataEntrada) : new Date()
      const dataVencimento = row.dataVencimento ? new Date(row.dataVencimento) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      const plano = (row.plano?.toUpperCase() as Plano) || Plano.START

      const aluno = await prisma.aluno.create({
        data: {
          nome: row.nome,
          cpf,
          email: row.email || null,
          whatsapp: row.whatsapp || null,
          dataEntrada,
          dataVencimento,
          plano,
          cursoPrincipal: row.cursoPrincipal || null,
          areaEstudo: row.areaEstudo || null,
          incluiAcessoEstrategia: row.incluiAcessoEstrategia === 'true' || row.incluiAcessoEstrategia === true,
        },
      })

      await inicializarAluno(aluno)

      importados++
    } catch (e: any) {
      erros++
      detalhesErros.push({ linha: i + 2, cpf: row.cpf, erro: e.message })
    }
  }

  await prisma.logImportacao.create({
    data: {
      nomeArquivo: body.nomeArquivo || 'importacao',
      totalLinhas: alunos.length,
      importados,
      duplicados,
      erros,
      detalhesErros: detalhesErros.length > 0 ? detalhesErros : undefined,
    },
  })

  return NextResponse.json({ importados, duplicados, erros, detalhesErros })
}
