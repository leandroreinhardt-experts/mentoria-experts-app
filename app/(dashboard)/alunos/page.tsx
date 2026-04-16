'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Download, ChevronLeft, ChevronRight,
  Pencil, Filter, ArrowUpDown, X, Check, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'
import { EditarAlunoModal } from '@/components/shared/EditarAlunoModal'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FaseBadge } from '@/components/shared/FaseBadge'
import { formatDate, daysDiff } from '@/lib/utils'
import { riscoConfig, type NivelRisco } from '@/lib/churn-risk'
import { FaseMentoria, Plano, StatusAluno } from '@prisma/client'
import { AnimatedBadge } from '@/components/ui/animated-badge'

// ─── configs ─────────────────────────────────────────────────────────────────
const statusConfig: Record<StatusAluno, { label: string; className: string; glow: string }> = {
  ATIVO:    { label: 'Ativo',    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', glow: 'rgba(16, 185, 129, 0.9)' },
  APROVADO: { label: 'Aprovado', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',   glow: 'rgba(99, 102, 241, 0.9)' },
  CHURN:    { label: 'Churn',    className: 'bg-red-50 text-red-700 border border-red-200',             glow: 'rgba(239, 68, 68, 0.9)'  },
  INATIVO:  { label: 'Inativo',  className: 'bg-gray-50 text-gray-500 border border-gray-200',          glow: 'rgba(156, 163, 175, 0.9)' },
}

const planoConfig: Record<Plano, { className: string; glow: string }> = {
  START:      { className: 'bg-gray-50 text-gray-600 border border-gray-200',          glow: 'rgba(156, 163, 175, 0.9)' },
  PRO:        { className: 'bg-violet-50 text-violet-700 border border-violet-200',    glow: 'rgba(139, 92, 246, 0.9)'  },
  ELITE:      { className: 'bg-amber-50 text-amber-700 border border-amber-200',       glow: 'rgba(245, 158, 11, 0.9)'  },
  RETA_FINAL: { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', glow: 'rgba(16, 185, 129, 0.9)'  },
}

// ─── sort options ─────────────────────────────────────────────────────────────
type SortKey =
  | 'criadoEm'
  | 'nome'
  | 'plano'
  | 'dataEntrada'
  | 'dataVencimento'
  | 'followUpRecente'
  | 'followUpAntigo'
  | 'riscoChurn'

interface SortOption { key: SortKey; label: string; icon?: string }

const SORT_OPTIONS: SortOption[] = [
  { key: 'criadoEm',         label: 'Mais recentes primeiro' },
  { key: 'nome',             label: 'Ordem alfabética' },
  { key: 'plano',            label: 'Plano' },
  { key: 'dataEntrada',      label: 'Data de entrada' },
  { key: 'dataVencimento',   label: 'Data de vencimento' },
  { key: 'followUpRecente',  label: 'Follow-up mais recente' },
  { key: 'followUpAntigo',   label: 'Follow-up mais antigo' },
  { key: 'riscoChurn',       label: 'Risco de churn' },
]

function sortKeyToApiParams(key: SortKey): { sortBy: string; sortDir: 'asc' | 'desc' } {
  switch (key) {
    case 'nome':            return { sortBy: 'nome',               sortDir: 'asc'  }
    case 'plano':           return { sortBy: 'plano',              sortDir: 'asc'  }
    case 'dataEntrada':     return { sortBy: 'dataEntrada',        sortDir: 'asc'  }
    case 'dataVencimento':  return { sortBy: 'dataVencimento',     sortDir: 'asc'  }
    case 'followUpRecente': return { sortBy: 'dataUltimoFollowUp', sortDir: 'desc' }
    case 'followUpAntigo':  return { sortBy: 'dataUltimoFollowUp', sortDir: 'asc'  }
    case 'riscoChurn':      return { sortBy: 'riscoChurn',         sortDir: 'desc' }
    default:                return { sortBy: 'criadoEm',           sortDir: 'desc' }
  }
}

// ─── tiny Popover primitive ───────────────────────────────────────────────────
function Popover({ trigger, children, align = 'left' }: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      // não fechar se o clique for dentro do painel ou em portals do Radix (Select, etc.)
      if (ref.current && ref.current.contains(target)) return
      // portals do Radix ficam em [data-radix-popper-content-wrapper]
      const inPortal = (target as Element)?.closest?.('[data-radix-popper-content-wrapper], [data-radix-select-viewport]')
      if (inPortal) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div
          className={`absolute top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ minWidth: 240 }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function AlunosPage() {
  const [alunos, setAlunos]         = useState<any[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [fase, setFase]             = useState('')
  const [plano, setPlano]           = useState('')
  const [status, setStatus]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [editarAluno, setEditarAluno] = useState<any | null>(null)
  const [mostrarChurn, setMostrarChurn] = useState(false)
  const [concursoTag, setConcursoTag]   = useState('')
  const [areaEstudoTag, setAreaEstudoTag] = useState('')
  const [tagOptions, setTagOptions] = useState<{ concursos: string[]; areasEstudo: string[] }>({ concursos: [], areasEstudo: [] })

  // date range filters
  const [dataEntradaInicio,    setDataEntradaInicio]    = useState('')
  const [dataEntradaFim,       setDataEntradaFim]       = useState('')
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState('')
  const [dataVencimentoFim,    setDataVencimentoFim]    = useState('')

  // sort
  const [sortKey, setSortKey] = useState<SortKey>('criadoEm')

  const limit = 20

  useEffect(() => {
    fetch('/api/alunos/tags').then(r => r.json()).then(setTagOptions).catch(() => {})
  }, [])

  const fetchAlunos = useCallback(async () => {
    setLoading(true)

    const { sortBy, sortDir } = sortKeyToApiParams(sortKey)
    // riscoChurn is a computed field – sort client-side after fetch
    const serverSortBy  = sortKey === 'riscoChurn' ? 'criadoEm' : sortBy
    const serverSortDir = sortKey === 'riscoChurn' ? 'desc'      : sortDir

    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search              && { search }),
      ...(fase                && { fase }),
      ...(plano               && { plano }),
      ...(status              && { status }),
      ...(!mostrarChurn && !status ? { excludeChurn: 'true' } : {}),
      ...(concursoTag         && { concurso:    concursoTag }),
      ...(areaEstudoTag       && { areaEstudo:  areaEstudoTag }),
      ...(dataEntradaInicio   && { dataEntradaInicio }),
      ...(dataEntradaFim      && { dataEntradaFim }),
      ...(dataVencimentoInicio && { dataVencimentoInicio }),
      ...(dataVencimentoFim   && { dataVencimentoFim }),
      sortBy:  serverSortBy,
      sortDir: serverSortDir,
    })

    const res  = await fetch(`/api/alunos?${params}`)
    const data = await res.json()
    let lista: any[] = data.alunos || []

    // client-side risco churn sort
    if (sortKey === 'riscoChurn') {
      lista = [...lista].sort((a, b) => {
        const sa = a.riscoChurn?.score ?? 0
        const sb = b.riscoChurn?.score ?? 0
        return sb - sa
      })
    }

    setAlunos(lista)
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, fase, plano, status, mostrarChurn, concursoTag, areaEstudoTag,
      sortKey, dataEntradaInicio, dataEntradaFim, dataVencimentoInicio, dataVencimentoFim])

  useEffect(() => { fetchAlunos() }, [fetchAlunos])

  function exportarCSV() {
    const headers = ['Nome', 'CPF', 'Email', 'WhatsApp', 'Plano', 'Status', 'Fase', 'Entrada', 'Vencimento']
    const rows = alunos.map((a) => [
      a.nome, a.cpf, a.email || '', a.whatsapp || '', a.plano, a.statusAtual, a.faseAtual,
      formatDate(a.dataEntrada), formatDate(a.dataVencimento),
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'alunos.csv'; a.click()
  }

  function resetFiltros() {
    setFase(''); setPlano(''); setStatus(''); setConcursoTag(''); setAreaEstudoTag('')
    setMostrarChurn(false)
    setDataEntradaInicio(''); setDataEntradaFim('')
    setDataVencimentoInicio(''); setDataVencimentoFim('')
    setPage(1)
  }

  const activeFiltrosCount = [
    fase, plano, status, concursoTag, areaEstudoTag,
    dataEntradaInicio || dataEntradaFim,
    dataVencimentoInicio || dataVencimentoFim,
    mostrarChurn ? 'churn' : '',
  ].filter(Boolean).length

  const totalPages = Math.ceil(total / limit)

  // ─── filter panel content ──────────────────────────────────────────────────
  const FilterPanel = (
    <div className="p-4 flex flex-col gap-4 overflow-y-auto" style={{ width: 320, maxHeight: 'calc(100vh - 120px)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</span>
        {activeFiltrosCount > 0 && (
          <button onClick={resetFiltros} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
            <X size={11} /> Limpar tudo
          </button>
        )}
      </div>

      {/* Fase */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Fase</label>
        <Select value={fase || '_all'} onValueChange={(v) => { setFase(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm border-gray-200">
            <SelectValue placeholder="Todas as fases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as fases</SelectItem>
            <SelectItem value="ONBOARDING">Onboarding</SelectItem>
            <SelectItem value="PRE_EDITAL">Pré-edital</SelectItem>
            <SelectItem value="POS_EDITAL">Pós-edital</SelectItem>
            <SelectItem value="PROXIMO_VENCIMENTO">Próx. vencimento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plano */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Plano</label>
        <Select value={plano || '_all'} onValueChange={(v) => { setPlano(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm border-gray-200">
            <SelectValue placeholder="Todos os planos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os planos</SelectItem>
            <SelectItem value="START">START</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="ELITE">ELITE</SelectItem>
            <SelectItem value="RETA_FINAL">Reta Final TJSC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
        <Select value={status || '_all'} onValueChange={(v) => { setStatus(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm border-gray-200">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="APROVADO">Aprovado</SelectItem>
            <SelectItem value="CHURN">Churn</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Concurso */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Concurso / Cargo</label>
        <Select value={concursoTag || '_all'} onValueChange={(v) => { setConcursoTag(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm border-gray-200">
            <SelectValue placeholder="Todos os concursos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os concursos</SelectItem>
            {tagOptions.concursos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Área de estudo */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Área de estudo</label>
        <Select value={areaEstudoTag || '_all'} onValueChange={(v) => { setAreaEstudoTag(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="h-8 text-sm border-gray-200">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as áreas</SelectItem>
            {tagOptions.areasEstudo.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Data de entrada */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Período de entrada</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={dataEntradaInicio}
            onChange={(e) => { setDataEntradaInicio(e.target.value); setPage(1) }}
            className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            placeholder="De"
          />
          <input
            type="date"
            value={dataEntradaFim}
            onChange={(e) => { setDataEntradaFim(e.target.value); setPage(1) }}
            className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            placeholder="Até"
          />
        </div>
      </div>

      {/* Data de vencimento */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Período de vencimento</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={dataVencimentoInicio}
            onChange={(e) => { setDataVencimentoInicio(e.target.value); setPage(1) }}
            className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
          <input
            type="date"
            value={dataVencimentoFim}
            onChange={(e) => { setDataVencimentoFim(e.target.value); setPage(1) }}
            className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Mostrar churns */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Alunos em churn</label>
        <button
          onClick={() => { setMostrarChurn(v => !v); setPage(1) }}
          className={`flex items-center gap-2 h-8 w-full px-3 rounded-md border text-sm font-medium transition-colors ${
            mostrarChurn
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
            mostrarChurn ? 'bg-red-500 border-red-500' : 'border-gray-300'
          }`}>
            {mostrarChurn && <Check size={10} className="text-white" />}
          </div>
          Exibir alunos em churn
        </button>
      </div>
    </div>
  )

  // ─── sort panel content ────────────────────────────────────────────────────
  const SortPanel = (
    <div className="py-2" style={{ width: 240 }}>
      <div className="px-3 pb-2 mb-1 border-b border-gray-100">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Ordenação</span>
      </div>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => { setSortKey(opt.key); setPage(1) }}
          className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
            sortKey === opt.key
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt.label}
          {sortKey === opt.key && <Check size={14} className="text-indigo-500 flex-shrink-0" />}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-white">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Alunos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} alunos encontrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV} className="text-gray-600 border-gray-200 hover:bg-gray-50">
            <Download size={14} className="mr-1.5" /> Exportar
          </Button>
          <Link href="/alunos/novo">
            <HoverBorderGradient containerClassName="rounded-lg" className="text-xs font-medium h-8 px-3">
              <Plus size={13} /> Novo aluno
            </HoverBorderGradient>
          </Link>
        </div>
      </div>

      {/* Search + action bar */}
      <div className="flex flex-wrap items-center gap-2 px-7 py-3 border-b border-gray-100 bg-white">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 text-sm border-gray-200 bg-gray-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Filtros */}
          <Popover
            align="right"
            trigger={
              <button className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-[13px] font-medium transition-colors ${
                activeFiltrosCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
                <Filter size={13} />
                Filtros
                {activeFiltrosCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold leading-none">
                    {activeFiltrosCount}
                  </span>
                )}
                <ChevronDown size={12} className="text-gray-400" />
              </button>
            }
          >
            {FilterPanel}
          </Popover>

          {/* Ordenação */}
          <Popover
            align="right"
            trigger={
              <button className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-[13px] font-medium transition-colors ${
                sortKey !== 'criadoEm'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
                <ArrowUpDown size={13} />
                Ordenação
                {sortKey !== 'criadoEm' && (
                  <span className="text-[11px] text-indigo-500 font-semibold truncate max-w-[100px]">
                    · {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
                  </span>
                )}
                <ChevronDown size={12} className="text-gray-400" />
              </button>
            }
          >
            {SortPanel}
          </Popover>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFiltrosCount > 0 && (
        <div className="flex flex-wrap gap-1.5 px-7 py-2 border-b border-gray-100 bg-gray-50/50">
          {fase && (
            <Chip label={`Fase: ${fase.replace('_', ' ')}`} onRemove={() => { setFase(''); setPage(1) }} />
          )}
          {plano && (
            <Chip label={`Plano: ${plano}`} onRemove={() => { setPlano(''); setPage(1) }} />
          )}
          {status && (
            <Chip label={`Status: ${statusConfig[status as StatusAluno]?.label || status}`} onRemove={() => { setStatus(''); setPage(1) }} />
          )}
          {concursoTag && (
            <Chip label={`Concurso: ${concursoTag}`} onRemove={() => { setConcursoTag(''); setPage(1) }} />
          )}
          {areaEstudoTag && (
            <Chip label={`Área: ${areaEstudoTag}`} onRemove={() => { setAreaEstudoTag(''); setPage(1) }} />
          )}
          {(dataEntradaInicio || dataEntradaFim) && (
            <Chip
              label={`Entrada: ${dataEntradaInicio || '…'} → ${dataEntradaFim || '…'}`}
              onRemove={() => { setDataEntradaInicio(''); setDataEntradaFim(''); setPage(1) }}
            />
          )}
          {(dataVencimentoInicio || dataVencimentoFim) && (
            <Chip
              label={`Vencimento: ${dataVencimentoInicio || '…'} → ${dataVencimentoFim || '…'}`}
              onRemove={() => { setDataVencimentoInicio(''); setDataVencimentoFim(''); setPage(1) }}
            />
          )}
          {mostrarChurn && (
            <Chip label="Inclui churns" onRemove={() => { setMostrarChurn(false); setPage(1) }} />
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
            <tr>
              <th className="text-left px-7 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Plano</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Fase</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Entrada</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Vencimento</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Últ. follow-up</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Risco churn</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-sm text-gray-400">Carregando...</p>
                  </div>
                </td>
              </tr>
            ) : alunos.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-sm text-gray-400">
                  Nenhum aluno encontrado
                </td>
              </tr>
            ) : (
              alunos.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-7 py-3">
                    <Link href={`/alunos/${aluno.id}`} className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {aluno.nome}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">{aluno.email || aluno.cpf}</div>
                  </td>
                  <td className="px-4 py-3">
                    <AnimatedBadge glowColor={planoConfig[aluno.plano as Plano].glow} className={`text-[11px] ${planoConfig[aluno.plano as Plano].className}`}>
                      {aluno.plano}
                    </AnimatedBadge>
                  </td>
                  <td className="px-4 py-3">
                    <AnimatedBadge glowColor={statusConfig[aluno.statusAtual as StatusAluno].glow} className={`text-[11px] ${statusConfig[aluno.statusAtual as StatusAluno].className}`}>
                      {statusConfig[aluno.statusAtual as StatusAluno].label}
                    </AnimatedBadge>
                  </td>
                  <td className="px-4 py-3">
                    {aluno.statusAtual === 'ATIVO' && <FaseBadge fase={aluno.faseAtual as FaseMentoria} />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-[13px]">{formatDate(aluno.dataEntrada)}</td>
                  <td className="px-4 py-3 text-gray-500 text-[13px]">{formatDate(aluno.dataVencimento)}</td>
                  <td className="px-4 py-3 text-[13px]">
                    {aluno.dataUltimoFollowUp
                      ? <span className="text-gray-500">{daysDiff(aluno.dataUltimoFollowUp)}d atrás</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {aluno.riscoChurn && aluno.statusAtual === 'ATIVO' ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${riscoConfig[aluno.riscoChurn.nivel as NivelRisco].bar}`}
                            style={{ width: `${aluno.riscoChurn.score}%` }}
                          />
                        </div>
                        <AnimatedBadge
                          glowColor={riscoConfig[aluno.riscoChurn.nivel as NivelRisco].glow}
                          className={`text-[11px] ${riscoConfig[aluno.riscoChurn.nivel as NivelRisco].badge}`}
                        >
                          {aluno.riscoChurn.label}
                        </AnimatedBadge>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                      onClick={(e) => { e.preventDefault(); setEditarAluno(aluno) }}
                      title="Editar dados"
                    >
                      <Pencil size={13} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-7 py-3 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-400">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total} alunos
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7 border-gray-200" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft size={14} />
            </Button>
            <span className="px-3 text-xs text-gray-600 font-medium">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7 border-gray-200" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {editarAluno && (
        <EditarAlunoModal
          aluno={editarAluno}
          open={!!editarAluno}
          onClose={() => setEditarAluno(null)}
          onSaved={(atualizado) => {
            setAlunos((prev) => prev.map((a) => a.id === atualizado.id ? { ...a, ...atualizado } : a))
            setEditarAluno(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Chip component ───────────────────────────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-indigo-900 transition-colors">
        <X size={10} />
      </button>
    </span>
  )
}
