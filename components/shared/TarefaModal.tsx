'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export interface TarefaFormData {
  titulo: string
  descricao: string
  responsavelId: string
  prazo: string
  urgencia: string
  alunoId: string
}

export const tarefaFormInicial: TarefaFormData = {
  titulo: '', descricao: '', responsavelId: '', prazo: '', urgencia: 'MEDIA', alunoId: '',
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: TarefaFormData
  setForm: React.Dispatch<React.SetStateAction<TarefaFormData>>
  onSubmit: () => void
  saving: boolean
  membros: any[]
  alunos?: any[]
  alunoFixo?: { id: string; nome: string }
  titulo?: string          // título do modal (padrão: "Nova tarefa")
  labelSubmit?: string     // label do botão (padrão: "Criar")
}

export function TarefaModal({
  open, onOpenChange, form, setForm, onSubmit, saving, membros, alunos, alunoFixo,
  titulo = "Nova tarefa", labelSubmit = "Criar",
}: Props) {
  const [searchAluno, setSearchAluno] = useState('')

  const alunosFiltrados = (alunos ?? []).filter((a: any) =>
    !searchAluno || a.nome.toLowerCase().includes(searchAluno.toLowerCase())
  )

  function handleClose(v: boolean) {
    if (!v) setSearchAluno('')
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Título */}
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              autoFocus
              placeholder="Título da tarefa"
              value={form.titulo}
              onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Urgência + Prazo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Urgência</Label>
              <Select value={form.urgencia} onValueChange={(v) => setForm(f => ({ ...f, urgencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm(f => ({ ...f, prazo: e.target.value }))}
              />
            </div>
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={form.responsavelId} onValueChange={(v) => setForm(f => ({ ...f, responsavelId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {membros.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aluno — fixo (ficha do aluno) */}
          {alunoFixo && (
            <div className="space-y-1.5">
              <Label>Aluno</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-indigo-200 bg-indigo-50 text-sm text-indigo-700 font-medium">
                {alunoFixo.nome}
              </div>
            </div>
          )}

          {/* Aluno — selecionável (board, lista) */}
          {!alunoFixo && alunos !== undefined && (
            <div className="space-y-1.5">
              <Label>Aluno <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Input
                  placeholder="Buscar aluno..."
                  value={searchAluno}
                  onChange={(e) => setSearchAluno(e.target.value)}
                  className="border-0 border-b border-gray-100 rounded-none h-8 text-sm focus-visible:ring-0"
                />
                <div className="max-h-36 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, alunoId: '' })); setSearchAluno('') }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${!form.alunoId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Nenhum aluno
                  </button>
                  {alunosFiltrados.map((a: any) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, alunoId: a.id })); setSearchAluno(a.nome) }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${form.alunoId === a.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {a.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {labelSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
