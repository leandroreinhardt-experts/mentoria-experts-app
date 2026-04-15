'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search, List, LayoutGrid, GripVertical, User, Clock,
  CheckSquare, AlertTriangle, CalendarDays, ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FaseMentoria, Plano } from '@prisma/client'
import { cn, daysDiff, daysUntil, formatDate } from '@/lib/utils'
import { faseLabels } from '@/lib/fases'
import { riscoConfig, type NivelRisco } from '@/lib/churn-risk'
import { useToast } from '@/hooks/use-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

type Aluno = {
  id: string
  nome: string
  plano: Plano
  faseAtual: FaseMentoria
  dataVencimento: string
  dataUltimoFollowUp: string | null
  dataProva: string | null
  cursoPrincipal: string | null
  tarefasAtrasadas: number
  riscoChurn: { nivel: NivelRisco; score: number; label: string }
  responsavelAcomp: { id: string; nome: string } | null
}

const FASES: FaseMentoria[] = ['ONBOARDING', 'PRE_EDITAL', 'POS_EDITAL', 'PROXIMO_VENCIMENTO']

const colunaConfig: Record<FaseMentoria, {
  label: string; accent: string; headerBg: string; headerText: string;
  dropBg: string; countBg: string; countText: string;
}> = {
  ONBOARDING: {
    label: 'Onboarding',
    accent: 'border-t-blue-500',
    headerBg: 'bg-blue-50',
    headerText: 'text-blue-700',
    dropBg: 'bg-blue-50/70',
    countBg: 'bg-blue-100',
    countText: 'text-blue-700',
  },
  PRE_EDITAL: {
    label: 'Pré-edital',
    accent: 'border-t-amber-500',
    headerBg: 'bg-amber-50',
    headerText: 'text-amber-700',
    dropBg: 'bg-amber-50/70',
    countBg: 'bg-amber-100',
    countText: 'text-amber-700',
  },
  POS_EDITAL: {
    label: 'Pós-edital',
    accent: 'border-t-emerald-500',
    headerBg: 'bg-emerald-50',
    headerText: 'text-emerald-700',
    dropBg: 'bg-emerald-50/70',
    countBg: 'bg-emerald-100',
    countText: 'text-emerald-700',
  },
  PROXIMO_VENCIMENTO: {
    label: 'Próx. vencimento',
    accent: 'border-t-red-500',
    headerBg: 'bg-red-50',
    headerText: 'text-red-700',
    dropBg: 'bg-red-50/70',
    countBg: 'bg-red-100',
    countText: 'text-red-700',
  },
}

const planoConfig: Record<Plano, string> = {
  START:      'bg-gray-100 text-gray-600 border-gray-200',
  PRO:        'bg-violet-100 text-violet-700 border-violet-200',
  ELITE:      'bg-amber-100 text-amber-700 border-amber-200',
  RETA_FINAL: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const riscoCardBorder: Record<NivelRisco, string> = {
  CRITICO: 'border-red-300 bg-red-50/50',
  ALTO:    'border-orange-200 bg-orange-50/30',
  MEDIO:   'border-gray-200 bg-white',
  BAIXO:   'border-gray-100 bg-white',
}

const avatarCores = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-100', className)} />
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 px-6 py-4 overflow-x-auto h-full">
      {FASES.map((f) => (
        <div key={f} className="flex flex-col gap-3 min-w-[270px]">
          <Skeleton className="h-10" />
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ))}
    </div>
  )
}

// ─── Student card ─────────────────────────────────────────────────────────────

function StudentCard({
  aluno, membros, isDragging,
  onDragStart, onDragEnd,
}: {
  aluno: Aluno
  membros: any[]
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string, from: FaseMentoria) => void
  onDragEnd: () => void
}) {
  const diasVenc = daysUntil(aluno.dataVencimento)
  const diasFollowUp = aluno.dataUltimoFollowUp ? daysDiff(aluno.dataUltimoFollowUp) : null
  const { nivel } = aluno.riscoChurn

  const respIdx = membros.findIndex((m) => m.id === aluno.responsavelAcomp?.id)
  const avatarCor = respIdx >= 0 ? avatarCores[respIdx % avatarCores.length] : 'bg-gray-400'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, aluno.id, aluno.faseAtual)}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-xl border p-3 space-y-2.5 cursor-grab active:cursor-grabbing select-none transition-all duration-150',
        riscoCardBorder[nivel],
        isDragging ? 'opacity-40 scale-95 rotate-1 shadow-lg' : 'hover:shadow-md'
      )}
    >
      {/* Row 1 — nome + plano */}
      <div className="flex items-start gap-2">
        <GripVertical size={13} className="text-gray-300 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/alunos/${aluno.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug line-clamp-2"
          >
            {aluno.nome}
          </Link>
          {aluno.cursoPrincipal && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{aluno.cursoPrincipal}</p>
          )}
        </div>
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', planoConfig[aluno.plano])}>
          {aluno.plano}
        </span>
      </div>

      {/* Row 2 — datas */}
      <div className="space-y-1 pl-5">
        {/* Vencimento */}
        <div className="flex items-center gap-1.5">
          <CalendarDays size={10} className={diasVenc < 30 ? 'text-red-400' : 'text-gray-300'} />
          <span className={cn('text-[11px]', diasVenc < 0 ? 'text-red-500 font-semibold' : diasVenc < 30 ? 'text-orange-500 font-medium' : 'text-gray-500')}>
            {diasVenc < 0
              ? `Vencido há ${Math.abs(diasVenc)}d`
              : diasVenc === 0
                ? 'Vence hoje'
                : `Vence em ${diasVenc}d — ${formatDate(aluno.dataVencimento)}`}
          </span>
        </div>

        {/* Follow-up */}
        <div className="flex items-center gap-1.5">
          <Clock size={10} className={diasFollowUp !== null && diasFollowUp > 20 ? 'text-amber-400' : 'text-gray-300'} />
          <span className={cn('text-[11px]', diasFollowUp === null ? 'text-gray-400 italic' : diasFollowUp > 20 ? 'text-amber-600 font-medium' : 'text-gray-500')}>
            {diasFollowUp === null ? 'Sem follow-up' : diasFollowUp === 0 ? 'Follow-up hoje' : `Follow-up ${diasFollowUp}d atrás`}
          </span>
        </div>

        {/* Prova */}
        {aluno.dataProva && (
          <div className="flex items-center gap-1.5">
            <CheckSquare size={10} className="text-indigo-300" />
            <span className="text-[11px] text-indigo-500">
              Prova: {formatDate(aluno.dataProva)}
            </span>
          </div>
        )}

        {/* Tarefas atrasadas */}
        {aluno.tarefasAtrasadas > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-red-400" />
            <span className="text-[11px] text-red-500 font-medium">
              {aluno.tarefasAtrasadas} tarefa{aluno.tarefasAtrasadas > 1 ? 's' : ''} atrasada{aluno.tarefasAtrasadas > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Row 3 — responsável + risco */}
      <div className="flex items-center justify-between gap-2 pl-5 pt-1 border-t border-gray-100">
        {aluno.responsavelAcomp ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0', avatarCor)}>
              {aluno.responsavelAcomp.nome[0]?.toUpperCase()}
            </div>
            <span className="text-[11px] text-gray-500 truncate">{aluno.responsavelAcomp.nome}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-gray-300 italic">
            <User size={10} /> Sem responsável
          </div>
        )}
        {nivel !== 'BAIXO' && (
          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0', riscoConfig[nivel].badge)}>
            {aluno.riscoChurn.label}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  fase, alunos, membros, draggedId,
  onDragStart, onDragEnd, onDrop,
}: {
  fase: FaseMentoria
  alunos: Aluno[]
  membros: any[]
  draggedId: string | null
  onDragStart: (e: React.DragEvent, id: string, from: FaseMentoria) => void
  onDragEnd: () => void
  onDrop: (fase: FaseMentoria) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const cfg = colunaConfig[fase]

  return (
    <div
      className="flex flex-col min-w-[272px] max-w-[272px]"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(fase) }}
    >
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 border-t-2',
        cfg.accent, cfg.headerBg
      )}>
        <span className={cn('text-[12px] font-semibold', cfg.headerText)}>
          {cfg.label}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', cfg.countBg, cfg.countText)}>
          {alunos.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'overflow-y-auto rounded-xl min-h-[120px] max-h-[calc(100vh-220px)] transition-colors duration-150 space-y-2.5 p-2',
          isDragOver && draggedId ? cfg.dropBg : 'bg-gray-50/50'
        )}
      >
        {alunos.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <User size={24} className="opacity-40 mb-1" />
            <p className="text-[11px]">Nenhum aluno</p>
          </div>
        )}
        {isDragOver && draggedId && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl h-16 flex items-center justify-center">
            <p className="text-[11px] text-gray-400">Soltar aqui</p>
          </div>
        )}
        {alunos.map((aluno) => (
          <StudentCard
            key={aluno.id}
            aluno={aluno}
            membros={membros}
            isDragging={aluno.id === draggedId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AlunosKanbanPage() {
  const [alunos, setAlunos]       = useState<Aluno[]>([])
  const [membros, setMembros]     = useState<any[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [plano, setPlano]         = useState('')
  const [responsavelId, setResp]  = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [draggedFrom, setDraggedFrom] = useState<FaseMentoria | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const fetchAlunos = useCallback(async (s: string, p: string, r: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      ...(s && { search: s }),
      ...(p && { plano: p }),
      ...(r && { responsavelId: r }),
    })
    const res = await fetch(`/api/alunos/kanban?${params}`)
    const data = await res.json()
    setAlunos(data.alunos ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    Promise.all([
      fetchAlunos(search, plano, responsavelId),
      fetch('/api/membros').then((r) => r.json()),
    ]).then(([, m]) => setMembros(Array.isArray(m) ? m : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => fetchAlunos(value, plano, responsavelId), 300)
  }

  function handlePlano(value: string) {
    const p = value === '_all' ? '' : value
    setPlano(p)
    fetchAlunos(search, p, responsavelId)
  }

  function handleResp(value: string) {
    const r = value === '_all' ? '' : value
    setResp(r)
    fetchAlunos(search, plano, r)
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: string, from: FaseMentoria) {
    setDraggedId(id)
    setDraggedFrom(from)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDraggedFrom(null)
  }

  async function handleDrop(targetFase: FaseMentoria) {
    if (!draggedId || !draggedFrom || draggedFrom === targetFase) {
      setDraggedId(null)
      setDraggedFrom(null)
      return
    }

    const alunoId = draggedId
    const fromFase = draggedFrom

    // Optimistic update
    setAlunos((prev) =>
      prev.map((a) => a.id === alunoId ? { ...a, faseAtual: targetFase } : a)
    )
    setDraggedId(null)
    setDraggedFrom(null)

    try {
      const res = await fetch(`/api/alunos/${alunoId}/fase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faseNova: targetFase,
          motivo: 'Movido via Kanban',
        }),
      })
      if (!res.ok) throw new Error()

      const aluno = alunos.find((a) => a.id === alunoId)
      toast({
        title: 'Fase atualizada',
        description: `${aluno?.nome ?? 'Aluno'} movido para ${faseLabels[targetFase]}`,
      })
    } catch {
      // Reverter
      setAlunos((prev) =>
        prev.map((a) => a.id === alunoId ? { ...a, faseAtual: fromFase } : a)
      )
      toast({ title: 'Erro ao mover aluno', variant: 'destructive' })
    }
  }

  // ── Group by fase ─────────────────────────────────────────────────────────

  const porFase = FASES.reduce<Record<FaseMentoria, Aluno[]>>(
    (acc, f) => ({ ...acc, [f]: [] }),
    {} as Record<FaseMentoria, Aluno[]>
  )
  alunos.forEach((a) => { porFase[a.faseAtual]?.push(a) })

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Alunos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} alunos ativos</p>
        </div>

        {/* Vista toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Link
            href="/alunos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
          >
            <List size={13} /> Lista
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-white text-gray-900 shadow-sm">
            <LayoutGrid size={13} /> Kanban
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 px-6 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-gray-200 bg-gray-50 focus:bg-white"
          />
        </div>
        <Select value={plano || '_all'} onValueChange={handlePlano}>
          <SelectTrigger className="w-32 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os planos</SelectItem>
            <SelectItem value="START">START</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="ELITE">ELITE</SelectItem>
            <SelectItem value="RETA_FINAL">Reta Final TJSC</SelectItem>
          </SelectContent>
        </Select>
        <Select value={responsavelId || '_all'} onValueChange={handleResp}>
          <SelectTrigger className="w-44 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os membros</SelectItem>
            {membros.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Legenda de risco */}
        <div className="ml-auto flex items-center gap-3">
          {(['CRITICO', 'ALTO', 'MEDIO'] as NivelRisco[]).map((n) => (
            <div key={n} className="flex items-center gap-1">
              <div className={cn('h-2 w-2 rounded-full', {
                'bg-red-400': n === 'CRITICO',
                'bg-orange-400': n === 'ALTO',
                'bg-yellow-400': n === 'MEDIO',
              })} />
              <span className="text-[10px] text-gray-400">
                {n === 'CRITICO' ? 'Crítico' : n === 'ALTO' ? 'Alto' : 'Médio'}
              </span>
            </div>
          ))}
          <span className="text-[10px] text-gray-300 italic">borda do card = risco churn</span>
        </div>
      </div>

      {/* ── Board ────────────────────────────────────────────── */}
      {loading ? (
        <KanbanSkeleton />
      ) : (
        <div className="flex-1 overflow-x-auto min-h-0">
          <div className="flex gap-4 p-5 min-w-max items-start">
            {FASES.map((fase) => (
              <KanbanColumn
                key={fase}
                fase={fase}
                alunos={porFase[fase]}
                membros={membros}
                draggedId={draggedId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
