import { Plano, TipoTarefa, UrgenciaTarefa } from '@prisma/client'
import { addDays } from './utils'

export interface TarefaOnboarding {
  titulo: string
  tipo: TipoTarefa
  prazo: Date
  urgencia: UrgenciaTarefa
}

export function getTarefasOnboarding(
  plano: Plano,
  incluiAcessoEstrategia: boolean,
  dataEntrada: Date
): TarefaOnboarding[] {
  const tarefas: TarefaOnboarding[] = []

  if (incluiAcessoEstrategia) {
    tarefas.push({
      titulo: 'Liberar acesso na plataforma Estratégia',
      tipo: TipoTarefa.ONBOARDING_ACESSO_ESTRATEGIA,
      prazo: addDays(dataEntrada, 1),
      urgencia: UrgenciaTarefa.ALTA,
    })
  }

  tarefas.push({
    titulo: 'Adicionar à lista de transmissão do WhatsApp',
    tipo: TipoTarefa.ONBOARDING_LISTA_TRANSMISSAO,
    prazo: addDays(dataEntrada, 1),
    urgencia: UrgenciaTarefa.ALTA,
  })

  tarefas.push({
    titulo: 'Elaborar plano de estudos',
    tipo: TipoTarefa.ONBOARDING_PLANO_ESTUDOS,
    prazo: addDays(dataEntrada, 3),
    urgencia: UrgenciaTarefa.ALTA,
  })

  tarefas.push({
    titulo: 'Marcar reunião de onboarding',
    tipo: TipoTarefa.ONBOARDING_REUNIAO,
    prazo: addDays(dataEntrada, 1),
    urgencia: UrgenciaTarefa.ALTA,
  })

  if (plano === Plano.PRO || plano === Plano.ELITE) {
    tarefas.push({
      titulo: 'Realizar primeiro follow-up',
      tipo: TipoTarefa.FOLLOWUP,
      prazo: addDays(dataEntrada, 15),
      urgencia: UrgenciaTarefa.MEDIA,
    })
  }

  return tarefas
}

export function calcularUrgenciaEscalada(
  prazo: Date | null,
  urgenciaAtual: UrgenciaTarefa
): UrgenciaTarefa {
  if (!prazo) return urgenciaAtual
  const now = new Date()
  const diasAtraso = Math.floor((now.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24))
  if (diasAtraso <= 0) return urgenciaAtual

  const niveis: UrgenciaTarefa[] = [
    UrgenciaTarefa.BAIXA,
    UrgenciaTarefa.MEDIA,
    UrgenciaTarefa.ALTA,
    UrgenciaTarefa.CRITICA,
  ]
  const indiceAtual = niveis.indexOf(urgenciaAtual)
  const incrementos = Math.floor(diasAtraso / 2) // +1 nível a cada 2 dias
  const novoIndice = Math.min(indiceAtual + incrementos, niveis.length - 1)
  return niveis[novoIndice]
}
