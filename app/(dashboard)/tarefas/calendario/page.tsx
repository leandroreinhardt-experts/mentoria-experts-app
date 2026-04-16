'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, User, Plus, Pencil, X, ExternalLink, Clock, CheckCircle2, Circle, CircleDotDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UrgenciaBadge, urgenciaCores } from '@/components/shared/UrgenciaBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TarefaModal, tarefaFormInicial, type TarefaFormData } from '@/components/shared/TarefaModal'
import { formatDate } from '@/lib/utils'
import { UrgenciaTarefa } from '@prisma/client'
import { toast } from '@/hooks/use-toast'

const urgenciaEventCor: Record<UrgenciaTarefa, string> = {
  BAIXA:   'bg-gray-100 text-gray-700 border-gray-200',
  MEDIA:   'bg-blue-100 text-blue-700 border-blue-200',
  ALTA:    'bg-orange-100 text-orange-700 border-orange-200',
  CRITICA: 'bg-red-100 text-red-700 border-red-200',
}

const urgenciaDayPanelCor: Record<UrgenciaTarefa, string> = {
  BAIXA:   'border-l-gray-300 bg-gray-50',
  MEDIA:   'border-l-blue-400 bg-blue-50',
  ALTA:    'border-l-orange-400 bg-orange-50',
  CRITICA: 'border-l-red-500 bg-red-50',
}

const avatarCores = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

const urgenciaLabel: Record<UrgenciaTarefa, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
}

const STATUS_MAP: Record<string, { icon: React.ReactNode; label: string; title: string }> = {
  A_FAZER:      { icon: <Circle size={16} className="text-gray-400" />,           label: 'A fazer',       title: 'Marcar como Em andamento' },
  EM_ANDAMENTO: { icon: <CircleDotDashed size={16} className="text-indigo-500" />, label: 'Em andamento',  title: 'Marcar como Concluída' },
  CONCLUIDA:    { icon: <CheckCircle2 size={16} className="text-emerald-500" />,   label: 'Concluída',     title: 'Voltar para A fazer' },
}

const NEXT_STATUS: Record<string, string> = {
  A_FAZER: 'EM_ANDAMENTO',
  EM_ANDAMENTO: 'CONCLUIDA',
  CONCLUIDA: 'A_FAZER',
}

export default function CalendarioPage() {
  const [tarefas, setTarefas]           = useState<any[]>([])
  const [alunosProva, setAlunosProva]   = useState<any[]>([])
  const [alunosTodos, setAlunosTodos]   = useState<any[]>([])
  const [membros, setMembros]           = useState<any[]>([])
  const [viewMode, setViewMode]         = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showTarefas, setShowTarefas]   = useState(true)
  const [showProvas, setShowProvas]     = useState(true)
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)
  const [filtroResponsavel, setFiltroResponsavel] = useState('TODOS')

  // Painel do dia
  const [selectedDay, setSelectedDay]   = useState<Date | null>(null)

  // Modal criar tarefa
  const [novoModal, setNovoModal]       = useState(false)
  const [novoForm, setNovoForm]         = useState<TarefaFormData>(tarefaFormInicial)
  const [salvando, setSalvando]         = useState(false)

  // Modal editar tarefa
  const [editModal, setEditModal]       = useState(false)
  const [editForm, setEditForm]         = useState<TarefaFormData>(tarefaFormInicial)
  const [editandoId, setEditandoId]     = useState<string | null>(null)
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  function fetchTarefas() {
    return fetch('/api/tarefas').then((r) => r.json()).then((t) => {
      setTarefas(Array.isArray(t) ? t.filter((x: any) => x.prazo) : [])
    })
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/tarefas').then((r) => r.json()),
      fetch('/api/alunos?limit=200').then((r) => r.json()),
      fetch('/api/membros').then((r) => r.json()),
    ]).then(([t, a, m]) => {
      setTarefas(Array.isArray(t) ? t.filter((x: any) => x.prazo) : [])
      setAlunosProva(a.alunos?.filter((x: any) => x.dataProva) || [])
      setAlunosTodos(a.alunos ?? [])
      setMembros(Array.isArray(m) ? m : [])
    })
  }, [])

  function abrirNovaTarefa(dataStr: string) {
    setNovoForm({ ...tarefaFormInicial, prazo: dataStr })
    setNovoModal(true)
  }

  async function criarTarefa() {
    if (!novoForm.titulo) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return }
    setSalvando(true)
    const res = await fetch('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoForm),
    })
    setSalvando(false)
    if (res.ok) {
      toast({ title: 'Tarefa criada!', variant: 'success' })
      setNovoModal(false)
      setNovoForm(tarefaFormInicial)
      fetchTarefas()
    }
  }

  function abrirEdicao(ev: any) {
    setEditandoId(ev.id)
    setEditForm({
      titulo: ev.titulo,
      descricao: ev.descricao ?? '',
      responsavelId: ev.responsavel?.id ?? '',
      prazo: ev.prazo ? new Date(ev.prazo).toISOString().split('T')[0] : '',
      urgencia: ev.urgencia,
      alunoId: ev.aluno?.id ?? '',
    })
    setEditModal(true)
    setSelectedEvent(null)
  }

  async function salvarEdicao() {
    if (!editandoId) return
    setSalvandoEdit(true)
    const res = await fetch(`/api/tarefas/${editandoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, status: tarefas.find(t => t.id === editandoId)?.status }),
    })
    setSalvandoEdit(false)
    if (res.ok) {
      toast({ title: 'Tarefa atualizada!', variant: 'success' })
      setEditModal(false)
      fetchTarefas()
    }
  }

  function isConcluida(t: any) { return t.status === 'CONCLUIDA' }

  async function ciclicaStatus(id: string, currentStatus: string) {
    const novoStatus = NEXT_STATUS[currentStatus] ?? 'EM_ANDAMENTO'
    // Atualiza otimisticamente no estado local
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t))
    fetch(`/api/tarefas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    }).catch(() => {
      // Reverte em caso de erro
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t))
    })
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  const tarefasFiltradas = tarefas
    .filter((t) => mostrarConcluidas || !isConcluida(t))
    .filter((t) =>
      filtroResponsavel === 'TODOS' ? true
      : filtroResponsavel === 'SEM_RESPONSAVEL' ? !t.responsavelId
      : t.responsavelId === filtroResponsavel
    )

  // Tarefas do dia (sem filtro de concluída — para o painel mostrar tudo)
  function getTarefasForDay(day: Date) {
    const dayStr = day.toISOString().split('T')[0]
    return tarefas.filter((t) =>
      t.prazo && new Date(t.prazo).toISOString().split('T')[0] === dayStr
    )
  }

  function getEventsForDay(day: Date) {
    const dayStr = day.toISOString().split('T')[0]
    const events: any[] = []
    if (showTarefas) {
      tarefasFiltradas.forEach((t) => {
        if (t.prazo && new Date(t.prazo).toISOString().split('T')[0] === dayStr)
          events.push({ type: 'tarefa', ...t })
      })
    }
    if (showProvas) {
      alunosProva.forEach((a) => {
        if (a.dataProva && new Date(a.dataProva).toISOString().split('T')[0] === dayStr)
          events.push({ type: 'prova', ...a })
      })
    }
    return events
  }

  function dayToStr(day: Date) { return day.toISOString().split('T')[0] }

  // ─── Painel lateral do dia ────────────────────────────────────────────────
  function DayPanel() {
    if (!selectedDay) return null
    const tarefasDia = getTarefasForDay(selectedDay)
    const provasDia  = alunosProva.filter((a) =>
      a.dataProva && new Date(a.dataProva).toISOString().split('T')[0] === dayToStr(selectedDay)
    )
    const pendentes  = tarefasDia.filter((t) => t.status !== 'CONCLUIDA')
    const concluidas = tarefasDia.filter((t) => t.status === 'CONCLUIDA')

    const dataFormatada = selectedDay.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })

    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setSelectedDay(null)}
        />
        {/* Drawer */}
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 capitalize">
                {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })}
              </p>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedDay.getUTCDate()} de{' '}
                {selectedDay.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
                {concluidas.length > 0 && ` · ${concluidas.length} concluída${concluidas.length !== 1 ? 's' : ''}`}
                {provasDia.length > 0 && ` · ${provasDia.length} prova${provasDia.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { abrirNovaTarefa(dayToStr(selectedDay)); setSelectedDay(null) }}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[12px] font-medium transition-colors"
                title="Nova tarefa neste dia"
              >
                <Plus size={13} /> Nova tarefa
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Provas */}
            {provasDia.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-purple-500 mb-2">
                  📅 Provas ({provasDia.length})
                </h3>
                <div className="space-y-2">
                  {provasDia.map((a) => (
                    <Link
                      key={a.id}
                      href={`/alunos/${a.id}`}
                      onClick={() => setSelectedDay(null)}
                      className="flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-purple-800">{a.nome}</p>
                        {a.areaEstudo && <p className="text-xs text-purple-500 mt-0.5">{a.areaEstudo}</p>}
                      </div>
                      <ExternalLink size={13} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Tarefas pendentes */}
            {pendentes.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Pendentes ({pendentes.length})
                </h3>
                <div className="space-y-2">
                  {pendentes.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-lg border border-l-4 p-3 ${urgenciaDayPanelCor[t.urgencia as UrgenciaTarefa] ?? 'border-l-gray-300 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <button
                              onClick={() => ciclicaStatus(t.id, t.status)}
                              title={(STATUS_MAP[t.status] ?? STATUS_MAP.A_FAZER).title}
                              className="flex-shrink-0 hover:scale-110 active:scale-90 transition-transform"
                            >
                              {(STATUS_MAP[t.status] ?? STATUS_MAP.A_FAZER).icon}
                            </button>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              {urgenciaLabel[t.urgencia as UrgenciaTarefa]}
                            </span>
                          </div>
                          <p className={`text-sm font-semibold leading-snug ${t.status === 'CONCLUIDA' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.titulo}</p>
                          {t.descricao && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.descricao}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {t.aluno && (
                              <Link
                                href={`/alunos/${t.aluno.id}`}
                                onClick={() => setSelectedDay(null)}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <ExternalLink size={10} />
                                {t.aluno.nome}
                              </Link>
                            )}
                            {t.responsavel && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <div className={`w-4 h-4 rounded-full ${avatarCores[membros.findIndex(m => m.id === t.responsavel.id) % avatarCores.length] ?? 'bg-gray-400'} text-white text-[9px] flex items-center justify-center font-bold`}>
                                  {t.responsavel.nome?.[0]?.toUpperCase()}
                                </div>
                                {t.responsavel.nome}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => { abrirEdicao(t); setSelectedDay(null) }}
                          className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-white/70 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tarefas concluídas */}
            {concluidas.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500 mb-2">
                  Concluídas ({concluidas.length})
                </h3>
                <div className="space-y-2">
                  {concluidas.map((t) => (
                    <div key={t.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 opacity-60">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 line-through truncate">{t.titulo}</p>
                          {t.aluno && (
                            <p className="text-xs text-gray-400 truncate">{t.aluno.nome}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Vazio */}
            {tarefasDia.length === 0 && provasDia.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Clock size={22} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">Nenhuma tarefa neste dia</p>
                <button
                  onClick={() => { abrirNovaTarefa(dayToStr(selectedDay)); setSelectedDay(null) }}
                  className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  + Criar nova tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // ─── Renderização do mês ──────────────────────────────────────────────────
  function renderMes() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = new Date(year, month, 1).getDay()
    const weeks: (Date | null)[][] = []
    let week: (Date | null)[] = Array(firstDay).fill(null)

    for (let d = 1; d <= daysInMonth; d++) {
      week.push(new Date(year, month, d))
      if (week.length === 7) { weeks.push(week); week = [] }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }

    const today = new Date().toISOString().split('T')[0]
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-gray-200">
          {diasSemana.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100">
            {week.map((day, di) => {
              const events = day ? getEventsForDay(day) : []
              const isToday = day?.toISOString().split('T')[0] === today
              const isSelected = selectedDay && day && dayToStr(day) === dayToStr(selectedDay)
              return (
                <div key={di} className={`min-h-[100px] border-r border-gray-100 p-1.5 group/day ${!day ? 'bg-gray-50' : ''}`}>
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-0.5">
                        <button
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`text-xs font-semibold inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                            isToday
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : isSelected
                                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
                                : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          title={`Ver tarefas de ${day.getDate()}`}
                        >
                          {day.getDate()}
                        </button>
                        <button
                          onClick={() => abrirNovaTarefa(dayToStr(day))}
                          className="opacity-0 group-hover/day:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-600"
                          title="Nova tarefa neste dia"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, 3).map((ev, ei) => (
                          <button
                            key={ei}
                            onClick={() => setSelectedEvent(ev)}
                            className={`w-full text-left px-1.5 py-0.5 rounded border ${ev.type === 'prova' ? 'bg-purple-100 text-purple-700 border-purple-200' : urgenciaEventCor[ev.urgencia as UrgenciaTarefa]} ${ev.type === 'tarefa' && ev.status === 'CONCLUIDA' ? 'opacity-50' : ''}`}
                          >
                            {ev.type === 'prova' ? (
                              <span className="text-[10px] font-medium truncate block">📅 {ev.nome}</span>
                            ) : (
                              <>
                                {ev.aluno && <span className="text-[9px] font-semibold opacity-75 truncate block leading-tight">{ev.aluno.nome}</span>}
                                <span className="text-[10px] font-medium truncate block">{ev.titulo}</span>
                              </>
                            )}
                          </button>
                        ))}
                        {events.length > 3 && (
                          <button
                            onClick={() => setSelectedDay(day)}
                            className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium w-full text-left"
                          >
                            +{events.length - 3} mais
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // ─── Renderização da semana ───────────────────────────────────────────────
  function renderSemana() {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return d
    })
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const today = new Date().toISOString().split('T')[0]

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const events = getEventsForDay(day)
          const isToday = day.toISOString().split('T')[0] === today
          const isSelected = selectedDay && dayToStr(day) === dayToStr(selectedDay)
          return (
            <div key={i} className={`border rounded-lg p-2 min-h-[200px] group/day ${isToday ? 'border-blue-400 bg-blue-50' : isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="text-left"
                >
                  <div className="text-xs text-gray-500">{diasSemana[i]}</div>
                  <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : isSelected ? 'text-indigo-600' : 'text-gray-800'}`}>{day.getDate()}</div>
                </button>
                <button
                  onClick={() => abrirNovaTarefa(dayToStr(day))}
                  className="opacity-0 group-hover/day:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-600"
                  title="Nova tarefa neste dia"
                >
                  <Plus size={11} />
                </button>
              </div>
              <div className="space-y-1">
                {events.map((ev, ei) => (
                  <button
                    key={ei}
                    onClick={() => setSelectedEvent(ev)}
                    className={`w-full text-left px-1.5 py-1 rounded border ${ev.type === 'prova' ? 'bg-purple-100 text-purple-700 border-purple-200' : urgenciaEventCor[ev.urgencia as UrgenciaTarefa]} ${ev.type === 'tarefa' && ev.status === 'CONCLUIDA' ? 'opacity-50' : ''}`}
                  >
                    {ev.type === 'prova' ? (
                      <span className="text-[10px] font-medium truncate block">📅 {ev.nome}</span>
                    ) : (
                      <>
                        {ev.aluno && <span className="text-[9px] font-semibold opacity-75 truncate block leading-tight">{ev.aluno.nome}</span>}
                        <span className="text-[10px] font-medium truncate block">{ev.titulo}</span>
                        <span className="text-[9px] opacity-60 capitalize">{ev.urgencia?.toLowerCase()}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const mesNome = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })

  function navegar(dir: 1 | -1) {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + 7 * dir)
    setCurrentDate(d)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showTarefas} onChange={(e) => setShowTarefas(e.target.checked)} className="rounded accent-indigo-600" />
            Tarefas
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showProvas} onChange={(e) => setShowProvas(e.target.checked)} className="rounded accent-indigo-600" />
            Provas
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={mostrarConcluidas} onChange={(e) => setMostrarConcluidas(e.target.checked)} className="rounded accent-indigo-600" />
            Mostrar concluídas
          </label>
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <Button variant="ghost" size="sm" className={`rounded-none ${viewMode === 'month' ? 'bg-gray-100' : ''}`} onClick={() => setViewMode('month')}>Mês</Button>
            <Button variant="ghost" size="sm" className={`rounded-none ${viewMode === 'week' ? 'bg-gray-100' : ''}`} onClick={() => setViewMode('week')}>Semana</Button>
          </div>
        </div>
      </div>

      {/* Filtro por responsável */}
      <div className="flex items-center gap-2 flex-wrap">
        <User size={15} className="text-gray-500" />
        <span className="text-sm text-gray-600 font-medium">Responsável:</span>
        <button
          onClick={() => setFiltroResponsavel('TODOS')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filtroResponsavel === 'TODOS' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          Todos
        </button>
        {membros.map((m: any, idx: number) => (
          <button
            key={m.id}
            onClick={() => setFiltroResponsavel(m.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filtroResponsavel === m.id ? `${avatarCores[idx % avatarCores.length]} text-white border-transparent` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {m.nome}
          </button>
        ))}
        <button
          onClick={() => setFiltroResponsavel('SEM_RESPONSAVEL')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filtroResponsavel === 'SEM_RESPONSAVEL' ? 'bg-gray-500 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          Sem responsável
        </button>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2">
        <Button variant="ghost" size="icon" onClick={() => navegar(-1)}><ChevronLeft size={18} /></Button>
        <span className="flex-1 text-center font-semibold text-gray-800 capitalize">{mesNome}</span>
        <Button variant="ghost" size="icon" onClick={() => navegar(1)}><ChevronRight size={18} /></Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {viewMode === 'month' ? renderMes() : <div className="p-4">{renderSemana()}</div>}
      </div>

      {/* Modal criar tarefa */}
      <TarefaModal
        open={novoModal}
        onOpenChange={setNovoModal}
        form={novoForm}
        setForm={setNovoForm}
        onSubmit={criarTarefa}
        saving={salvando}
        membros={membros}
        alunos={alunosTodos}
      />

      {/* Modal editar tarefa */}
      <TarefaModal
        open={editModal}
        onOpenChange={setEditModal}
        form={editForm}
        setForm={setEditForm}
        onSubmit={salvarEdicao}
        saving={salvandoEdit}
        membros={membros}
        alunos={alunosTodos}
        titulo="Editar tarefa"
        labelSubmit="Salvar"
      />

      {/* Modal detalhe de evento individual */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedEvent.type === 'prova' ? `Prova: ${selectedEvent.nome}` : selectedEvent.titulo}
              </DialogTitle>
            </DialogHeader>
            {selectedEvent.type === 'tarefa' ? (
              <div className="space-y-3">
                {selectedEvent.descricao && <p className="text-sm text-gray-600">{selectedEvent.descricao}</p>}
                <div className="flex gap-2 flex-wrap">
                  <UrgenciaBadge urgencia={selectedEvent.urgencia} />
                  <span className="text-sm text-gray-500">Prazo: {formatDate(selectedEvent.prazo)}</span>
                </div>
                {selectedEvent.responsavel && (
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${avatarCores[membros.findIndex(m => m.id === selectedEvent.responsavel.id) % avatarCores.length] ?? 'bg-gray-400'} text-white text-xs flex items-center justify-center font-bold`}>
                      {selectedEvent.responsavel.nome?.[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm font-medium">{selectedEvent.responsavel.nome}</p>
                  </div>
                )}
                {selectedEvent.aluno && (
                  <Link href={`/alunos/${selectedEvent.aluno.id}`} className="text-sm text-blue-600 hover:underline">
                    Ver aluno: {selectedEvent.aluno.nome}
                  </Link>
                )}
                <div className="pt-1 border-t border-gray-100">
                  <Button size="sm" variant="outline" onClick={() => abrirEdicao(selectedEvent)}>
                    <Pencil size={13} className="mr-1.5" /> Editar tarefa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm"><strong>Data da prova:</strong> {formatDate(selectedEvent.dataProva)}</p>
                {selectedEvent.areaEstudo && <p className="text-sm"><strong>Cargo:</strong> {selectedEvent.areaEstudo}</p>}
                <Link href={`/alunos/${selectedEvent.id}`} className="text-sm text-blue-600 hover:underline block">
                  Ver perfil do aluno
                </Link>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Painel lateral do dia */}
      <DayPanel />
    </div>
  )
}
