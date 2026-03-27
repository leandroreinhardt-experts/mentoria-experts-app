/**
 * Script de importação dos alunos da planilha ClickUp
 * Uso: node scripts/importar-alunos.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const XLSX = require('xlsx')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

const EXCEL_PATH = '/Users/leandroreinhardt/Downloads/Alunos/2026-03-03T18_18_45.032Z Leandro Reinhardts Workspace - Sucesso Do Aluno - Acompanhamento De Alunos - Alunos.xlsx'

const HOJE = new Date('2026-03-22')
const AMANHA = new Date('2026-03-23')

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function normalizarCPF(cpf) {
  if (!cpf) return null
  return String(cpf).replace(/[^\d]/g, '').trim()
}

function mapearPlano(planoStr) {
  if (!planoStr) return 'PRO'
  const p = planoStr.toLowerCase()
  if (p.includes('anual')) return 'ELITE'
  if (p.includes('semestral') || p.includes('recorrente') || p.includes('experts')) return 'PRO'
  if (p.includes('trimestral')) return 'START'
  return 'PRO'
}

function incluiEstrategia(planoStr) {
  if (!planoStr) return false
  const p = planoStr.toLowerCase()
  return p.includes('estratégia') || p.includes('estrategia')
}

function calcularFase(dataVencimento) {
  if (!dataVencimento) return 'PRE_EDITAL'
  const venc = new Date(dataVencimento)
  const diffDias = (venc - HOJE) / (1000 * 60 * 60 * 24)
  if (diffDias <= 60) return 'PROXIMO_VENCIMENTO'
  return 'PRE_EDITAL'
}

function excelDateToJS(value) {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : date
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function normalizePhone(phone) {
  if (!phone) return null
  const cleaned = String(phone).replace(/[^\d+\s-]/g, '').trim()
  return cleaned.substring(0, 20) || null
}

// ────────────────────────────────────────────────────────────
// Leitura da planilha
// ────────────────────────────────────────────────────────────

function lerAlunos() {
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true })
  const ws = wb.Sheets['Tasks']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  let headerRow = -1
  for (let i = 0; i < raw.length; i++) {
    if (raw[i][0] === 'Task Type') { headerRow = i; break }
  }
  if (headerRow === -1) throw new Error('Header não encontrado')

  const headers = raw[headerRow]
  const alunos = []

  for (let i = headerRow + 1; i < raw.length; i++) {
    const row = raw[i]
    if (row[0] !== 'Aluno') continue

    const get = (col) => {
      const idx = headers.indexOf(col)
      return idx >= 0 ? row[idx] : null
    }

    const cpfRaw = get('\u{1FAAA} CPF (short text)') || get('CPF (short text)') || null

    alunos.push({
      nome: get('Task Name'),
      cpf: normalizarCPF(cpfRaw),
      email: get('E-mail (email)') || null,
      whatsapp: normalizePhone(get('Contato (phone)')),
      startDate: excelDateToJS(get('Start Date')),
      dueDate: excelDateToJS(get('Due Date')),
      dateCreated: excelDateToJS(get('Date Created')),
      plano: mapearPlano(get('Plano da Mentoria (drop down)')),
      incluiEstrategia: incluiEstrategia(get('Plano da Mentoria (drop down)')),
      cursoPrincipal: get('Curso (labels)') ? String(get('Curso (labels)')).trim() : null,
      plataformaQuestoes: get('Plataforma de questões (drop down)') || null,
      areaEstudo: get('Área de Estudo (drop down)') || null,
      concursoCargo: get('Concurso / Cargo (drop down)') || null,
      dataProva: excelDateToJS(get('Data da prova (date)')),
      planoOriginal: get('Plano da Mentoria (drop down)') || null,
    })
  }

  return alunos
}

// ────────────────────────────────────────────────────────────
// Limpeza do banco
// ────────────────────────────────────────────────────────────

async function limparBanco() {
  console.log('🗑️  Limpando banco de dados...')
  await prisma.comentario.deleteMany()
  await prisma.registroChurn.deleteMany()
  await prisma.registroAprovacao.deleteMany()
  await prisma.mudancaFase.deleteMany()
  await prisma.analisePlano.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.tarefa.deleteMany()
  await prisma.aluno.deleteMany()
  console.log('✅ Banco limpo.')
}

// ────────────────────────────────────────────────────────────
// Importação
// ────────────────────────────────────────────────────────────

async function importarAlunos(alunos) {
  console.log(`\n📥 Importando ${alunos.length} alunos...`)

  let cpfCounter = 1
  const resultados = []

  for (const a of alunos) {
    let cpf = a.cpf
    if (!cpf || cpf.length < 5) {
      cpf = `PENDENTE${String(cpfCounter++).padStart(3, '0')}`
    }

    const dataEntrada = a.startDate || a.dateCreated || new Date('2025-01-01')

    let dataVencimento = a.dueDate
    if (!dataVencimento) {
      const meses = a.planoOriginal?.toLowerCase().includes('anual') ? 12
        : a.planoOriginal?.toLowerCase().includes('semestral') ? 6
        : a.planoOriginal?.toLowerCase().includes('trimestral') ? 3 : 6
      dataVencimento = new Date(dataEntrada)
      dataVencimento.setMonth(dataVencimento.getMonth() + meses)
    }

    const faseAtual = calcularFase(dataVencimento)

    const onboardingRespostas = []
    if (a.concursoCargo) {
      onboardingRespostas.push({ pergunta: 'Concurso / Cargo', resposta: a.concursoCargo })
    }
    if (a.planoOriginal) {
      onboardingRespostas.push({ pergunta: 'Plano Contratado', resposta: a.planoOriginal })
    }

    try {
      const aluno = await prisma.aluno.create({
        data: {
          nome: a.nome,
          cpf,
          email: a.email,
          whatsapp: a.whatsapp,
          dataEntrada,
          dataVencimento,
          plano: a.plano,
          statusAtual: 'ATIVO',
          faseAtual,
          faseManualOverride: false,
          cursoPrincipal: a.cursoPrincipal,
          plataformaQuestoes: a.plataformaQuestoes,
          areaEstudo: a.areaEstudo,
          dataProva: a.dataProva,
          incluiAcessoEstrategia: a.incluiEstrategia,
          onboardingRespostas: onboardingRespostas.length > 0 ? onboardingRespostas : undefined,
        },
      })
      resultados.push(aluno)
      process.stdout.write('.')
    } catch (err) {
      console.error(`\n⚠️  Erro ao importar ${a.nome} (CPF: ${cpf}): ${err.message}`)
    }
  }

  console.log(`\n✅ ${resultados.length} alunos importados.`)
  return resultados
}

// ────────────────────────────────────────────────────────────
// Helpers de dia útil
// ────────────────────────────────────────────────────────────

/** Avança a data para o próximo dia útil (seg–sex), se necessário */
function proximoDiaUtil(data) {
  const d = new Date(data)
  const dia = d.getDay() // 0=dom, 6=sab
  if (dia === 6) d.setDate(d.getDate() + 2) // sáb → seg
  else if (dia === 0) d.setDate(d.getDate() + 1) // dom → seg
  return d
}

/** Retorna o N-ésimo dia útil a partir de uma data base (sem contar fins de semana) */
function nthDiaUtil(base, n) {
  let d = new Date(base)
  let uteis = 0
  while (uteis < n) {
    d.setDate(d.getDate() + 1)
    const dia = d.getDay()
    if (dia !== 0 && dia !== 6) uteis++
  }
  return d
}

// ────────────────────────────────────────────────────────────
// Distribuição na fila de análise
// ────────────────────────────────────────────────────────────

async function distribuirFilaAnalise(alunos) {
  console.log('\n📅 Distribuindo alunos na fila de análise (10/dia útil a partir de amanhã)...')

  const POR_DIA = 10
  const tarefas = []

  // Pré-calcular os dias úteis necessários
  const diasNecessarios = Math.ceil(alunos.length / POR_DIA)
  const diasUteis = []
  for (let n = 0; n < diasNecessarios; n++) {
    diasUteis.push(nthDiaUtil(AMANHA, n))
  }

  for (let i = 0; i < alunos.length; i++) {
    const diaIdx = Math.floor(i / POR_DIA)
    const prazo = new Date(diasUteis[diaIdx])
    prazo.setHours(23, 59, 0, 0)

    tarefas.push({
      titulo: `Análise do Plano — ${alunos[i].nome}`,
      tipo: 'MANUAL',
      alunoId: alunos[i].id,
      prazo,
      urgencia: 'MEDIA',
      status: 'A_FAZER',
    })
  }

  await prisma.tarefa.createMany({ data: tarefas })
  console.log(`✅ ${tarefas.length} tarefas de análise criadas.`)

  console.log('\n📊 Distribuição (somente dias úteis):')
  for (let d = 0; d < diasUteis.length; d++) {
    const qtd = Math.min(POR_DIA, alunos.length - d * POR_DIA)
    console.log(`  ${diasUteis[d].toLocaleDateString('pt-BR')} → ${qtd} alunos`)
  }
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando importação...\n')

  const alunos = lerAlunos()
  console.log(`📋 ${alunos.length} alunos lidos da planilha.`)

  await limparBanco()
  const alunosCriados = await importarAlunos(alunos)
  await distribuirFilaAnalise(alunosCriados)

  console.log('\n🎉 Importação concluída com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
