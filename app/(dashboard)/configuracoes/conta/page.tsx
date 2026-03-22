'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export default function ContaPage() {
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState(session?.user?.name || '')
  const [cargo, setCargo] = useState((session?.user as any)?.cargo || '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  async function salvar() {
    if (!session?.user?.id) return
    setSaving(true)
    const res = await fetch(`/api/membros/${session.user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        cargo,
        ...(novaSenha && { novaSenha }),
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'Dados atualizados!', variant: 'success' })
      setSenhaAtual('')
      setNovaSenha('')
    } else {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha conta</h1>
        <p className="text-sm text-gray-500">Atualize suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={session?.user?.email || ''} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Seu cargo na equipe" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alterar senha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Deixe em branco para não alterar" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar alterações
      </Button>
    </div>
  )
}
