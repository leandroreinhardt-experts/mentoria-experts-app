'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

const cursosOpcoes = ['Estratégia Concursos', 'Gran Cursos', 'Cers', 'JusCelso', 'Alfacon', 'Casa do Concurseiro', 'Outro']
const plataformasOpcoes = ['QConcursos', 'Cebraspe', 'Gran', 'Tecconcursos', 'Estratégia', 'Outro']

export default function NovoAlunoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    whatsapp: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    plano: 'PRO',
    cursoPrincipal: '',
    plataformaQuestoes: '',
    areaEstudo: '',
    dataProva: '',
    linkTutory: '',
    incluiAcessoEstrategia: false,
  })

  function set(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.cpf || !form.dataEntrada || !form.dataVencimento || !form.plano) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, CPF, datas e plano.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const res = await fetch('/api/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erro ao cadastrar', description: data.error || 'Tente novamente.', variant: 'destructive' })
      return
    }
    toast({ title: 'Aluno cadastrado!', description: 'Tarefas de onboarding criadas automaticamente.', variant: 'success' })
    router.push(`/alunos/${data.id}`)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/alunos"><ArrowLeft size={20} /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo aluno</h1>
          <p className="text-sm text-gray-500">Cadastre um novo aluno na mentoria</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" required />
            </div>
            <div className="space-y-1.5">
              <Label>CPF *</Label>
              <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" required />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados da mentoria</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <Select value={form.plano} onValueChange={(v) => set('plano', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="START">START</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                  <SelectItem value="ELITE">ELITE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de entrada *</Label>
              <Input type="date" value={form.dataEntrada} onChange={(e) => set('dataEntrada', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Data de vencimento *</Label>
              <Input type="date" value={form.dataVencimento} onChange={(e) => set('dataVencimento', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Data da prova</Label>
              <Input type="date" value={form.dataProva} onChange={(e) => set('dataProva', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Curso principal</Label>
              <Select value={form.cursoPrincipal} onValueChange={(v) => set('cursoPrincipal', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {cursosOpcoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma de questões</Label>
              <Select value={form.plataformaQuestoes} onValueChange={(v) => set('plataformaQuestoes', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {plataformasOpcoes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Área de estudo / cargo almejado</Label>
              <Input value={form.areaEstudo} onChange={(e) => set('areaEstudo', e.target.value)} placeholder="Ex: Analista Judiciário - TRT" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Link Tutory</Label>
              <Input value={form.linkTutory} onChange={(e) => set('linkTutory', e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.incluiAcessoEstrategia}
                  onChange={(e) => set('incluiAcessoEstrategia', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Inclui acesso à plataforma Estratégia Concursos</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/alunos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar aluno
          </Button>
        </div>
      </form>
    </div>
  )
}
