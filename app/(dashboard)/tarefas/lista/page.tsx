'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskPlan } from '@/components/ui/task-plan'
import { TarefaModal, tarefaFormInicial, type TarefaFormData } from '@/components/shared/TarefaModal'
import { toast } from '@/hooks/use-toast'

export default function ListaTarefasPage() {
  const [tarefas, setTarefas] = useState<any[]>([])
  const [membros, setMembros] = useState<any[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroUrgencia, setFiltroUrgencia] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TarefaFormData>(tarefaFormInicial)

  // Busca apenas tarefas com filtros — usada após mudanças e ao trocar filtros
  const fetchTarefas = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroStatus) params.set('status', filtroStatus)
    if (filtroUrgencia) params.set('urgencia', filtroUrgencia)
    if (filtroResponsavel) params.set('responsavelId', filtroResponsavel)
    const t = await fetch(`/api/tarefas?${params}`).then((r) => r.json())
    setTarefas(Array.isArray(t) ? t : [])
    setLoading(false)
  }, [filtroStatus, filtroUrgencia, filtroResponsavel])

  // Carga inicial: tarefas + membros (alunos carregam só ao abrir o modal)
  useEffect(() => {
    Promise.all([
      fetch('/api/tarefas').then((r) => r.json()),
      fetch('/api/membros').then((r) => r.json()),
    ]).then(([t, m]) => {
      setTarefas(Array.isArray(t) ? t : [])
      setMembros(Array.isArray(m) ? m : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { fetchTarefas() }, [fetchTarefas])

  // Carrega alunos só quando o modal de nova tarefa abre
  function abrirModal() {
    setModal(true)
    if (alunos.length === 0) {
      fetch('/api/alunos?limit=200&status=ATIVO').then((r) => r.json()).then((a) => setAlunos(a.alunos ?? []))
    }
  }

  const tarefasFiltradas = tarefas.filter((t) => {
    if (!mostrarConcluidas && t.status === 'CONCLUIDA') return false
    if (search && !t.titulo.toLowerCase().includes(search.toLowerCase()) && !t.aluno?.nome?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function criarTarefa() {
    if (!form.titulo) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return }
    setSaving(true)
    const res = await fetch('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'Tarefa criada!', variant: 'success' })
      setModal(false)
      setForm(tarefaFormInicial)
      fetchTarefas()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-white">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Lista de tarefas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tarefasFiltradas.length} tarefas · clique no ícone para avançar o status</p>
        </div>
        <HoverBorderGradient as="button" onClick={abrirModal} containerClassName="rounded-lg" className="text-xs font-medium h-8 px-3">
          <Plus size={13} /> Nova tarefa
        </HoverBorderGradient>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 px-7 py-3 border-b border-gray-100 bg-white">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-gray-200 bg-gray-50 focus:bg-white"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-38 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os status</SelectItem>
            <SelectItem value="A_FAZER">A fazer</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
            <SelectItem value="CONCLUIDA">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroUrgencia} onValueChange={(v) => setFiltroUrgencia(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-36 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Toda urgência</SelectItem>
            <SelectItem value="BAIXA">Baixa</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="CRITICA">Crítica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroResponsavel} onValueChange={(v) => setFiltroResponsavel(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-40 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {membros.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none ml-1">
          <input
            type="checkbox"
            checked={mostrarConcluidas}
            onChange={(e) => setMostrarConcluidas(e.target.checked)}
            className="rounded border-gray-300 accent-indigo-600"
          />
          Mostrar concluídas
        </label>
      </div>

      {/* Lista animada */}
      <div className="flex-1 overflow-y-auto px-7 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Carregando tarefas...</p>
          </div>
        ) : tarefasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-gray-400">Nenhuma tarefa encontrada</p>
            <Button size="sm" variant="outline" onClick={() => setModal(true)}>
              <Plus size={14} className="mr-1" /> Criar tarefa
            </Button>
          </div>
        ) : (
          <TaskPlan tarefas={tarefasFiltradas} membros={membros} onUpdate={fetchTarefas} />
        )}
      </div>

      {/* Modal nova tarefa */}
      <TarefaModal
        open={modal}
        onOpenChange={setModal}
        form={form}
        setForm={setForm}
        onSubmit={criarTarefa}
        saving={saving}
        membros={membros}
        alunos={alunos}
      />
    </div>
  )
}
