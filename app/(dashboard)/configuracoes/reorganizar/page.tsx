'use client'

import { useState } from 'react'
import {
  RefreshCw, AlertTriangle, CheckCircle2, Loader2,
  Users, CalendarClock, Zap, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

const urgenciaConfig: Record<string, { label: string; className: string }> = {
  CRITICA: { label: 'Crítica', className: 'bg-red-100 text-red-700 border border-red-200' },
  ALTA:    { label: 'Alta',    className: 'bg-orange-100 text-orange-700 border border-orange-200' },
  MEDIA:   { label: 'Média',   className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  BAIXA:   { label: 'Baixa',   className: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

export default function ReorganizarPage() {
  const [preview, setPreview]     = useState<any>(null)
  const [loading, setLoading]     = useState(false)
  const [executing, setExecuting] = useState(false)
  const [done, setDone]           = useState(false)
  const [expanded, setExpanded]   = useState(false)

  async function carregarPreview() {
    setLoading(true)
    setDone(false)
    setPreview(null)
    try {
      const res = await fetch('/api/admin/reorganizar')
      const data = await res.json()
      setPreview(data)
    } catch {
      toast({ title: 'Erro ao carregar preview', variant: 'destructive' })
    }
    setLoading(false)
  }

  async function executar() {
    setExecuting(true)
    try {
      const res = await fetch('/api/admin/reorganizar', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setPreview(data)
        setDone(true)
        toast({ title: `${data.tarefasAtualizadas} tarefa(s) reorganizada(s) com sucesso!`, variant: 'success' })
      } else {
        toast({ title: data.erro ?? 'Erro ao reorganizar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao executar reorganização', variant: 'destructive' })
    }
    setExecuting(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reorganizar tarefas atrasadas</h1>
        <p className="text-sm text-gray-400 mt-1">
          Redistribui todas as tarefas em atraso entre os membros da equipe, ajusta prioridades
          e reprograma prazos a partir de amanhã, mantendo o ritmo de trabalho sustentável.
        </p>
      </div>

      {/* Regras */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
          <Info size={15} /> Como funciona
        </div>
        <ul className="text-sm text-blue-600 space-y-1 pl-5 list-disc">
          <li><strong>Urgência</strong> é ajustada pelo atraso: 3–6 dias → Alta · 7–14 dias → Alta · 15+ dias → Crítica</li>
          <li><strong>Follow-ups</strong> são distribuídos no ritmo da fila do dia (total de alunos ÷ 15 por dia) e mantêm o responsável de acompanhamento do aluno</li>
          <li><strong>Outras tarefas</strong> são distribuídas proporcionalmente entre os membros ativos, as mais críticas primeiro</li>
          <li>Prazos começam a partir de <strong>amanhã</strong>, apenas em dias úteis</li>
          <li>Tarefas já concluídas <strong>não são tocadas</strong></li>
        </ul>
      </div>

      {/* Ação principal */}
      {!preview && (
        <div className="flex flex-col items-center gap-4 py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
            <RefreshCw size={24} className="text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-800">Pronto para reorganizar</p>
            <p className="text-sm text-gray-400 mt-1">Clique abaixo para ver o preview antes de aplicar</p>
          </div>
          <Button onClick={carregarPreview} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? <><Loader2 size={14} className="mr-2 animate-spin" /> Analisando...</> : 'Ver preview'}
          </Button>
        </div>
      )}

      {/* Preview carregado */}
      {preview && (
        <div className="space-y-5">

          {/* Sem tarefas atrasadas */}
          {preview.tarefasAtualizadas === 0 && (
            <div className="flex items-center gap-3 p-5 rounded-xl border border-emerald-200 bg-emerald-50">
              <CheckCircle2 size={22} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-emerald-800">Tudo em dia!</p>
                <p className="text-sm text-emerald-600">Não há tarefas atrasadas para redistribuir.</p>
              </div>
            </div>
          )}

          {/* Resumo */}
          {preview.tarefasAtualizadas > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={<AlertTriangle size={18} className="text-orange-500" />}
                  label="Total atrasadas"
                  value={preview.tarefasAtualizadas}
                  bg="bg-orange-50"
                />
                <StatCard
                  icon={<Users size={18} className="text-blue-500" />}
                  label="Follow-ups"
                  value={preview.followUpsAtualizados}
                  bg="bg-blue-50"
                />
                <StatCard
                  icon={<Zap size={18} className="text-violet-500" />}
                  label="Outras tarefas"
                  value={preview.outrasAtualizadas}
                  bg="bg-violet-50"
                />
                <StatCard
                  icon={<CalendarClock size={18} className="text-emerald-500" />}
                  label="Follow-ups/dia"
                  value={preview.maxFollowUpDiario}
                  bg="bg-emerald-50"
                />
              </div>

              {/* Distribuição por membro */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Distribuição por membro</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {preview.porMembro?.map((m: any) => (
                    <div key={m.membro} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                          {m.membro[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{m.membro}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="text-blue-600 font-medium">{m.followUps} follow-ups</span>
                        <span className="text-violet-600 font-medium">{m.outras} tarefas</span>
                        <span className="font-semibold text-gray-800">{m.total} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista detalhada (colapsável) */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Detalhes ({preview.preview?.length} tarefas)
                  </span>
                  {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {expanded && (
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {preview.preview?.map((t: any) => (
                      <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                        <span className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${urgenciaConfig[t.urgencia]?.className}`}>
                          {urgenciaConfig[t.urgencia]?.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.titulo}</p>
                          {t.aluno && <p className="text-xs text-gray-400 truncate">{t.aluno}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-medium text-gray-600">{t.responsavel}</p>
                          <p className="text-[11px] text-gray-400">{t.novoPrazo}</p>
                        </div>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          t.tipo === 'follow-up'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                          {t.tipo === 'follow-up' ? 'follow-up' : 'tarefa'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de ação */}
              {!done && (
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={carregarPreview} disabled={loading || executing} className="text-gray-600">
                    {loading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <RefreshCw size={13} className="mr-1.5" />}
                    Atualizar preview
                  </Button>
                  <Button
                    onClick={executar}
                    disabled={executing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[180px]"
                  >
                    {executing
                      ? <><Loader2 size={14} className="mr-2 animate-spin" /> Reorganizando...</>
                      : <><RefreshCw size={14} className="mr-2" /> Executar reorganização</>
                    }
                  </Button>
                </div>
              )}

              {done && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800">Reorganização concluída!</p>
                    <p className="text-sm text-emerald-600">
                      {preview.tarefasAtualizadas} tarefa(s) redistribuídas a partir de amanhã.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => { setPreview(null); setDone(false) }} className="ml-auto">
                    Nova reorganização
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: number; bg: string
}) {
  return (
    <div className={`rounded-xl p-4 border border-gray-100 ${bg}`}>
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
