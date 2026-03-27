'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, TrendingUp, TrendingDown, Trophy, AlertTriangle,
  Calendar, CheckSquare, Clock, ArrowUpRight, User, ShieldAlert,
  Minus, ListChecks, Activity, MessageSquare,
} from 'lucide-react'
import { FaseBadge } from '@/components/shared/FaseBadge'
import { UrgenciaBadge } from '@/components/shared/UrgenciaBadge'
import { formatDate, daysDiff } from '@/lib/utils'
import { faseLabels } from '@/lib/fases'
import { riscoConfig, type NivelRisco } from '@/lib/churn-risk'
import { FaseMentoria } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  ComposedChart, Line, Area,
} from 'recharts'

// ─── Cores ───────────────────────────────────────────────────────────────────

const avatarCores = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

const faseCoresChart: Record<FaseMentoria, string> = {
  ONBOARDING: '#6366f1',
  PRE_EDITAL: '#f59e0b',
  POS_EDITAL: '#10b981',
  PROXIMO_VENCIMENTO: '#ef4444',
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-100', className)} />
}

function DashboardSkeleton() {
  return (
    <div className="p-7 space-y-7">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {/* Hoje */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      {/* Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-5 gap-5">
        <Skeleton className="col-span-3 h-56" />
        <Skeleton className="col-span-2 h-56" />
      </div>
      {/* Churn */}
      <Skeleton className="h-48" />
      {/* Bottom */}
      <div className="grid grid-cols-5 gap-5">
        <Skeleton className="col-span-3 h-40" />
        <Skeleton className="col-span-2 h-40" />
      </div>
    </div>
  )
}

// ─── Trend indicator ─────────────────────────────────────────────────────────

function Trend({ delta, inverse = false, suffix = '' }: { delta: number; inverse?: boolean; suffix?: string }) {
  const isNeutral = delta === 0
  const isGood = inverse ? delta <= 0 : delta >= 0
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-[11px] font-semibold',
      isNeutral ? 'text-gray-400' : isGood ? 'text-emerald-500' : 'text-red-400'
    )}>
      {delta > 0 ? <TrendingUp size={10} /> : delta < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
      {delta > 0 ? `+${delta}` : `${delta}`}{suffix} vs mês ant.
    </span>
  )
}

// ─── Tooltip recharts ─────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]               = useState<any>(null)
  const [membros, setMembros]         = useState<any[]>([])
  const [filtroResp, setFiltroResp]   = useState('TODOS')

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/membros').then((r) => r.json()),
    ]).then(([d, m]) => {
      setData(d)
      setMembros(Array.isArray(m) ? m : [])
    })
  }, [])

  if (!data) return <DashboardSkeleton />

  const { cards, tendencias, distribuicaoFases, distribuicaoPlanos, historicoMensal,
          riscoChurn, hoje, produtividadeTime, alertas } = data

  const tarefasFiltradas = filtroResp === 'TODOS'
    ? alertas.tarefasAtrasadas
    : filtroResp === 'SEM_RESPONSAVEL'
      ? alertas.tarefasAtrasadas.filter((t: any) => !t.responsavel)
      : alertas.tarefasAtrasadas.filter((t: any) => t.responsavel?.id === filtroResp)

  function avatarCor(membroId: string) {
    const idx = membros.findIndex((m) => m.id === membroId)
    return avatarCores[idx % avatarCores.length] ?? 'bg-gray-400'
  }

  const maxProd = Math.max(...(produtividadeTime ?? []).map((m: any) => m.followUps + m.analises), 1)

  return (
    <div className="p-7 space-y-7">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão geral da Mentoria Experts</p>
      </div>

      {/* ── C: Seção Hoje ──────────────────────────────────── */}
      {(hoje.tarefas.length > 0 || hoje.alunosContatar.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarefas do dia */}
          <div className="bg-white rounded-xl border border-indigo-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50">
                <ListChecks size={13} className="text-indigo-500" />
              </div>
              <h4 className="text-xs font-semibold text-gray-700">
                Tarefas de hoje
                <span className="ml-1.5 bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 text-[10px]">
                  {hoje.tarefas.length}
                </span>
              </h4>
            </div>
            {hoje.tarefas.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Nenhuma tarefa para hoje.</p>
            ) : (
              <div className="space-y-2">
                {hoje.tarefas.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{t.titulo}</p>
                      {t.aluno && (
                        <Link href={`/alunos/${t.aluno.id}`} className="text-[10px] text-indigo-500 hover:text-indigo-700 truncate block">
                          {t.aluno.nome}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <UrgenciaBadge urgencia={t.urgencia} className="text-[9px] px-1 py-0" />
                      {t.responsavel && (
                        <div className={`h-5 w-5 rounded-full ${avatarCor(t.responsavel.id)} flex items-center justify-center text-[9px] font-bold text-white`}>
                          {t.responsavel.nome?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alunos a contatar */}
          <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50">
                <MessageSquare size={13} className="text-amber-500" />
              </div>
              <h4 className="text-xs font-semibold text-gray-700">
                Alunos a contatar
                <span className="ml-1.5 bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5 text-[10px]">
                  {hoje.alunosContatar.length}
                </span>
              </h4>
            </div>
            {hoje.alunosContatar.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Nenhum follow-up urgente.</p>
            ) : (
              <div className="space-y-2">
                {hoje.alunosContatar.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/alunos/${a.id}`}
                    className="flex items-center justify-between gap-2 hover:bg-amber-50/50 rounded-md -mx-1 px-1 py-0.5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{a.nome}</p>
                      <p className="text-[10px] text-gray-400">
                        Último: {a.dataUltimoFollowUp ? `${daysDiff(a.dataUltimoFollowUp)}d atrás` : 'nunca'}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
                      {a.plano}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── A: Cards com tendência ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Alunos ativos */}
        <div className="bg-white rounded-xl border border-indigo-500/20 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ativos</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
              <Users size={14} className="text-indigo-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cards.totalAtivos}</p>
          <Trend delta={tendencias.ativos.delta} />
        </div>

        {/* Novos no mês */}
        <div className="bg-white rounded-xl border border-emerald-500/20 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Novos</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cards.novosNoMes}</p>
          <Trend delta={tendencias.novos.delta} />
        </div>

        {/* Churns */}
        <div className="bg-white rounded-xl border border-red-500/20 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Churns</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown size={14} className="text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cards.churnsNoMes}</p>
          <Trend delta={tendencias.churns.delta} inverse />
        </div>

        {/* Taxa de churn */}
        <div className="bg-white rounded-xl border border-orange-500/20 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Taxa churn</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
              <Activity size={14} className="text-orange-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cards.taxaChurn}%</p>
          <Trend delta={tendencias.taxaChurn.delta} inverse suffix="%" />
        </div>

        {/* Aprovados */}
        <div className="bg-white rounded-xl border border-emerald-500/20 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Aprovados</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Trophy size={14} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cards.totalAprovados}</p>
          <span className="text-[11px] text-emerald-500 font-semibold">
            +{tendencias.aprovados.noMes} este mês
          </span>
        </div>

        {/* Follow-ups no mês */}
        <div className="bg-white rounded-xl border border-violet-500/20 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Follow-ups</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
              <MessageSquare size={14} className="text-violet-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cards.totalFollowUpsNoMes}</p>
          <span className="text-[11px] text-gray-400 font-medium">este mês</span>
        </div>
      </div>

      {/* ── B + D: Gráfico histórico + Donut planos ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* B: Evolução mensal */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Evolução mensal</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Novos entrantes e churns nos últimos 6 meses</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={historicoMensal} barSize={16}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Legend
                iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
                formatter={(v) => v === 'novos' ? 'Novos' : 'Churns'}
              />
              <Bar dataKey="novos" name="novos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="churns" name="churns" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="novos" stroke="#059669" strokeWidth={2} dot={false} legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* D: Donut de planos + distribuição de fases */}
        <div className="lg:col-span-2 space-y-4">
          {/* Donut planos */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Distribuição de planos</h3>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie
                    data={distribuicaoPlanos}
                    dataKey="count"
                    nameKey="label"
                    cx="50%" cy="50%"
                    innerRadius={28} outerRadius={44}
                    strokeWidth={0}
                  >
                    {distribuicaoPlanos.map((entry: any) => (
                      <Cell key={entry.plano} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {distribuicaoPlanos.map((p: any) => (
                  <div key={p.plano} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-xs text-gray-600 font-medium">{p.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{p.count}</span>
                      <span className="text-[10px] text-gray-400">
                        {cards.totalAtivos > 0 ? Math.round((p.count / cards.totalAtivos) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fases (bar compacto) */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Por fase</h3>
              <Link href="/alunos" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
                Ver <ArrowUpRight size={11} />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart
                data={distribuicaoFases.map((d: any) => ({
                  ...d, label: faseLabels[d.fase as FaseMentoria],
                }))}
                barSize={20}
              >
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {distribuicaoFases.map((d: any, i: number) => (
                    <Cell key={i} fill={faseCoresChart[d.fase as FaseMentoria]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── E: Churn risk — tabela compacta ─────────────────── */}
      {riscoChurn && (riscoChurn.resumo.CRITICO > 0 || riscoChurn.resumo.ALTO > 0) && (
        <div className="bg-white rounded-xl border border-red-100 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                <ShieldAlert size={15} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Alunos em risco de churn</h3>
                <p className="text-xs text-gray-400">Ranking por score — follow-up, vencimento, análises e tarefas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'] as NivelRisco[]).map((nivel) =>
                riscoChurn.resumo[nivel] > 0 ? (
                  <span key={nivel} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${riscoConfig[nivel].badge}`}>
                    {riscoChurn.resumo[nivel]} {nivel === 'CRITICO' ? 'crítico' : nivel === 'ALTO' ? 'alto' : nivel === 'MEDIO' ? 'médio' : 'baixo'}
                  </span>
                ) : null
              )}
              <Link href="/alunos" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                Ver todos <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-semibold text-gray-400 w-6">#</th>
                  <th className="pb-2 text-left font-semibold text-gray-400">Aluno</th>
                  <th className="pb-2 text-left font-semibold text-gray-400">Fase</th>
                  <th className="pb-2 text-left font-semibold text-gray-400">Responsável</th>
                  <th className="pb-2 text-left font-semibold text-gray-400 w-40">Score</th>
                  <th className="pb-2 text-left font-semibold text-gray-400">Nível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {riscoChurn.alunos.slice(0, 10).map((a: any, i: number) => {
                  const cfg = riscoConfig[a.riscoChurn.nivel as NivelRisco]
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2">
                        <Link href={`/alunos/${a.id}`} className="font-semibold text-gray-800 hover:text-indigo-600 transition-colors">
                          {a.nome}
                        </Link>
                      </td>
                      <td className="py-2"><FaseBadge fase={a.faseAtual as FaseMentoria} /></td>
                      <td className="py-2 text-gray-500">
                        {a.responsavelAcomp ? (
                          <span className="flex items-center gap-1">
                            <User size={10} className="text-gray-400" />{a.responsavelAcomp.nome}
                          </span>
                        ) : <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${a.riscoChurn.score}%` }} />
                          </div>
                          <span className="font-bold text-gray-700 w-6 text-right">{a.riscoChurn.score}</span>
                        </div>
                      </td>
                      <td className="py-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                          {a.riscoChurn.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {riscoChurn.alunos.length > 10 && (
              <p className="text-center text-[11px] text-gray-400 mt-3">
                +{riscoChurn.alunos.length - 10} alunos — <Link href="/alunos" className="text-indigo-600 hover:text-indigo-700">ver todos</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── F: Produtividade + Alertas ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* F: Produtividade do time */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50">
              <Users size={13} className="text-violet-500" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700">Produtividade do time — {new Date().toLocaleDateString('pt-BR', { month: 'long' })}</h4>
          </div>
          {produtividadeTime.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nenhum membro registrado.</p>
          ) : (
            <div className="space-y-3">
              {produtividadeTime.map((m: any, idx: number) => {
                const total = m.followUps + m.analises
                const pct = Math.round((total / maxProd) * 100)
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-full ${avatarCores[idx % avatarCores.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                      {m.nome?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800 truncate">{m.nome}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2 text-[11px] text-gray-500">
                          <span title="Follow-ups" className="flex items-center gap-0.5">
                            <MessageSquare size={9} className="text-amber-500" />{m.followUps}
                          </span>
                          <span title="Alterações no plano" className="flex items-center gap-0.5">
                            <Activity size={9} className="text-indigo-500" />{m.analises}
                          </span>
                          {m.tarefasAtrasadas > 0 && (
                            <span title="Tarefas atrasadas" className="flex items-center gap-0.5 text-red-400 font-semibold">
                              <AlertTriangle size={9} />{m.tarefasAtrasadas}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${avatarCores[idx % avatarCores.length].replace('bg-', 'bg-').replace('-500', '-400')}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-2">
            <MessageSquare size={9} /> Follow-ups &nbsp;
            <Activity size={9} /> Alterações &nbsp;
            <AlertTriangle size={9} className="text-red-300" /> Tarefas atrasadas
          </p>
        </div>

        {/* Alertas laterais */}
        <div className="lg:col-span-2 space-y-3">
          {alertas.followUpsAtrasados.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-100 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-50">
                  <AlertTriangle size={13} className="text-orange-500" />
                </div>
                <h4 className="text-xs font-semibold text-gray-700">
                  Follow-ups atrasados
                  <span className="ml-1.5 bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5 text-[10px]">
                    {alertas.followUpsAtrasados.length}
                  </span>
                </h4>
              </div>
              <div className="space-y-1.5">
                {alertas.followUpsAtrasados.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <Link href={`/alunos/${a.id}`} className="text-xs font-medium text-gray-700 hover:text-indigo-600 truncate">
                      {a.nome}
                    </Link>
                    <span className="text-[11px] text-gray-400 ml-2 shrink-0">
                      {a.dataUltimoFollowUp ? `${daysDiff(a.dataUltimoFollowUp)}d` : 'Nunca'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertas.vencendoEm15Dias.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50">
                  <Clock size={13} className="text-red-500" />
                </div>
                <h4 className="text-xs font-semibold text-gray-700">
                  Vencendo em 15 dias
                  <span className="ml-1.5 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px]">
                    {alertas.vencendoEm15Dias.length}
                  </span>
                </h4>
              </div>
              <div className="space-y-1.5">
                {alertas.vencendoEm15Dias.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <Link href={`/alunos/${a.id}`} className="text-xs font-medium text-gray-700 hover:text-indigo-600 truncate">
                      {a.nome}
                    </Link>
                    <span className="text-[11px] text-gray-400 ml-2 shrink-0">{formatDate(a.dataVencimento)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertas.provasEm30Dias.length > 0 && (
            <div className="bg-white rounded-xl border border-indigo-100 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50">
                  <Calendar size={13} className="text-indigo-500" />
                </div>
                <h4 className="text-xs font-semibold text-gray-700">
                  Provas em 30 dias
                  <span className="ml-1.5 bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 text-[10px]">
                    {alertas.provasEm30Dias.length}
                  </span>
                </h4>
              </div>
              <div className="space-y-1.5">
                {alertas.provasEm30Dias.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <Link href={`/alunos/${a.id}`} className="text-xs font-medium text-gray-700 hover:text-indigo-600 truncate">
                      {a.nome}
                    </Link>
                    <span className="text-[11px] text-gray-400 ml-2 shrink-0">{formatDate(a.dataProva)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tarefas atrasadas ─────────────────────────────────── */}
      {alertas.tarefasAtrasadas.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 p-5">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50">
                <CheckSquare size={13} className="text-red-500" />
              </div>
              <h4 className="text-sm font-semibold text-gray-700">
                Tarefas com prazo vencido
                <span className="ml-2 bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-[11px]">
                  {tarefasFiltradas.length}
                  {filtroResp !== 'TODOS' && ` de ${alertas.tarefasAtrasadas.length}`}
                </span>
              </h4>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <User size={13} className="text-gray-400" />
              <button
                onClick={() => setFiltroResp('TODOS')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${filtroResp === 'TODOS' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              >
                Todos
              </button>
              {membros.map((m: any, idx: number) => (
                <button
                  key={m.id}
                  onClick={() => setFiltroResp(m.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${filtroResp === m.id ? `${avatarCores[idx % avatarCores.length]} text-white border-transparent` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                >
                  {m.nome}
                </button>
              ))}
              <button
                onClick={() => setFiltroResp('SEM_RESPONSAVEL')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${filtroResp === 'SEM_RESPONSAVEL' ? 'bg-gray-500 text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              >
                Sem responsável
              </button>
            </div>
          </div>

          {tarefasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma tarefa atrasada para este responsável</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tarefasFiltradas.map((t: any) => (
                <div key={t.id} className="border border-red-100 rounded-lg p-3 bg-red-50/30 space-y-2">
                  {t.aluno ? (
                    <Link href={`/alunos/${t.aluno.id}`} className="block text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 truncate leading-none">
                      {t.aluno.nome}
                    </Link>
                  ) : (
                    <span className="block text-[11px] text-gray-400 leading-none italic">Sem aluno</span>
                  )}
                  <p className="text-sm font-medium text-gray-800 leading-snug">{t.titulo}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-red-500 font-semibold">{formatDate(t.prazo)}</span>
                    <UrgenciaBadge urgencia={t.urgencia} className="text-[10px] px-1.5 py-0" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-red-100">
                    {t.responsavel ? (
                      <>
                        <div className={`w-4 h-4 rounded-full ${avatarCor(t.responsavel.id)} text-white text-[9px] flex items-center justify-center font-bold shrink-0`}>
                          {t.responsavel.nome?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-[11px] text-gray-600 font-medium truncate">{t.responsavel.nome}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Sem responsável</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
