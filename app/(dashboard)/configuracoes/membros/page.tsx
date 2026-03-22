'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Loader2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { NivelAcesso } from '@prisma/client'
import { formatDate } from '@/lib/utils'

export default function MembrosPage() {
  const { data: session } = useSession()
  const [membros, setMembros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', cargo: '', nivelAcesso: 'MEMBRO',
  })

  const isAdmin = (session?.user as any)?.nivelAcesso === NivelAcesso.ADMIN

  async function fetchMembros() {
    const res = await fetch('/api/membros')
    const d = await res.json()
    setMembros(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { fetchMembros() }, [])

  async function criarMembro() {
    if (!form.nome || !form.email || !form.senha) {
      toast({ title: 'Campos obrigatórios', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/membros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'Membro criado!', variant: 'success' })
      setModal(false)
      setForm({ nome: '', email: '', senha: '', cargo: '', nivelAcesso: 'MEMBRO' })
      fetchMembros()
    } else {
      const d = await res.json()
      toast({ title: 'Erro', description: d.error, variant: 'destructive' })
    }
  }

  async function toggleAtivo(membro: any) {
    await fetch(`/api/membros/${membro.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: membro.nome, cargo: membro.cargo, nivelAcesso: membro.nivelAcesso, ativo: !membro.ativo }),
    })
    fetchMembros()
  }

  if (loading) return <div className="flex h-full items-center justify-center p-8 text-gray-500">Carregando...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membros do time</h1>
          <p className="text-sm text-gray-500">{membros.length} membros cadastrados</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setModal(true)}>
            <Plus size={16} className="mr-2" /> Novo membro
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nível</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Desde</th>
              {isAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {membros.map((m: any) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{m.nome}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.cargo || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.nivelAcesso === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.nivelAcesso === 'ADMIN' ? 'Admin' : 'Membro'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {m.ativo
                    ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><UserCheck size={14} />Ativo</span>
                    : <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium"><UserX size={14} />Inativo</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(m.criadoEm)}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {m.id !== session?.user.id && (
                      <Button variant="ghost" size="sm" onClick={() => toggleAtivo(m)}>
                        {m.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo membro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha *</Label>
              <Input type="password" value={form.senha} onChange={(e) => setForm(f => ({ ...f, senha: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Mentora, CS, ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Nível de acesso</Label>
              <Select value={form.nivelAcesso} onValueChange={(v) => setForm(f => ({ ...f, nivelAcesso: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBRO">Membro</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={criarMembro} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
