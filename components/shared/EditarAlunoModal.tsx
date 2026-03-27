'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

interface AlunoEditavel {
  id: string
  nome: string
  cpf: string
  email?: string | null
  whatsapp?: string | null
  dataEntrada: string
  dataVencimento: string
  dataProva?: string | null
  plano: string
  statusAtual: string
  cursoPrincipal?: string | null
  plataformaQuestoes?: string | null
  areaEstudo?: string | null
  linkTutory?: string | null
  incluiAcessoEstrategia?: boolean
  onboardingRespostas?: any[] | null
}

interface Props {
  aluno: AlunoEditavel
  open: boolean
  onClose: () => void
  onSaved: (atualizado: any) => void
}

function toDateInput(val?: string | null) {
  if (!val) return ''
  return new Date(val).toISOString().split('T')[0]
}

export function EditarAlunoModal({ aluno, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ ...aluno, dataEntrada: '', dataVencimento: '', dataProva: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const concursoCargo =
        (aluno.onboardingRespostas as any[])?.find(
          (r: any) => r.pergunta === 'Concurso / Cargo' || r.pergunta === 'Qual concurso almejado?'
        )?.resposta ?? ''

      setForm({
        nome: aluno.nome ?? '',
        cpf: aluno.cpf ?? '',
        email: aluno.email ?? '',
        whatsapp: aluno.whatsapp ?? '',
        dataEntrada: toDateInput(aluno.dataEntrada),
        dataVencimento: toDateInput(aluno.dataVencimento),
        dataProva: toDateInput(aluno.dataProva),
        plano: aluno.plano ?? 'PRO',
        statusAtual: aluno.statusAtual ?? 'ATIVO',
        cursoPrincipal: aluno.cursoPrincipal ?? '',
        plataformaQuestoes: aluno.plataformaQuestoes ?? '',
        areaEstudo: aluno.areaEstudo ?? '',
        linkTutory: aluno.linkTutory ?? '',
        incluiAcessoEstrategia: aluno.incluiAcessoEstrategia ?? false,
        concursoCargo,
      } as any)
    }
  }, [open, aluno])

  function set(field: string, value: any) {
    setForm((prev: any) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!(form as any).nome?.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    if (!(form as any).cpf?.trim()) {
      toast({ title: 'CPF obrigatório', variant: 'destructive' })
      return
    }

    // Merge concursoCargo back into onboardingRespostas
    const existingRespostas: any[] = (aluno.onboardingRespostas as any[]) ?? []
    const concursoCargo = (form as any).concursoCargo ?? ''
    let respostas = existingRespostas.filter(
      (r: any) => r.pergunta !== 'Concurso / Cargo' && r.pergunta !== 'Qual concurso almejado?'
    )
    if (concursoCargo) {
      respostas = [{ pergunta: 'Concurso / Cargo', resposta: concursoCargo }, ...respostas]
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/alunos/${aluno.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: (form as any).nome,
          cpf: (form as any).cpf,
          email: (form as any).email || null,
          whatsapp: (form as any).whatsapp || null,
          dataEntrada: (form as any).dataEntrada,
          dataVencimento: (form as any).dataVencimento,
          dataProva: (form as any).dataProva || null,
          plano: (form as any).plano,
          statusAtual: (form as any).statusAtual,
          cursoPrincipal: (form as any).cursoPrincipal || null,
          plataformaQuestoes: (form as any).plataformaQuestoes || null,
          areaEstudo: (form as any).areaEstudo || null,
          linkTutory: (form as any).linkTutory || null,
          incluiAcessoEstrategia: (form as any).incluiAcessoEstrategia,
          onboardingRespostas: respostas,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        toast({ title: 'Erro ao salvar', description: d.error || 'Tente novamente.', variant: 'destructive' })
        return
      }

      const atualizado = await res.json()
      toast({ title: 'Dados atualizados!', variant: 'success' })
      onSaved(atualizado)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar dados do aluno</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── Dados cadastrais ───────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados cadastrais</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Nome completo *</Label>
                <Input value={(form as any).nome} onChange={(e) => set('nome', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF *</Label>
                <Input value={(form as any).cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input value={(form as any).whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+55 00 00000-0000" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={(form as any).email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="aluno@email.com" />
              </div>
            </div>
          </section>

          {/* ── Período ────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Período da mentoria</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data de início *</Label>
                <Input type="date" value={(form as any).dataEntrada} onChange={(e) => set('dataEntrada', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data de vencimento *</Label>
                <Input type="date" value={(form as any).dataVencimento} onChange={(e) => set('dataVencimento', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data da prova</Label>
                <Input type="date" value={(form as any).dataProva ?? ''} onChange={(e) => set('dataProva', e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Plano ──────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Plano e status</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Plano</Label>
                <Select value={(form as any).plano} onValueChange={(v) => set('plano', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="START">START</SelectItem>
                    <SelectItem value="PRO">PRO</SelectItem>
                    <SelectItem value="ELITE">ELITE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={(form as any).statusAtual} onValueChange={(v) => set('statusAtual', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="APROVADO">Aprovado</SelectItem>
                    <SelectItem value="CHURN">Churn</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inclui Estratégia?</Label>
                <Select
                  value={(form as any).incluiAcessoEstrategia ? 'sim' : 'nao'}
                  onValueChange={(v) => set('incluiAcessoEstrategia', v === 'sim')}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Dados do estudo ────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados do estudo</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Concurso / Cargo</Label>
                <Input value={(form as any).concursoCargo ?? ''} onChange={(e) => set('concursoCargo', e.target.value)} placeholder="Ex: TJ-SP — Técnico Judiciário" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Área de estudo</Label>
                <Input value={(form as any).areaEstudo ?? ''} onChange={(e) => set('areaEstudo', e.target.value)} placeholder="Ex: Jurídica / Tribunais" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Curso principal</Label>
                <Input value={(form as any).cursoPrincipal ?? ''} onChange={(e) => set('cursoPrincipal', e.target.value)} placeholder="Ex: Estratégia Concursos" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Plataforma de questões</Label>
                <Select
                  value={(form as any).plataformaQuestoes ?? '__none__'}
                  onValueChange={(v) => set('plataformaQuestoes', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não definida</SelectItem>
                    <SelectItem value="Estratégia">Estratégia</SelectItem>
                    <SelectItem value="Gran Questões">Gran Questões</SelectItem>
                    <SelectItem value="Q Concursos">Q Concursos</SelectItem>
                    <SelectItem value="Tec Concursos">Tec Concursos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Link Tutory</Label>
                <Input value={(form as any).linkTutory ?? ''} onChange={(e) => set('linkTutory', e.target.value)} placeholder="https://tutory.com.br/..." />
              </div>
            </div>
          </section>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
