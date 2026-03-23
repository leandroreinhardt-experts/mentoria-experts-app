'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, Edit, CheckCircle, AlertTriangle, MessageCircle,
  Clock, Plus, Loader2, ExternalLink, Phone, Mail, Calendar,
  BookOpen, FileText, User, Activity, PhoneCall, BarChart2,
  MessageSquare, GitBranch, CheckSquare, ShieldAlert, Save, X,
  GraduationCap, Target, Monitor,
} from 'lucide-react'
import { riscoConfig, calcularRiscoChurn, type NivelRisco } from '@/lib/churn-risk'
import { TarefaModal, tarefaFormInicial, type TarefaFormData } from '@/components/shared/TarefaModal'
import { Button } from '@/components/ui/button'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FaseBadge } from '@/components/shared/FaseBadge'
import { UrgenciaBadge } from '@/components/shared/UrgenciaBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/hooks/use-toast'
import { formatDate, formatDateTime, daysDiff } from '@/lib/utils'
import { FaseMentoria, Plano, StatusAluno, StatusTarefa, UrgenciaTarefa } from '@prisma/client'

const statusLabels = { ATIVO: 'Ativo', APROVADO: 'Aprovado', CHURN: 'Churn', INATIVO: 'Inativo' }
const planoColors: Record<Plano, string> = {
  START: 'bg-gray-100 text-gray-700',
  PRO: 'bg-purple-100 text-purple-700',
  ELITE: 'bg-yellow-100 text-yellow-700',
}
const statusTarefaLabel: Record<StatusTarefa, string> = {
  A_FAZER: 'A fazer', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída',
}

export default function AlunoPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [aluno, setAluno] = useState<any>(null)
  const [membros, setMembros] = useState<any[]>([])
  const [comunicacoes, setComunicacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [followUpModal, setFollowUpModal] = useState(false)
  const [analiseModal, setAnaliseModal] = useState(false)
  const [tarefaModal, setTarefaModal] = useState(false)
  const [comentarioModal, setComentarioModal] = useState(false)
  const [faseModal, setFaseModal] = useState(false)
  const [aprovacaoModal, setAprovacaoModal] = useState(false)
  const [churnModal, setChurnModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [followUpObs, setFollowUpObs] = useState('')
  const [analiseObs, setAnaliseObs] = useState('')
  const [comentarioTexto, setComentarioTexto] = useState('')
  const [faseForm, setFaseForm] = useState({ faseNova: '', motivo: '' })
  const [aprovacaoForm, setAprovacaoForm] = useState({ concurso: '', dataAprovacao: '', observacao: '' })
  const [churnForm, setChurnForm] = useState({ motivo: 'RESCISAO_SOLICITADA', observacao: '' })
  const [tarefaForm, setTarefaForm] = useState<TarefaFormData>(tarefaFormInicial)
  const [editingAreaEstudo, setEditingAreaEstudo] = useState(false)
  const [areaEstudoInput, setAreaEstudoInput] = useState('')
  const [savingAreaEstudo, setSavingAreaEstudo] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/alunos/${id}`).then((r) => r.json()),
      fetch('/api/membros').then((r) => r.json()),
      fetch(`/api/alunos/${id}/comunicacoes`).then((r) => r.json()),
    ]).then(([alunoData, membrosData, comData]) => {
      setAluno(alunoData)
      setMembros(Array.isArray(membrosData) ? membrosData : [])
      setComunicacoes(Array.isArray(comData) ? comData : [])
      setLoading(false)
    })
  }, [id])

  async function post(url: string, body: any) {
    setSaving(true)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      toast({ title: 'Erro', description: d.error || 'Tente novamente.', variant: 'destructive' })
      return null
    }
    return res.json()
  }

  async function registrarFollowUp() {
    const data = await post(`/api/alunos/${id}/followups`, { observacao: followUpObs })
    if (data) {
      toast({ title: 'Follow-up registrado!', variant: 'success' })
      setFollowUpModal(false)
      setFollowUpObs('')
      recarregar()
    }
  }

  async function registrarAnalise() {
    const data = await post(`/api/alunos/${id}/analises`, { observacao: analiseObs })
    if (data) {
      toast({ title: 'Análise registrada!', variant: 'success' })
      setAnaliseModal(false)
      setAnaliseObs('')
      recarregar()
    }
  }

  async function adicionarComentario() {
    if (!comentarioTexto.trim()) return
    const data = await post(`/api/alunos/${id}/comentarios`, { texto: comentarioTexto, mencoes: [] })
    if (data) {
      setComentarioModal(false)
      setComentarioTexto('')
      recarregar()
    }
  }

  async function criarTarefa() {
    if (!tarefaForm.titulo) {
      toast({ title: 'Título obrigatório', variant: 'destructive' })
      return
    }
    const data = await post(`/api/alunos/${id}/tarefas`, tarefaForm)
    if (data) {
      toast({ title: 'Tarefa criada!', variant: 'success' })
      setTarefaModal(false)
      setTarefaForm(tarefaFormInicial)
      recarregar()
    }
  }

  async function alterarFase() {
    if (!faseForm.faseNova || !faseForm.motivo) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await fetch(`/api/alunos/${id}/fase`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(faseForm),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'Fase alterada!', variant: 'success' })
      setFaseModal(false)
      recarregar()
    }
  }

  async function registrarAprovacao() {
    const data = await post(`/api/alunos/${id}/aprovacao`, aprovacaoForm)
    if (data) {
      toast({ title: 'Aprovação registrada!', variant: 'success' })
      setAprovacaoModal(false)
      recarregar()
    }
  }

  async function registrarChurn() {
    const data = await post(`/api/alunos/${id}/churn`, churnForm)
    if (data) {
      toast({ title: 'Churn registrado', variant: 'success' })
      setChurnModal(false)
      recarregar()
    }
  }

  async function excluirAluno() {
    setSaving(true)
    await fetch(`/api/alunos/${id}`, { method: 'DELETE' })
    setSaving(false)
    router.push('/alunos')
  }

  async function alterarStatusTarefa(tarefaId: string, novoStatus: StatusTarefa) {
    await fetch(`/api/tarefas/${tarefaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    recarregar()
  }

  function recarregar() {
    fetch(`/api/alunos/${id}`).then((r) => r.json()).then(setAluno)
    fetch(`/api/alunos/${id}/comunicacoes`).then((r) => r.json()).then((d) => setComunicacoes(Array.isArray(d) ? d : []))
  }

  if (loading) return <div className="flex h-full items-center justify-center p-8 text-gray-500">Carregando...</div>
  if (!aluno || aluno.error) return <div className="p-8 text-red-500">Aluno não encontrado</div>

  const tarefasAbertas = aluno.tarefas?.filter((t: any) => t.status !== 'CONCLUIDA') || []
  const tarefasConcluidas = aluno.tarefas?.filter((t: any) => t.status === 'CONCLUIDA') || []
  const tarefasAtrasadas = tarefasAbertas.filter((t: any) => t.prazo && new Date(t.prazo) < new Date()).length

  const riscoChurn = aluno.statusAtual === 'ATIVO'
    ? calcularRiscoChurn({
        dataUltimoFollowUp: aluno.dataUltimoFollowUp,
        dataVencimento: aluno.dataVencimento,
        dataUltimaAnalisePlano: aluno.dataUltimaAnalisePlano,
        tarefasAtrasadas,
        statusAtual: aluno.statusAtual,
      })
    : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/alunos"><ArrowLeft size={20} /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{aluno.nome}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${planoColors[aluno.plano as Plano]}`}>
                {aluno.plano}
              </span>
              {aluno.statusAtual === StatusAluno.ATIVO && (
                <FaseBadge fase={aluno.faseAtual as FaseMentoria} />
              )}
              {riscoChurn && riscoChurn.nivel !== 'BAIXO' && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${riscoConfig[riscoChurn.nivel].badge}`}>
                  <ShieldAlert size={11} /> Risco {riscoChurn.label} ({riscoChurn.score})
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{statusLabels[aluno.statusAtual as StatusAluno]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {aluno.statusAtual === StatusAluno.ATIVO && (
            <>
              <Button size="sm" onClick={() => setFollowUpModal(true)}>Registrar follow-up</Button>
              <Button size="sm" variant="outline" onClick={() => setAnaliseModal(true)}>Análise do plano</Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setFaseModal(true)}>Alterar fase</Button>
          {aluno.statusAtual === StatusAluno.ATIVO && (
            <>
              <Button size="sm" variant="outline" onClick={() => setAprovacaoModal(true)}>Aprovado!</Button>
              <Button size="sm" variant="destructive" onClick={() => setChurnModal(true)}>Churn</Button>
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contato</h3>
            {aluno.email && (
              <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-gray-400" />{aluno.email}</div>
            )}
            {aluno.whatsapp && (
              <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-gray-400" />{aluno.whatsapp}</div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">CPF: {aluno.cpf}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</h3>
            <div className="flex items-center gap-2 text-sm"><Calendar size={14} className="text-gray-400" />Entrada: {formatDate(aluno.dataEntrada)}</div>
            <div className="flex items-center gap-2 text-sm"><Clock size={14} className="text-gray-400" />Vencimento: {formatDate(aluno.dataVencimento)}</div>
            {aluno.dataProva && (
              <div className="flex items-center gap-2 text-sm text-purple-600"><Calendar size={14} />Prova: {formatDate(aluno.dataProva)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do estudo</h3>

            {/* Área de estudo — editável pela equipe */}
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Área de estudo</p>
              {editingAreaEstudo ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={areaEstudoInput}
                    onChange={(e) => setAreaEstudoInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        setSavingAreaEstudo(true)
                        await fetch(`/api/alunos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ areaEstudo: areaEstudoInput }) })
                        setAluno((prev: any) => ({ ...prev, areaEstudo: areaEstudoInput }))
                        setSavingAreaEstudo(false)
                        setEditingAreaEstudo(false)
                        toast({ title: 'Área de estudo atualizada!', variant: 'success' })
                      }
                      if (e.key === 'Escape') setEditingAreaEstudo(false)
                    }}
                    className="flex-1 rounded border border-indigo-300 px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                    placeholder="Ex: Área Jurídica, Policial..."
                  />
                  <button onClick={async () => {
                    setSavingAreaEstudo(true)
                    await fetch(`/api/alunos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ areaEstudo: areaEstudoInput }) })
                    setAluno((prev: any) => ({ ...prev, areaEstudo: areaEstudoInput }))
                    setSavingAreaEstudo(false)
                    setEditingAreaEstudo(false)
                    toast({ title: 'Área de estudo atualizada!', variant: 'success' })
                  }} className="text-indigo-600 hover:text-indigo-800">
                    {savingAreaEstudo ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  </button>
                  <button onClick={() => setEditingAreaEstudo(false)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group">
                  <GraduationCap size={13} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-800 flex-1">{aluno.areaEstudo || <span className="italic text-gray-300 text-xs">Não definida</span>}</span>
                  <button onClick={() => { setAreaEstudoInput(aluno.areaEstudo || ''); setEditingAreaEstudo(true) }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-opacity">
                    <Edit size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Concurso */}
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Concurso</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Target size={13} className="text-gray-400 shrink-0" />
                <span className="text-gray-800">
                  {(() => {
                    const resp = Array.isArray(aluno.onboardingRespostas)
                      ? (aluno.onboardingRespostas as { pergunta: string; resposta: string }[]).find(r => r.pergunta === 'Qual concurso almejado?')?.resposta
                      : null
                    return resp || <span className="italic text-gray-300 text-xs">Não informado</span>
                  })()}
                </span>
              </div>
            </div>

            {/* Curso */}
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Curso</p>
              <div className="flex items-center gap-1.5 text-sm">
                <BookOpen size={13} className="text-gray-400 shrink-0" />
                <span className="text-gray-800">{aluno.cursoPrincipal || <span className="italic text-gray-300 text-xs">Não informado</span>}</span>
              </div>
            </div>

            {/* Plataforma de questões */}
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Plataforma de questões</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Monitor size={13} className="text-gray-400 shrink-0" />
                <span className="text-gray-800">{aluno.plataformaQuestoes || <span className="italic text-gray-300 text-xs">Não informada</span>}</span>
              </div>
            </div>

            {/* Último follow-up */}
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Último follow-up</p>
              <div className="flex items-center gap-1.5 text-sm">
                <PhoneCall size={13} className={aluno.dataUltimoFollowUp && daysDiff(aluno.dataUltimoFollowUp) > 20 ? 'text-red-400' : 'text-gray-400'} />
                <span className={aluno.dataUltimoFollowUp && daysDiff(aluno.dataUltimoFollowUp) > 20 ? 'text-red-600 font-medium' : 'text-gray-800'}>
                  {aluno.dataUltimoFollowUp ? `${daysDiff(aluno.dataUltimoFollowUp)}d atrás` : <span className="italic text-gray-300 text-xs">Nunca realizado</span>}
                </span>
              </div>
            </div>

            {aluno.linkTutory && (
              <a href={aluno.linkTutory} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <ExternalLink size={12} />Abrir Tutory
              </a>
            )}
          </CardContent>
        </Card>
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1">
              <User size={12} /> Responsável pelo acompanhamento
            </h3>
            {aluno.responsavelAcomp ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                  {aluno.responsavelAcomp.nome[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{aluno.responsavelAcomp.nome}</p>
                  {aluno.responsavelAcomp.cargo && <p className="text-xs text-gray-500">{aluno.responsavelAcomp.cargo}</p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Nenhum responsável definido</p>
            )}
            <Select
              value={aluno.responsavelAcompId || '__none__'}
              onValueChange={async (v) => {
                const novoId = v === '__none__' ? '' : v
                const res = await fetch(`/api/alunos/${id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ responsavelAcompId: novoId }),
                })
                if (res.ok) {
                  toast({ title: 'Responsável atualizado!', variant: 'success' })
                  recarregar()
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="Definir responsável..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {membros.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tarefas">
        <TabsList>
          <TabsTrigger value="tarefas">Tarefas ({tarefasAbertas.length})</TabsTrigger>
          <TabsTrigger value="comunicacoes">Comunicações ({comunicacoes.length})</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({aluno.followUps?.length || 0})</TabsTrigger>
          <TabsTrigger value="analises">Análises ({aluno.analisesPlanos?.length || 0})</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="comentarios">Comentários ({aluno.comentarios?.length || 0})</TabsTrigger>
          {aluno.onboardingRespostas && Array.isArray(aluno.onboardingRespostas) && aluno.onboardingRespostas.length > 0 && (
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          )}
        </TabsList>

        {/* Tarefas */}
        <TabsContent value="tarefas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Tarefas do aluno</h3>
            <HoverBorderGradient as="button" onClick={() => setTarefaModal(true)} containerClassName="rounded-lg" className="text-xs font-medium h-8 px-3">
              <Plus size={13} /> Nova tarefa
            </HoverBorderGradient>
          </div>
          {tarefasAbertas.length === 0 && <p className="text-sm text-gray-500">Nenhuma tarefa aberta.</p>}
          <div className="space-y-2">
            {tarefasAbertas.map((t: any) => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{t.titulo}</p>
                  {t.descricao && <p className="text-xs text-gray-500">{t.descricao}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <UrgenciaBadge urgencia={t.urgencia} />
                    {t.prazo && <span className="text-xs text-gray-500">Prazo: {formatDate(t.prazo)}</span>}
                    {t.responsavel && <span className="text-xs text-gray-500">{t.responsavel.nome}</span>}
                  </div>
                </div>
                <Select
                  value={t.status}
                  onValueChange={(v) => alterarStatusTarefa(t.id, v as StatusTarefa)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_FAZER">A fazer</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                    <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {tarefasConcluidas.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer">Tarefas concluídas ({tarefasConcluidas.length})</summary>
              <div className="space-y-2 mt-2">
                {tarefasConcluidas.map((t: any) => (
                  <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-sm text-gray-500 line-through">{t.titulo}</span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(t.concluidaEm)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </TabsContent>

        {/* Comunicações */}
        <TabsContent value="comunicacoes" className="space-y-2">
          {comunicacoes.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhuma comunicação registrada.</p>
          ) : (
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-100" />
              <div className="space-y-3">
                {comunicacoes.map((ev: any) => {
                  const iconMap: Record<string, { icon: React.ReactNode; cor: string }> = {
                    FOLLOWUP:         { icon: <PhoneCall size={13} />,   cor: 'bg-blue-500' },
                    ANALISE:          { icon: <BarChart2 size={13} />,   cor: 'bg-purple-500' },
                    COMENTARIO:       { icon: <MessageSquare size={13} />, cor: 'bg-gray-500' },
                    FASE:             { icon: <GitBranch size={13} />,   cor: 'bg-orange-500' },
                    TAREFA_CONCLUIDA: { icon: <CheckSquare size={13} />, cor: 'bg-emerald-500' },
                  }
                  const { icon, cor } = iconMap[ev.tipo] ?? { icon: <Activity size={13} />, cor: 'bg-gray-400' }
                  return (
                    <div key={ev.id} className="flex gap-4 relative">
                      <div className={`w-10 h-10 rounded-full ${cor} text-white flex items-center justify-center shrink-0 z-10 shadow-sm`}>
                        {icon}
                      </div>
                      <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 pb-2 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900">{ev.titulo}</p>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {formatDateTime(ev.data)}
                          </span>
                        </div>
                        {ev.descricao && (
                          <p className="text-sm text-gray-600 leading-relaxed">{ev.descricao}</p>
                        )}
                        {ev.responsavel && (
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
                            <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] flex items-center justify-center font-bold">
                              {ev.responsavel.nome?.[0]}
                            </div>
                            <span className="text-[11px] text-gray-500">{ev.responsavel.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Follow-ups */}
        <TabsContent value="followups" className="space-y-3">
          {(!aluno.followUps || aluno.followUps.length === 0) && (
            <p className="text-sm text-gray-500">Nenhum follow-up registrado.</p>
          )}
          {aluno.followUps?.map((f: any) => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{f.responsavel?.nome}</span>
                <span className="text-xs text-gray-500">{formatDateTime(f.realizadoEm)}</span>
              </div>
              {f.observacao && <p className="text-sm text-gray-600">{f.observacao}</p>}
            </div>
          ))}
        </TabsContent>

        {/* Análises */}
        <TabsContent value="analises" className="space-y-3">
          {(!aluno.analisesPlansos || aluno.analisesPlansos.length === 0) && (
            <p className="text-sm text-gray-500">Nenhuma análise registrada.</p>
          )}
          {aluno.analisesPlansos?.map((a: any) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{a.responsavel?.nome}</span>
                <span className="text-xs text-gray-500">{formatDateTime(a.realizadaEm)}</span>
              </div>
              {a.observacao && <p className="text-sm text-gray-600">{a.observacao}</p>}
            </div>
          ))}
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico" className="space-y-2">
          {aluno.mudancasFase?.map((m: any) => (
            <div key={m.id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm">
                  Fase: {m.fasAnterior && <span className="text-gray-500">{m.fasAnterior} → </span>}
                  <strong>{m.faseNova}</strong>
                  {!m.automatica && <span className="text-xs text-orange-500 ml-2">(manual)</span>}
                </p>
                {m.motivo && <p className="text-xs text-gray-500">{m.motivo}</p>}
                <p className="text-xs text-gray-400">{formatDateTime(m.criadoEm)}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Comentários */}
        <TabsContent value="comentarios" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setComentarioModal(true)}>
              <MessageCircle size={16} className="mr-1" /> Comentar
            </Button>
          </div>
          {(!aluno.comentarios || aluno.comentarios.length === 0) && (
            <p className="text-sm text-gray-500">Nenhum comentário ainda.</p>
          )}
          {aluno.comentarios?.map((c: any) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold">
                  {c.autor?.nome?.[0]}
                </div>
                <span className="text-sm font-medium">{c.autor?.nome}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatDateTime(c.criadoEm)}</span>
              </div>
              <p className="text-sm text-gray-700">{c.texto}</p>
            </div>
          ))}
        </TabsContent>

        {/* Onboarding */}
        {aluno.onboardingRespostas && Array.isArray(aluno.onboardingRespostas) && aluno.onboardingRespostas.length > 0 && (
          <TabsContent value="onboarding" className="space-y-3">
            <p className="text-xs text-gray-400">Respostas preenchidas pelo aluno no formulário de onboarding.</p>
            <div className="grid gap-3">
              {(aluno.onboardingRespostas as { pergunta: string; resposta: string }[]).map((item, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{item.pergunta}</p>
                  <p className="text-[13px] text-gray-800 whitespace-pre-wrap">{item.resposta}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Zona de perigo */}
      <Card className="border-red-200">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">Zona de perigo</p>
            <p className="text-xs text-gray-500">Esta ação é irreversível.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
            Excluir aluno
          </Button>
        </CardContent>
      </Card>

      {/* MODAIS */}
      <Dialog open={followUpModal} onOpenChange={setFollowUpModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Observação</Label>
            <Textarea value={followUpObs} onChange={(e) => setFollowUpObs(e.target.value)} placeholder="O que foi discutido..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpModal(false)}>Cancelar</Button>
            <Button onClick={registrarFollowUp} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={analiseModal} onOpenChange={setAnaliseModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Análise do plano de estudos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Observação</Label>
            <Textarea value={analiseObs} onChange={(e) => setAnaliseObs(e.target.value)} placeholder="Resultado da análise..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnaliseModal(false)}>Cancelar</Button>
            <Button onClick={registrarAnalise} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TarefaModal
        open={tarefaModal}
        onOpenChange={setTarefaModal}
        form={tarefaForm}
        setForm={setTarefaForm}
        onSubmit={criarTarefa}
        saving={saving}
        membros={membros}
        alunoFixo={aluno ? { id: aluno.id, nome: aluno.nome } : undefined}
      />

      <Dialog open={comentarioModal} onOpenChange={setComentarioModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar comentário</DialogTitle></DialogHeader>
          <Textarea value={comentarioTexto} onChange={(e) => setComentarioTexto(e.target.value)} placeholder="Escreva um comentário..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setComentarioModal(false)}>Cancelar</Button>
            <Button onClick={adicionarComentario} disabled={saving || !comentarioTexto.trim()}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={faseModal} onOpenChange={setFaseModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar fase manualmente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nova fase</Label>
              <Select value={faseForm.faseNova} onValueChange={(v) => setFaseForm(f => ({ ...f, faseNova: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                  <SelectItem value="PRE_EDITAL">Pré-edital</SelectItem>
                  <SelectItem value="POS_EDITAL">Pós-edital</SelectItem>
                  <SelectItem value="PROXIMO_VENCIMENTO">Próximo ao vencimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo *</Label>
              <Textarea value={faseForm.motivo} onChange={(e) => setFaseForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Por que está alterando?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaseModal(false)}>Cancelar</Button>
            <Button onClick={alterarFase} disabled={saving}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aprovacaoModal} onOpenChange={setAprovacaoModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar aprovação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Concurso / cargo *</Label>
              <Input value={aprovacaoForm.concurso} onChange={(e) => setAprovacaoForm(f => ({ ...f, concurso: e.target.value }))} placeholder="Ex: Analista Judiciário - TRT-SP" />
            </div>
            <div className="space-y-1.5">
              <Label>Data da aprovação *</Label>
              <Input type="date" value={aprovacaoForm.dataAprovacao} onChange={(e) => setAprovacaoForm(f => ({ ...f, dataAprovacao: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={aprovacaoForm.observacao} onChange={(e) => setAprovacaoForm(f => ({ ...f, observacao: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovacaoModal(false)}>Cancelar</Button>
            <Button onClick={registrarAprovacao} disabled={saving} className="bg-green-600 hover:bg-green-700">Registrar aprovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={churnModal} onOpenChange={setChurnModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar churn</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={churnForm.motivo} onValueChange={(v) => setChurnForm(f => ({ ...f, motivo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESCISAO_SOLICITADA">Rescisão solicitada</SelectItem>
                  <SelectItem value="VENCIMENTO_SEM_RENOVACAO">Vencimento sem renovação</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={churnForm.observacao} onChange={(e) => setChurnForm(f => ({ ...f, observacao: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChurnModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={registrarChurn} disabled={saving}>Registrar churn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Excluir aluno?"
        description={`Tem certeza que deseja excluir "${aluno.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={excluirAluno}
        loading={saving}
      />
    </div>
  )
}
