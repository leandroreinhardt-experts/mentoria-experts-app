'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, AlertTriangle, Clock, CheckSquare, UserX, X, AtSign, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AlunoRisco {
  id: string
  nome: string
  plano: string
  score: number
}

interface FollowUpAtrasado {
  id: string
  nome: string
  plano: string
  dataUltimoFollowUp: string | null
}

interface Vencimento {
  id: string
  nome: string
  plano: string
  dataVencimento: string
}

interface TarefaAtrasada {
  id: string
  titulo: string
  prazo: string
  urgencia: string
  aluno: { id: string; nome: string } | null
}

interface Mencao {
  id: string
  texto: string
  criadoEm: string
  aluno: { id: string; nome: string } | null
  autor: { nome: string } | null
}

interface NotificacaoSalva {
  id: string
  titulo: string
  descricao: string | null
  url: string | null
  criadoEm: string
}

interface NotificacoesData {
  criticos: AlunoRisco[]
  followUpsAtrasados: FollowUpAtrasado[]
  vencendoEm7Dias: Vencimento[]
  tarefasAtrasadas: TarefaAtrasada[]
  mencoesPendentes: Mencao[]
  notificacoesNaoLidas: NotificacaoSalva[]
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LAST_SEEN_KEY = 'notif_last_seen'

function diasAtras(date: string | null): string {
  if (!date) return 'nunca'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  return diff === 0 ? 'hoje' : diff === 1 ? 'ontem' : `${diff} dias atrás`
}

function diasRestantes(date: string): string {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
  return diff <= 0 ? 'hoje' : diff === 1 ? 'amanhã' : `em ${diff} dias`
}

// ─── Section header ──────────────────────────────────────────────────────────

function Section({ icon, label, count, color }: {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider', color)}>
      {icon}
      {label}
      <span className="ml-auto opacity-60">{count}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationBell() {
  const [data, setData] = useState<NotificacoesData | null>(null)
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  async function fetchNotificacoes() {
    try {
      const res = await fetch('/api/notificacoes')
      if (!res.ok) return
      const json: NotificacoesData = await res.json()
      setData(json)

      // Notificações salvas não lidas sempre aparecem no badge
      const naoLidas = json.notificacoesNaoLidas?.length ?? 0
      const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) ?? '0', 10)
      const elapsed = Date.now() - lastSeen
      setUnread(naoLidas + (elapsed > 5 * 60 * 1000 ? (json.total - naoLidas) : 0))
    } catch {
      // silencioso
    }
  }

  async function marcarNotificacoesLidas(ids: string[]) {
    if (ids.length === 0) return
    try {
      await fetch('/api/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    fetchNotificacoes()
    intervalRef.current = setInterval(fetchNotificacoes, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function handleDismiss(key: string, dbId?: string) {
    setDismissed((prev) => new Set([...prev, key]))
    if (dbId) marcarNotificacoesLidas([dbId])
  }

  function handleOpen(next: boolean) {
    setOpen(next)
    if (next) {
      // Abriu: zera badge e marca como lidas em background — mantém visíveis no painel
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
      setUnread(0)
      const ids = data?.notificacoesNaoLidas?.map((n) => n.id) ?? []
      marcarNotificacoesLidas(ids)
    } else {
      // Fechou: limpa dismissed e remove notificações salvas do estado local
      setDismissed(new Set())
      if (data && (data.notificacoesNaoLidas?.length ?? 0) > 0) {
        setData({ ...data, notificacoesNaoLidas: [] })
      }
    }
  }

  // Filtered lists (excluding dismissed items)
  const naoLidasVisiveis    = (data?.notificacoesNaoLidas ?? []).filter((n) => !dismissed.has(`notif_${n.id}`))
  const mencoesVisiveis     = (data?.mencoesPendentes ?? []).filter((m) => !dismissed.has(`mencao_${m.id}`))
  const criticosVisiveis    = (data?.criticos ?? []).filter((a) => !dismissed.has(`critico_${a.id}`))
  const followUpsVisiveis   = (data?.followUpsAtrasados ?? []).filter((a) => !dismissed.has(`followup_${a.id}`))
  const vencimentosVisiveis = (data?.vencendoEm7Dias ?? []).filter((a) => !dismissed.has(`vencimento_${a.id}`))
  const tarefasVisiveis     = (data?.tarefasAtrasadas ?? []).filter((t) => !dismissed.has(`tarefa_${t.id}`))

  const total =
    naoLidasVisiveis.length +
    mencoesVisiveis.length +
    criticosVisiveis.length +
    followUpsVisiveis.length +
    vencimentosVisiveis.length +
    tarefasVisiveis.length

  return (
    <Popover.Root open={open} onOpenChange={handleOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="Notificações"
        >
          <Bell size={15} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-gray-100 bg-white shadow-xl outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-indigo-500" />
              <span className="text-[13px] font-semibold text-gray-800">Notificações</span>
              {total > 0 && (
                <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                  {total}
                </span>
              )}
            </div>
            <Popover.Close className="text-gray-300 hover:text-gray-600 transition-colors">
              <X size={13} />
            </Popover.Close>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                <Bell size={24} className="opacity-30" />
                <p className="text-[12px]">Tudo em dia!</p>
              </div>
            ) : (
              <>
                {/* Novos alunos */}
                {naoLidasVisiveis.length > 0 && (
                  <div>
                    <Section
                      icon={<UserPlus size={10} />}
                      label="Novos alunos"
                      count={naoLidasVisiveis.length}
                      color="text-emerald-700 bg-emerald-50"
                    />
                    {naoLidasVisiveis.map((n) => (
                      <Link
                        key={n.id}
                        href={n.url ?? '#'}
                        onClick={() => { handleDismiss(`notif_${n.id}`, n.id); setOpen(false) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <UserPlus size={11} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-gray-800">{n.titulo}</p>
                          {n.descricao && (
                            <p className="truncate text-[10px] text-gray-400">{n.descricao}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Menções */}
                {mencoesVisiveis.length > 0 && (
                  <div>
                    <Section
                      icon={<AtSign size={10} />}
                      label="Você foi mencionado"
                      count={mencoesVisiveis.length}
                      color="text-violet-600 bg-violet-50"
                    />
                    {mencoesVisiveis.map((m) => (
                      <Link
                        key={m.id}
                        href={m.aluno ? `/alunos/${m.aluno.id}` : '#'}
                        onClick={() => { handleDismiss(`mencao_${m.id}`, m.id); setOpen(false) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100">
                          <AtSign size={11} className="text-violet-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-gray-800">
                            {m.autor?.nome} mencionou você
                          </p>
                          <p className="truncate text-[10px] text-gray-400">
                            {m.aluno?.nome} · {m.texto.slice(0, 40)}{m.texto.length > 40 ? '…' : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Risco crítico */}
                {criticosVisiveis.length > 0 && (
                  <div>
                    <Section
                      icon={<AlertTriangle size={10} />}
                      label="Risco crítico"
                      count={criticosVisiveis.length}
                      color="text-red-500 bg-red-50"
                    />
                    {criticosVisiveis.map((a) => (
                      <Link
                        key={a.id}
                        href={`/alunos/${a.id}`}
                        onClick={() => { handleDismiss(`critico_${a.id}`); setOpen(false) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                          <UserX size={11} className="text-red-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-gray-800">{a.nome}</p>
                          <p className="text-[10px] text-gray-400">Score {a.score} · {a.plano}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Follow-ups atrasados */}
                {followUpsVisiveis.length > 0 && (
                  <div>
                    <Section
                      icon={<Clock size={10} />}
                      label="Follow-ups atrasados"
                      count={followUpsVisiveis.length}
                      color="text-amber-600 bg-amber-50"
                    />
                    {followUpsVisiveis.map((a) => (
                      <Link
                        key={a.id}
                        href={`/alunos/${a.id}`}
                        onClick={() => { handleDismiss(`followup_${a.id}`); setOpen(false) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <Clock size={11} className="text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-gray-800">{a.nome}</p>
                          <p className="text-[10px] text-gray-400">
                            Último follow-up: {diasAtras(a.dataUltimoFollowUp)} · {a.plano}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Vencimentos em 7 dias */}
                {vencimentosVisiveis.length > 0 && (
                  <div>
                    <Section
                      icon={<AlertTriangle size={10} />}
                      label="Vencendo em breve"
                      count={vencimentosVisiveis.length}
                      color="text-orange-500 bg-orange-50"
                    />
                    {vencimentosVisiveis.map((a) => (
                      <Link
                        key={a.id}
                        href={`/alunos/${a.id}`}
                        onClick={() => { handleDismiss(`vencimento_${a.id}`); setOpen(false) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                          <AlertTriangle size={11} className="text-orange-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-gray-800">{a.nome}</p>
                          <p className="text-[10px] text-gray-400">
                            Vence {diasRestantes(a.dataVencimento)} · {a.plano}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Tarefas atrasadas */}
                {tarefasVisiveis.length > 0 && (
                  <div>
                    <Section
                      icon={<CheckSquare size={10} />}
                      label="Tarefas atrasadas"
                      count={tarefasVisiveis.length}
                      color="text-indigo-500 bg-indigo-50"
                    />
                    {tarefasVisiveis.map((t) => (
                      <Link
                        key={t.id}
                        href="/tarefas/lista"
                        onClick={() => { handleDismiss(`tarefa_${t.id}`); setOpen(false) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                          <CheckSquare size={11} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-gray-800">{t.titulo}</p>
                          <p className="text-[10px] text-gray-400">
                            {t.aluno?.nome ?? 'Sem aluno'} · {diasAtras(t.prazo)}
                          </p>
                        </div>
                        {t.urgencia === 'CRITICA' && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600">
                            CRÍTICA
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {total > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block text-center text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Ver dashboard completo
              </Link>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
