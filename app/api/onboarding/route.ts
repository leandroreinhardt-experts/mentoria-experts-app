import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Plano, StatusAluno, FaseMentoria } from '@prisma/client'
import { inicializarAluno } from '@/lib/aluno-utils'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    nome, cpf, email, whatsapp, cidadeEstado, dataInicial, dataProva, cargoAlmejado,
    possuiFilhos, nivelEscolaridade, areaFormacao, situacaoProfissional, cargoAtual,
    concursoAlmejado, cursoPrincipal, plataformaQuestoes,
    motivosConcurso, tempoEstudoDia, formaEstudo, dificuldadesEstudo,
    disciplinasDificuldade, disciplinasEstudando, nivelConcentracao,
    tempoEstudandoConcursos, concursosAnteriores, desempenhoAnterior,
    fezMentoriaAntes, quaisMentorias, experienciaMentoria,
    expectativa, rotina, diasEstudo, transtornos, observacoes,
  } = body

  // Normalize CPF
  const cpfLimpo = String(cpf).replace(/\D/g, '')

  // Check CPF uniqueness
  const existing = await prisma.aluno.findUnique({ where: { cpf: cpfLimpo } })
  if (existing) {
    return NextResponse.json(
      { error: 'Já existe um aluno cadastrado com esse CPF.' },
      { status: 409 }
    )
  }

  const dataEntrada = dataInicial ? new Date(dataInicial) : new Date()
  const dataVencimento = new Date(dataEntrada)
  dataVencimento.setFullYear(dataVencimento.getFullYear() + 1)

  const dataProvaParsed = dataProva ? new Date(dataProva) : null

  // Build onboardingRespostas JSON
  const onboardingRespostas = [
    { pergunta: 'Cidade e Estado', resposta: cidadeEstado || '' },
    { pergunta: 'Possui filho(s)?', resposta: possuiFilhos || '' },
    { pergunta: 'Nível de escolaridade', resposta: nivelEscolaridade || '' },
    { pergunta: 'Área de formação', resposta: areaFormacao || '' },
    { pergunta: 'Situação profissional', resposta: situacaoProfissional || '' },
    { pergunta: 'Cargo atual', resposta: cargoAtual || '' },
    { pergunta: 'Qual concurso almejado?', resposta: concursoAlmejado || '' },
    { pergunta: 'Cargo desejado', resposta: cargoAlmejado || '' },
    { pergunta: 'Qual curso você irá utilizar como base?', resposta: cursoPrincipal || '' },
    { pergunta: 'Qual plataforma de questões você utiliza?', resposta: plataformaQuestoes || '' },
    { pergunta: 'Quais os motivos pelos quais você deseja se tornar concursado(a)?', resposta: motivosConcurso || '' },
    { pergunta: 'Quanto tempo por dia você irá dedicar ao estudo?', resposta: tempoEstudoDia || '' },
    { pergunta: 'Qual sua forma de estudo preferida?', resposta: formaEstudo || '' },
    { pergunta: 'Explique as maiores dificuldades que você tem no estudo', resposta: dificuldadesEstudo || '' },
    { pergunta: 'Liste as disciplinas que você considera ter mais dificuldade', resposta: disciplinasDificuldade || '' },
    { pergunta: 'Disciplinas que vem estudando atualmente', resposta: disciplinasEstudando || '' },
    { pergunta: 'Nível de concentração (0-10)', resposta: String(nivelConcentracao ?? '') },
    { pergunta: 'Há quanto tempo estuda para concursos?', resposta: tempoEstudandoConcursos || '' },
    { pergunta: 'Liste os concursos que já prestou', resposta: concursosAnteriores || '' },
    { pergunta: 'Como foi seu desempenho em provas anteriores?', resposta: desempenhoAnterior || '' },
    { pergunta: 'Já fez mentoria ou consultoria anteriormente?', resposta: fezMentoriaAntes || '' },
    { pergunta: 'Quais mentorias participou?', resposta: quaisMentorias || '' },
    { pergunta: 'Como foi sua experiência com a mentoria?', resposta: experienciaMentoria || '' },
    { pergunta: 'O que você espera da Mentoria Experts?', resposta: expectativa || '' },
    { pergunta: 'Descreva sua rotina', resposta: rotina || '' },
    { pergunta: 'Quais os dias da semana que você irá estudar?', resposta: Array.isArray(diasEstudo) ? diasEstudo.join(', ') : (diasEstudo || '') },
    { pergunta: 'Possui algum transtorno, patologia ou vício?', resposta: transtornos || '' },
    { pergunta: 'Observações adicionais', resposta: observacoes || '' },
  ].filter((r) => r.resposta)

  const aluno = await prisma.aluno.create({
    data: {
      nome: String(nome).trim(),
      cpf: cpfLimpo,
      email: email ? String(email).trim() : null,
      whatsapp: whatsapp ? String(whatsapp).trim() : null,
      dataEntrada,
      dataVencimento,
      plano: Plano.START,
      statusAtual: StatusAluno.ATIVO,
      faseAtual: FaseMentoria.ONBOARDING,
      faseManualOverride: false,
      incluiAcessoEstrategia: false,
      cursoPrincipal: cursoPrincipal || null,
      plataformaQuestoes: plataformaQuestoes || null,
      areaEstudo: concursoAlmejado ? `${concursoAlmejado}${cargoAlmejado ? ` — ${cargoAlmejado}` : ''}` : null,
      dataProva: dataProvaParsed,
      onboardingRespostas,
    },
  })

  await inicializarAluno({
    id: aluno.id,
    plano: aluno.plano,
    dataEntrada: aluno.dataEntrada,
    dataVencimento: aluno.dataVencimento,
    dataProva: aluno.dataProva,
    statusAtual: aluno.statusAtual,
    faseAtual: aluno.faseAtual,
    faseManualOverride: aluno.faseManualOverride,
    incluiAcessoEstrategia: aluno.incluiAcessoEstrategia,
  })

  return NextResponse.json({ id: aluno.id, nome: aluno.nome }, { status: 201 })
}
