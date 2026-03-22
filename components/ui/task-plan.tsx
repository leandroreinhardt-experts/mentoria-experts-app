"use client"

import React, { useState } from "react"
import {
  CheckCircle2, Circle, CircleDotDashed, ChevronDown,
  Plus, Trash2, X, Loader2, Pencil,
} from "lucide-react"
import { motion, AnimatePresence, LayoutGroup, type Variants } from "framer-motion"
import { UrgenciaBadge } from "@/components/shared/UrgenciaBadge"
import { TarefaModal, type TarefaFormData } from "@/components/shared/TarefaModal"
import { toast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Subtarefa {
  id: string
  titulo: string
  descricao?: string | null
  status: string
  urgencia: string
  prazo?: string | null
  responsavel?: { id: string; nome: string } | null
}

interface Tarefa {
  id: string
  titulo: string
  descricao?: string | null
  status: string
  urgencia: string
  prazo?: string | null
  responsavel?: { id: string; nome: string } | null
  aluno?: { id: string; nome: string } | null
  subtarefas: Subtarefa[]
}

interface Props {
  tarefas: Tarefa[]
  membros: { id: string; nome: string }[]
  onUpdate: () => void
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { icon: React.ReactNode; label: string; badge: string }> = {
  A_FAZER: {
    icon: <Circle className="h-4 w-4 text-gray-400" />,
    label: "A fazer",
    badge: "bg-gray-100 text-gray-600",
  },
  EM_ANDAMENTO: {
    icon: <CircleDotDashed className="h-4 w-4 text-indigo-500" />,
    label: "Em andamento",
    badge: "bg-indigo-100 text-indigo-700",
  },
  CONCLUIDA: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "Concluída",
    badge: "bg-emerald-100 text-emerald-700",
  },
}

const NEXT_STATUS: Record<string, string> = {
  A_FAZER: "EM_ANDAMENTO",
  EM_ANDAMENTO: "CONCLUIDA",
  CONCLUIDA: "A_FAZER",
}

// ─── Animações ───────────────────────────────────────────────────────────────

const ease = [0.2, 0.65, 0.3, 0.9] as [number, number, number, number]

const listVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    height: "auto", opacity: 1,
    transition: { duration: 0.25, staggerChildren: 0.04, when: "beforeChildren", ease },
  },
  exit: {
    height: 0, opacity: 0,
    transition: { duration: 0.2, ease },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 500, damping: 28 } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
}

const iconVariants: Variants = {
  initial: { opacity: 0, scale: 0.7, rotate: -10 },
  animate: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, scale: 0.7, rotate: 10, transition: { duration: 0.15 } },
}

// ─── Componente principal ────────────────────────────────────────────────────

export function TaskPlan({ tarefas: initialTarefas, membros, onUpdate }: Props) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialTarefas)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({})
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null)
  const [subForm, setSubForm] = useState({ titulo: "", descricao: "", urgencia: "MEDIA", prazo: "", responsavelId: "" })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null)
  const [editForm, setEditForm] = useState<TarefaFormData>({ titulo: "", descricao: "", responsavelId: "", prazo: "", urgencia: "MEDIA", alunoId: "" })
  const [savingEdit, setSavingEdit] = useState(false)

  // Sincronizar quando a prop muda externamente
  React.useEffect(() => { setTarefas(initialTarefas) }, [initialTarefas])

  // ── Status cycling ──────────────────────────────────────────────────────────

  async function ciclicaStatus(id: string, currentStatus: string, parentId?: string) {
    const novoStatus = NEXT_STATUS[currentStatus]

    // Otimista
    if (parentId) {
      setTarefas(prev => prev.map(t => t.id === parentId
        ? { ...t, subtarefas: t.subtarefas.map(s => s.id === id ? { ...s, status: novoStatus } : s) }
        : t
      ))
    } else {
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t))
    }

    // Fire-and-forget: estado local já foi atualizado otimisticamente
    fetch(`/api/tarefas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    }).catch(() => {})
  }

  // ── Criar subtarefa ─────────────────────────────────────────────────────────

  async function criarSubtarefa(parentId: string) {
    if (!subForm.titulo.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return }
    setSaving(true)
    const res = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...subForm, parentId }),
    })
    setSaving(false)
    if (res.ok) {
      const nova = await res.json()
      setTarefas(prev => prev.map(t => t.id === parentId
        ? { ...t, subtarefas: [...t.subtarefas, nova] }
        : t
      ))
      setSubForm({ titulo: "", descricao: "", urgencia: "MEDIA", prazo: "", responsavelId: "" })
      setAddingSubTo(null)
      toast({ title: "Subtarefa criada!", variant: "success" })
      onUpdate()
    }
  }

  // ── Excluir tarefa / subtarefa ──────────────────────────────────────────────

  async function excluir(id: string, parentId?: string) {
    setDeletingId(id)
    await fetch(`/api/tarefas/${id}`, { method: "DELETE" })
    setDeletingId(null)
    if (parentId) {
      setTarefas(prev => prev.map(t => t.id === parentId
        ? { ...t, subtarefas: t.subtarefas.filter(s => s.id !== id) }
        : t
      ))
    } else {
      setTarefas(prev => prev.filter(t => t.id !== id))
    }
    // Estado local já atualizado — sem refetch
  }

  // ── Editar tarefa ───────────────────────────────────────────────────────────

  function abrirEdicao(tarefa: Tarefa) {
    setEditingTarefa(tarefa)
    setEditForm({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao ?? "",
      responsavelId: tarefa.responsavel?.id ?? "",
      prazo: tarefa.prazo ? new Date(tarefa.prazo).toISOString().split("T")[0] : "",
      urgencia: tarefa.urgencia,
      alunoId: tarefa.aluno?.id ?? "",
    })
  }

  async function salvarEdicao() {
    if (!editingTarefa) return
    setSavingEdit(true)
    const res = await fetch(`/api/tarefas/${editingTarefa.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: editForm.titulo,
        descricao: editForm.descricao,
        responsavelId: editForm.responsavelId || null,
        prazo: editForm.prazo || null,
        urgencia: editForm.urgencia,
        alunoId: editForm.alunoId || null,
        status: editingTarefa.status,
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      const updated = await res.json()
      setTarefas(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
      toast({ title: "Tarefa atualizada!", variant: "success" })
      setEditingTarefa(null)
      // Estado local já atualizado com dados do servidor
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <LayoutGroup>
      {/* Modal de edição */}
      <TarefaModal
        open={!!editingTarefa}
        onOpenChange={(v) => { if (!v) setEditingTarefa(null) }}
        form={editForm}
        setForm={setEditForm as any}
        onSubmit={salvarEdicao}
        saving={savingEdit}
        membros={membros}
        titulo="Editar tarefa"
        labelSubmit="Salvar"
      />

      <div className="space-y-1">
        {tarefas.map((tarefa) => {
          const isExpanded = expanded[tarefa.id]
          const statusInfo = STATUS_MAP[tarefa.status] ?? STATUS_MAP.A_FAZER
          const progress = tarefa.subtarefas.length > 0
            ? Math.round((tarefa.subtarefas.filter(s => s.status === "CONCLUIDA").length / tarefa.subtarefas.length) * 100)
            : null

          return (
            <motion.div
              key={tarefa.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm"
            >
              {/* ── Linha da tarefa ── */}
              <div className="flex items-start gap-2 px-4 py-3 group">
                {/* Status icon */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={() => ciclicaStatus(tarefa.id, tarefa.status)}
                  title="Alterar status"
                  className="flex-shrink-0 mt-0.5"
                >
                  <AnimatePresence mode="wait">
                    <motion.span key={tarefa.status} variants={iconVariants} initial="initial" animate="animate" exit="exit">
                      {statusInfo.icon}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>

                {/* Título + meta */}
                <button
                  onClick={() => setExpanded(p => ({ ...p, [tarefa.id]: !p[tarefa.id] }))}
                  className="flex flex-1 flex-col gap-1 text-left min-w-0"
                >
                  {/* Nome do aluno no topo */}
                  {tarefa.aluno && (
                    <span className="text-[10px] font-semibold text-indigo-600 truncate leading-none">
                      {tarefa.aluno.nome}
                    </span>
                  )}

                  <div className="flex items-center gap-3 w-full min-w-0">
                    <span className={`flex-1 text-sm font-medium truncate ${tarefa.status === "CONCLUIDA" ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {tarefa.titulo}
                    </span>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {tarefa.subtarefas.length > 0 && (
                        <span className="text-[11px] text-gray-400 font-medium">
                          {tarefa.subtarefas.filter(s => s.status === "CONCLUIDA").length}/{tarefa.subtarefas.length}
                        </span>
                      )}
                      <motion.span
                        key={tarefa.status}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1, transition: { type: "spring", stiffness: 500 } }}
                        className={`hidden sm:inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${statusInfo.badge}`}
                      >
                        {statusInfo.label}
                      </motion.span>
                      <UrgenciaBadge urgencia={tarefa.urgencia as any} className="text-[10px] px-1.5 py-0.5" />
                      {tarefa.prazo && (
                        <span className={`text-[11px] ${new Date(tarefa.prazo) < new Date() && tarefa.status !== "CONCLUIDA" ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                          {formatDate(tarefa.prazo)}
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Chip do responsável */}
                  {tarefa.responsavel && (
                    <span className="inline-flex items-center gap-1 self-start bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                      <span className="w-3.5 h-3.5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[8px] font-bold">
                        {tarefa.responsavel.nome[0].toUpperCase()}
                      </span>
                      {tarefa.responsavel.nome}
                    </span>
                  )}
                </button>

                {/* Ações */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => { setAddingSubTo(tarefa.id); setExpanded(p => ({ ...p, [tarefa.id]: true })) }}
                    title="Adicionar subtarefa"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={() => abrirEdicao(tarefa)}
                    title="Editar tarefa"
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => excluir(tarefa.id)}
                    title="Excluir tarefa"
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {deletingId === tarefa.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              {/* ── Barra de progresso ── */}
              {progress !== null && (
                <div className="px-4 pb-1">
                  <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* ── Subtarefas ── */}
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative border-t border-gray-50"
                  >
                    {/* Linha vertical */}
                    <div className="absolute left-[28px] top-0 bottom-0 w-px bg-gray-100" />

                    <ul className="py-1.5 px-4 space-y-0.5">
                      <AnimatePresence>
                        {tarefa.subtarefas.map((sub) => {
                          const subStatus = STATUS_MAP[sub.status] ?? STATUS_MAP.A_FAZER
                          const subKey = `${tarefa.id}-${sub.id}`
                          return (
                            <motion.li
                              key={sub.id}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              layout
                              className="group/sub flex items-start gap-2 pl-4"
                            >
                              {/* Sub status icon */}
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => ciclicaStatus(sub.id, sub.status, tarefa.id)}
                                className="mt-2 flex-shrink-0"
                                title="Alterar status"
                              >
                                <AnimatePresence mode="wait">
                                  <motion.span key={sub.status} variants={iconVariants} initial="initial" animate="animate" exit="exit">
                                    <span className="scale-90 block">{subStatus.icon}</span>
                                  </motion.span>
                                </AnimatePresence>
                              </motion.button>

                              {/* Sub conteúdo */}
                              <button
                                onClick={() => setExpandedSub(p => ({ ...p, [subKey]: !p[subKey] }))}
                                className="flex-1 text-left py-1.5 min-w-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`text-[13px] ${sub.status === "CONCLUIDA" ? "line-through text-gray-400" : "text-gray-700"}`}>
                                    {sub.titulo}
                                  </span>
                                  <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                                    <UrgenciaBadge urgencia={sub.urgencia as any} className="text-[9px] px-1 py-0" />
                                    {sub.prazo && (
                                      <span className={`text-[10px] ${new Date(sub.prazo) < new Date() && sub.status !== "CONCLUIDA" ? "text-red-500" : "text-gray-400"}`}>
                                        {formatDate(sub.prazo)}
                                      </span>
                                    )}
                                    {sub.responsavel && (
                                      <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[9px] flex items-center justify-center font-bold" title={sub.responsavel.nome}>
                                        {sub.responsavel.nome[0].toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Detalhe expandido */}
                                <AnimatePresence>
                                  {expandedSub[subKey] && sub.descricao && (
                                    <motion.p
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto", transition: { duration: 0.2 } }}
                                      exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                                      className="text-[11px] text-gray-400 mt-0.5 overflow-hidden"
                                    >
                                      {sub.descricao}
                                    </motion.p>
                                  )}
                                </AnimatePresence>
                              </button>

                              {/* Excluir subtarefa */}
                              <button
                                onClick={() => excluir(sub.id, tarefa.id)}
                                className="mt-1.5 p-1 rounded opacity-0 group-hover/sub:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                                title="Excluir subtarefa"
                              >
                                {deletingId === sub.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                              </button>
                            </motion.li>
                          )
                        })}
                      </AnimatePresence>

                      {/* ── Formulário nova subtarefa ── */}
                      <AnimatePresence>
                        {addingSubTo === tarefa.id && (
                          <motion.li
                            key="new-sub-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto", transition: { duration: 0.2 } }}
                            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                            className="pl-4 pt-2 pb-1"
                          >
                            <div className="border border-indigo-200 bg-indigo-50/60 rounded-lg p-3 space-y-2">
                              <input
                                autoFocus
                                placeholder="Título da subtarefa..."
                                value={subForm.titulo}
                                onChange={e => setSubForm(f => ({ ...f, titulo: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") criarSubtarefa(tarefa.id); if (e.key === "Escape") setAddingSubTo(null) }}
                                className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-800"
                              />
                              <div className="flex items-center gap-2 flex-wrap">
                                <select
                                  value={subForm.urgencia}
                                  onChange={e => setSubForm(f => ({ ...f, urgencia: e.target.value }))}
                                  className="text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 outline-none"
                                >
                                  <option value="BAIXA">Baixa</option>
                                  <option value="MEDIA">Média</option>
                                  <option value="ALTA">Alta</option>
                                  <option value="CRITICA">Crítica</option>
                                </select>
                                <input
                                  type="date"
                                  value={subForm.prazo}
                                  onChange={e => setSubForm(f => ({ ...f, prazo: e.target.value }))}
                                  className="text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 outline-none"
                                />
                                <select
                                  value={subForm.responsavelId}
                                  onChange={e => setSubForm(f => ({ ...f, responsavelId: e.target.value }))}
                                  className="text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 outline-none"
                                >
                                  <option value="">Responsável</option>
                                  {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setAddingSubTo(null)}
                                  className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => criarSubtarefa(tarefa.id)}
                                  disabled={saving}
                                  className="text-[11px] bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {saving && <Loader2 size={10} className="animate-spin" />}
                                  Criar
                                </button>
                              </div>
                            </div>
                          </motion.li>
                        )}
                      </AnimatePresence>

                      {/* Botão add subtarefa inline */}
                      {addingSubTo !== tarefa.id && (
                        <motion.li layout className="pl-4">
                          <button
                            onClick={() => { setAddingSubTo(tarefa.id); setExpanded(p => ({ ...p, [tarefa.id]: true })) }}
                            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-indigo-600 py-1 transition-colors"
                          >
                            <Plus size={11} /> Adicionar subtarefa
                          </button>
                        </motion.li>
                      )}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
