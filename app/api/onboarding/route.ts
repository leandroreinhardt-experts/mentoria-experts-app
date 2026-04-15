import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Plano, StatusAluno, FaseMentoria, UrgenciaTarefa, StatusTarefa, TipoTarefa } from '@prisma/client'
import { inicializarAluno } from '@/lib/aluno-utils'
import { notificarEquipe } from '@/lib/notificacoes'
import { garantirDiaUtil } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    nome, cpf, email, whatsapp, cidadeEstado, dataInicial, dataProva, cargoAlmejado,
    planoContratado,
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

  // Converte "YYYY-MM-DD" para meio-dia UTC, evitando que UTC→BRT mude o dia exibido
  function parseDateOnly(str: string | null | undefined): Date | null {
    if (!str) return null
    return new Date(`${str.substring(0, 10)}T12:00:00.000Z`)
  }

  const dataEntrada = parseDateOnly(dataInicial) ?? new Date()

  // Mapear plano contratado → enum Plano e duração em meses
  function resolverPlano(planoStr: string): { plano: Plano; meses: number } {
    const s = (planoStr || '').toLowerCase()
    const meses = s.includes('anual') ? 12 : 6
    let plano: Plano = Plano.START
    if (s.startsWith('pro')) plano = Plano.PRO
    else if (s.startsWith('elite')) plano = Plano.ELITE
    else if (s.includes('reta final')) plano = Plano.RETA_FINAL
    return { plano, meses }
  }

  const { plano: planoResolvido, meses } = resolverPlano(planoContratado || '')
  const dataVencimento = new Date(dataEntrada)
  dataVencimento.setMonth(dataVencimento.getMonth() + meses)

  const dataProvaParsed = parseDateOnly(dataProva)

  // Build onboardingRespostas JSON
  const onboardingRespostas = [
    { pergunta: 'Plano contratado', resposta: planoContratado || '' },
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
      plano: planoResolvido,
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

  // Prazo: próximo dia útil após o cadastro
  const prazoVerificacaoBase = new Date(dataEntrada)
  prazoVerificacaoBase.setUTCDate(prazoVerificacaoBase.getUTCDate() + 1)
  const prazoVerificacao = garantirDiaUtil(prazoVerificacaoBase)

  // Tarefa principal de verificação
  const tarefaVerificacao = await prisma.tarefa.create({
    data: {
      titulo: `Verificar e completar dados — ${aluno.nome}`,
      descricao: `Novo aluno cadastrado via formulário de onboarding. Revisar e completar as informações necessárias antes de iniciar o acompanhamento.`,
      tipo: TipoTarefa.MANUAL,
      alunoId: aluno.id,
      urgencia: UrgenciaTarefa.ALTA,
      status: StatusTarefa.A_FAZER,
      prazo: prazoVerificacao,
    },
  })

  // Subtarefas de verificação
  const subtarefas = [
    'Definir o plano do aluno (Start, Pro ou Elite)',
    'Confirmar se o plano inclui assinatura do Estratégia Concursos',
    `Confirmar curso base informado pelo aluno: "${cursoPrincipal || 'não informado'}"`,
    `Confirmar plataforma de questões informada: "${plataformaQuestoes || 'não informada'}"`,
    'Definir a data de vencimento (prazo) do plano do aluno',
    'Verificar se o aluno está com acesso liberado na área do aluno',
  ]

  await prisma.tarefa.createMany({
    data: subtarefas.map((titulo) => ({
      titulo,
      tipo: TipoTarefa.MANUAL,
      alunoId: aluno.id,
      urgencia: UrgenciaTarefa.ALTA,
      status: StatusTarefa.A_FAZER,
      prazo: prazoVerificacao,
      parentId: tarefaVerificacao.id,
    })),
  })

  // Notificar toda a equipe sobre o novo aluno
  await notificarEquipe({
    titulo: `Novo aluno via formulário: ${aluno.nome}`,
    descricao: `Plano ${aluno.plano} · Verifique e complete os dados cadastrais.`,
    url: `/alunos/${aluno.id}`,
  })

  return NextResponse.json({ id: aluno.id, nome: aluno.nome }, { status: 201 })
}
