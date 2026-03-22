'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Loader2, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UrgenciaBadge } from '@/components/shared/UrgenciaBadge'
import { TarefaModal, tarefaFormInicial, type TarefaFormData } from '@/components/shared/TarefaModal'
import { FaseBadge } from '@/components/shared/FaseBadge'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { FaseMentoria, StatusTarefa, UrgenciaTarefa } from '@prisma/client'
import Link from 'next/link'

const colunas: { status: StatusTarefa; label: string; cor: string }[] = [
  { status: 'A_FAZER' as StatusTarefa, label: 'A fazer', cor: 'bg-gray-100 border-gray-200' },
  { status: 'EM_ANDAMENTO' as StatusTarefa, label: 'Em andamento', cor: 'bg-blue-50 border-blue-200' },
  { status: 'CONCLUIDA' as StatusTarefa, label: 'Concluída', cor: 'bg-green-50 border-green-200' },
]

const avatarCores = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

const VINTE_QUATRO_HORAS = 24 * 60 * 60 * 1000

function concluidaRecente(t: any) {
  if (!t.concluidaEm) return true // sem data, mostra por precaução
  return Date.now() - new Date(t.concluidaEm).getTime() < VINTE_QUATRO_HORAS
}

export default function BoardPage() {
  const [tarefas, setTarefas] = useState<any[]>([])
  const [membros, setMembros] = useState<any[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filtroResponsavel, setFiltroResponsavel] = useState('TODOS')
  const [mostrarAntigas, setMostrarAntigas] = useState(false)
  const [form, setForm] = useState<TarefaFormData>(tarefaFormInicial)

  // Busca apenas tarefas — usada após mudanças
  const fetchTarefas = useCallback(async () => {
    const t = await fetch('/api/tarefas').then((r) => r.json())
    setTarefas(Array.isArray(t) ? t : [])
  }, [])

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

  // Carrega alunos só quando o modal de nova tarefa abre
  function abrirModal() {
    setModal(true)
    if (alunos.length === 0) {
      fetch('/api/alunos?limit=200&status=ATIVO').then((r) => r.json()).then((a) => setAlunos(a.alunos ?? []))
    }
  }

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

  async function moverTarefa(id: string, novoStatus: StatusTarefa) {
    // Atualiza local imediatamente (optimistic) — sem refetch
    setTarefas((prev) => prev.map((t) => t.id === id ? { ...t, status: novoStatus } : t))
    fetch(`/api/tarefas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    }).catch(() => {})
  }

  async function salvarEdicao() {
    if (!editModal) return
    setSaving(true)
    await fetch(`/api/tarefas/${editModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editModal),
    })
    setSaving(false)
    setEditModal(null)
    fetchTarefas()
  }

  function getAvatarCor(membroId: string) {
    const idx = membros.findIndex((m) => m.id === membroId)
    return avatarCores[idx % avatarCores.length] ?? 'bg-gray-400'
  }

  if (loading) return <div className="flex h-full items-center justify-center p-8 text-gray-500"><Loader2 className="animate-spin mr-2" /> Carregando...</div>

  const tarefasFiltradas = filtroResponsavel === 'TODOS'
    ? tarefas
    : filtroResponsavel === 'SEM_RESPONSAVEL'
      ? tarefas.filter((t) => !t.responsavelId)
      : tarefas.filter((t) => t.responsavelId === filtroResponsavel)

  function tarefasPorStatus(status: StatusTarefa) {
    const items = tarefasFiltradas.filter((t) => t.status === status)
    if (status !== 'CONCLUIDA') return items
    return mostrarAntigas ? items : items.filter(concluidaRecente)
  }

  const antigasOcultas = tarefasFiltradas.filter(
    (t) => t.status === 'CONCLUIDA' && !concluidaRecente(t)
  ).length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Board de tarefas</h1>
        <HoverBorderGradient as="button" onClick={abrirModal} containerClassName="rounded-lg" className="text-xs font-medium h-8 px-3">
          <Plus size={13} /> Nova tarefa
        </HoverBorderGradient>
      </div>

      {/* Filtro por responsável */}
      <div className="flex items-center gap-2">
        <User size={16} className="text-gray-500" />
        <span className="text-sm text-gray-600 font-medium">Filtrar por responsável:</span>
        <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {colunas.map((col) => {
          const items = tarefasPorStatus(col.status)
          const isConcluida = col.status === 'CONCLUIDA'
          return (
            <div key={col.status} className={`flex-shrink-0 w-80 rounded-xl border-2 ${col.cor} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                <span className="bg-white rounded-full px-2 py-0.5 text-xs font-semibold text-gray-600 border">
                  {items.length}
                </span>
              </div>

              {/* Botão mostrar antigas — só na coluna Concluída */}
              {isConcluida && antigasOcultas > 0 && (
                <button
                  onClick={() => setMostrarAntigas((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1.5 mb-2 border border-dashed border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  {mostrarAntigas
                    ? <><EyeOff size={12} /> Ocultar antigas ({antigasOcultas})</>
                    : <><Eye size={12} /> Mostrar concluídas antigas ({antigasOcultas})</>}
                </button>
              )}

              <div className="space-y-2 min-h-[200px]">
                {items.map((t: any) => (
                  <div
                    key={t.id}
                    className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${t.status === 'CONCLUIDA' ? 'opacity-70' : ''}`}
                    onClick={() => setEditModal({ ...t })}
                  >
                    {/* Nome do aluno no topo */}
                    {t.aluno && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[10px] font-semibold text-indigo-600 truncate">{t.aluno.nome}</span>
                        <FaseBadge fase={t.aluno.faseAtual as FaseMentoria} className="text-[10px] px-1.5 py-0" />
                      </div>
                    )}
                    <p className={`font-medium text-sm mb-1.5 ${t.status === 'CONCLUIDA' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.titulo}</p>
                    <div className="flex items-center justify-between mt-2">
                      <UrgenciaBadge urgencia={t.urgencia} />
                      {t.prazo && <span className="text-xs text-gray-400">{formatDate(t.prazo)}</span>}
                    </div>
                    {/* Chip do responsável */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                      {t.responsavel ? (
                        <>
                          <div className={`w-5 h-5 rounded-full ${getAvatarCor(t.responsavel.id)} text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0`}>
                            {t.responsavel.nome?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-700 font-semibold truncate">{t.responsavel.nome}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sem responsável</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal criar */}
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

      {/* Modal editar */}
      {editModal && (
        <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar tarefa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={editModal.titulo} onChange={(e) => setEditModal((f: any) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={editModal.descricao || ''} onChange={(e) => setEditModal((f: any) => ({ ...f, descricao: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editModal.status} onValueChange={(v) => setEditModal((f: any) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A_FAZER">A fazer</SelectItem>
                      <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                      <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Urgência</Label>
                  <Select value={editModal.urgencia} onValueChange={(v) => setEditModal((f: any) => ({ ...f, urgencia: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="CRITICA">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select
                  value={editModal.responsavelId || ''}
                  onValueChange={(v) => setEditModal((f: any) => ({ ...f, responsavelId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {membros.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editModal.aluno && (
                <div className="text-sm text-gray-500">
                  Aluno: <Link href={`/alunos/${editModal.aluno.id}`} className="text-blue-600 hover:underline">{editModal.aluno.nome}</Link>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
