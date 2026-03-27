'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Download, ChevronLeft, ChevronRight, ShieldAlert, Pencil, EyeOff } from 'lucide-react'
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

const statusConfig: Record<StatusAluno, { label: string; className: string; glow: string }> = {
  ATIVO:    { label: 'Ativo',    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', glow: 'rgba(16, 185, 129, 0.9)' },
  APROVADO: { label: 'Aprovado', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',   glow: 'rgba(99, 102, 241, 0.9)' },
  CHURN:    { label: 'Churn',    className: 'bg-red-50 text-red-700 border border-red-200',             glow: 'rgba(239, 68, 68, 0.9)'  },
  INATIVO:  { label: 'Inativo',  className: 'bg-gray-50 text-gray-500 border border-gray-200',          glow: 'rgba(156, 163, 175, 0.9)' },
}

const planoConfig: Record<Plano, { className: string; glow: string }> = {
  START: { className: 'bg-gray-50 text-gray-600 border border-gray-200',       glow: 'rgba(156, 163, 175, 0.9)' },
  PRO:   { className: 'bg-violet-50 text-violet-700 border border-violet-200', glow: 'rgba(139, 92, 246, 0.9)'  },
  ELITE: { className: 'bg-amber-50 text-amber-700 border border-amber-200',    glow: 'rgba(245, 158, 11, 0.9)'  },
}

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [fase, setFase] = useState('')
  const [plano, setPlano] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [editarAluno, setEditarAluno] = useState<any | null>(null)
  const [mostrarChurn, setMostrarChurn] = useState(false)
  const limit = 20

  const fetchAlunos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search && { search }), ...(fase && { fase }),
      ...(plano && { plano }), ...(status && { status }),
      ...(!mostrarChurn && !status ? { excludeChurn: 'true' } : {}),
    })
    const res = await fetch(`/api/alunos?${params}`)
    const data = await res.json()
    setAlunos(data.alunos || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, fase, plano, status, mostrarChurn])

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

  const totalPages = Math.ceil(total / limit)

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

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-7 py-3 border-b border-gray-100 bg-white">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 text-sm border-gray-200 bg-gray-50 focus:bg-white"
          />
        </div>
        <Select value={fase} onValueChange={(v) => { setFase(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-40 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as fases</SelectItem>
            <SelectItem value="ONBOARDING">Onboarding</SelectItem>
            <SelectItem value="PRE_EDITAL">Pré-edital</SelectItem>
            <SelectItem value="POS_EDITAL">Pós-edital</SelectItem>
            <SelectItem value="PROXIMO_VENCIMENTO">Próx. vencimento</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plano} onValueChange={(v) => { setPlano(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-32 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os planos</SelectItem>
            <SelectItem value="START">START</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="ELITE">ELITE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === '_all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-32 h-8 text-sm border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="APROVADO">Aprovado</SelectItem>
            <SelectItem value="CHURN">Churn</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => { setMostrarChurn((v) => !v); setPage(1) }}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-[12px] font-medium transition-colors ${
            mostrarChurn
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
          title={mostrarChurn ? 'Ocultar alunos em churn' : 'Exibir alunos em churn'}
        >
          <EyeOff size={13} />
          Churns {mostrarChurn ? 'visíveis' : 'ocultos'}
        </button>
      </div>

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
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-sm text-gray-400">Carregando...</p>
                  </div>
                </td>
              </tr>
            ) : alunos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-sm text-gray-400">
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
