'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, User, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UrgenciaBadge, urgenciaCores } from '@/components/shared/UrgenciaBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TarefaModal, tarefaFormInicial, type TarefaFormData } from '@/components/shared/TarefaModal'
import { formatDate } from '@/lib/utils'
import { UrgenciaTarefa } from '@prisma/client'
import { toast } from '@/hooks/use-toast'

const urgenciaEventCor: Record<UrgenciaTarefa, string> = {
  BAIXA: 'bg-gray-100 text-gray-700 border-gray-200',
  MEDIA: 'bg-blue-100 text-blue-700 border-blue-200',
  ALTA: 'bg-orange-100 text-orange-700 border-orange-200',
  CRITICA: 'bg-red-100 text-red-700 border-red-200',
}

const avatarCores = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

export default function CalendarioPage() {
  const [tarefas, setTarefas] = useState<any[]>([])
  const [alunosProva, setAlunosProva] = useState<any[]>([])
  const [alunosTodos, setAlunosTodos] = useState<any[]>([])
  const [membros, setMembros] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showTarefas, setShowTarefas] = useState(true)
  const [showProvas, setShowProvas] = useState(true)
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)
  const [filtroResponsavel, setFiltroResponsavel] = useState('TODOS')
  // Modal criar tarefa
  const [novoModal, setNovoModal] = useState(false)
  const [novoForm, setNovoForm] = useState<TarefaFormData>(tarefaFormInicial)
  const [salvando, setSalvando] = useState(false)
  // Modal editar tarefa
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState<TarefaFormData>(tarefaFormInicial)
  const [editandoId, setEditandoId] = useState<string | null>(null)
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

  function isConcluida(t: any) {
    return t.status === 'CONCLUIDA'
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

  function getEventsForDay(day: Date) {
    const dayStr = day.toISOString().split('T')[0]
    const events: any[] = []
    if (showTarefas) {
      tarefasFiltradas.forEach((t) => {
        if (t.prazo && new Date(t.prazo).toISOString().split('T')[0] === dayStr) {
          events.push({ type: 'tarefa', ...t })
        }
      })
    }
    if (showProvas) {
      alunosProva.forEach((a) => {
        if (a.dataProva && new Date(a.dataProva).toISOString().split('T')[0] === dayStr) {
          events.push({ type: 'prova', ...a })
        }
      })
    }
    return events
  }

  function dayToStr(day: Date) {
    return day.toISOString().split('T')[0]
  }

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
              return (
                <div key={di} className={`min-h-[100px] border-r border-gray-100 p-1.5 group/day ${!day ? 'bg-gray-50' : ''}`}>
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-semibold inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                          {day.getDate()}
                        </span>
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
                        {events.length > 3 && <span className="text-[10px] text-gray-400">+{events.length - 3} mais</span>}
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
          return (
            <div key={i} className={`border rounded-lg p-2 min-h-[200px] group/day ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-gray-500">{diasSemana[i]}</div>
                  <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{day.getDate()}</div>
                </div>
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

      {/* Drawer de evento */}
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
    </div>
  )
}
