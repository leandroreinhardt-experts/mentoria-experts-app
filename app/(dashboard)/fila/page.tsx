'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, AlertTriangle, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FaseBadge } from '@/components/shared/FaseBadge'
import { toast } from '@/hooks/use-toast'
import { FaseMentoria, Plano } from '@prisma/client'

const planoColors: Record<Plano, string> = {
  START: 'bg-gray-100 text-gray-700',
  PRO: 'bg-purple-100 text-purple-700',
  ELITE: 'bg-yellow-100 text-yellow-700',
}

export default function FilaPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchFila() {
    const res = await fetch('/api/fila')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { fetchFila() }, [])

  async function marcarAnalisado() {
    if (!modal) return
    setSaving(true)
    const res = await fetch(`/api/alunos/${modal.id}/followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observacao: obs }),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'Follow-up registrado!', description: 'Aluno removido da fila.', variant: 'success' })
      setModal(null)
      setObs('')
      fetchFila()
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center p-8 text-gray-500">Carregando...</div>

  const { filaDoDia = [], maxDiario = 0, totalPendentes = 0 } = data || {}

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fila do dia</h1>
        <p className="text-sm text-gray-500">
          {filaDoDia.length} de {maxDiario} slots — {totalPendentes} alunos pendentes no total
        </p>
      </div>

      {filaDoDia.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900">Fila em dia!</h3>
          <p className="text-sm text-gray-500 mt-1">Todos os alunos PRO/ELITE foram analisados recentemente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filaDoDia.map((aluno: any) => (
            <div
              key={aluno.id}
              className={`bg-white border rounded-xl p-4 flex items-center justify-between ${aluno.urgente ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-4">
                {aluno.urgente && (
                  <AlertTriangle size={20} className="text-red-500 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/alunos/${aluno.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                      {aluno.nome}
                    </Link>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${planoColors[aluno.plano as Plano]}`}>
                      {aluno.plano}
                    </span>
                    <FaseBadge fase={aluno.faseAtual as FaseMentoria} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {aluno.diasSemFollowUp >= 999
                        ? 'Nunca analisado'
                        : `${aluno.diasSemFollowUp} dias sem follow-up`}
                    </span>
                    {aluno.urgente && (
                      <span className="text-red-600 font-medium">⚠️ Urgente</span>
                    )}
                    {aluno.responsavelAcomp ? (
                      <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        <User size={11} />
                        {aluno.responsavelAcomp.nome}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-xs">
                        <User size={11} />
                        Sem responsável
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={() => setModal(aluno)}>
                Marcar analisado
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!modal} onOpenChange={() => { setModal(null); setObs('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar follow-up — {modal?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Observação (opcional)</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="O que foi discutido..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModal(null); setObs('') }}>Cancelar</Button>
            <Button onClick={marcarAnalisado} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
