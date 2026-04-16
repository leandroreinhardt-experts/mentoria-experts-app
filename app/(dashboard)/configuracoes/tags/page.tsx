'use client'

import { useEffect, useState, useRef } from 'react'
import { Pencil, Trash2, Check, X, Search, Tag, AlertTriangle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface TagItem { tag: string; count: number }
interface TagData { concursos: TagItem[]; areasEstudo: TagItem[] }

export default function GerenciarTagsPage() {
  const [data, setData] = useState<TagData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Editing state: { campo, oldTag, value }
  const [editing, setEditing] = useState<{ campo: string; oldTag: string; value: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ campo: string; tag: string; count: number } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/tags')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (editing) setTimeout(() => editInputRef.current?.focus(), 50)
  }, [editing])

  async function saveRename() {
    if (!editing || !editing.value.trim() || editing.value.trim() === editing.oldTag) {
      setEditing(null); return
    }
    setSaving(true)
    const res = await fetch('/api/admin/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campo: editing.campo, oldTag: editing.oldTag, newTag: editing.value.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      toast({ title: 'Tag renomeada!', description: `"${editing.oldTag}" → "${editing.value.trim()}"`, variant: 'success' })
      setEditing(null)
      load()
    } else {
      toast({ title: 'Erro ao renomear tag', variant: 'destructive' })
    }
  }

  async function deleteTag() {
    if (!confirmDelete) return
    setDeleting(true)
    const res = await fetch('/api/admin/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campo: confirmDelete.campo, tag: confirmDelete.tag }),
    })
    setDeleting(false)
    if (res.ok) {
      toast({ title: 'Tag removida!', description: `"${confirmDelete.tag}" removida de ${confirmDelete.count} aluno(s)`, variant: 'success' })
      setConfirmDelete(null)
      load()
    } else {
      toast({ title: 'Erro ao remover tag', variant: 'destructive' })
    }
  }

  function TagRow({ item, campo }: { item: TagItem; campo: string }) {
    const isEditing = editing?.campo === campo && editing.oldTag === item.tag
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg group transition-colors',
        isEditing ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
      )}>
        {isEditing ? (
          <>
            <input
              ref={editInputRef}
              value={editing.value}
              onChange={(e) => setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename()
                if (e.key === 'Escape') setEditing(null)
              }}
              className="flex-1 text-sm bg-white border border-indigo-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={saveRename}
              disabled={saving}
              className="text-indigo-600 hover:text-indigo-800 p-1 rounded transition-colors"
              title="Salvar"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Tag size={12} className="text-gray-400 shrink-0" />
            <span className="flex-1 text-sm text-gray-800 font-medium truncate">{item.tag}</span>
            <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
              {item.count} aluno{item.count !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => setEditing({ campo, oldTag: item.tag, value: item.tag })}
                className="p-1.5 rounded-md hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Renomear"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete({ campo, tag: item.tag, count: item.count })}
                className="p-1.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                title="Excluir"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  function filterTags(tags: TagItem[]) {
    if (!search.trim()) return tags
    return tags.filter((t) => t.tag.toLowerCase().includes(search.toLowerCase()))
  }

  return (
    <div className="p-7 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gerenciar Tags</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Renomeie ou remova tags de Concurso/Cargo e Área de estudo. As alterações se aplicam a todos os alunos com a tag selecionada.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Filtrar tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm border-gray-200 bg-gray-50 focus:bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={16} className="animate-spin" /> Carregando tags...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Concursos */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Concurso / Cargo</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{data?.concursos.length ?? 0} tags cadastradas</p>
              </div>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                {data?.concursos.reduce((s, t) => s + t.count, 0) ?? 0} alunos
              </span>
            </div>
            <div className="space-y-0.5">
              {filterTags(data?.concursos ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 italic">Nenhuma tag encontrada.</p>
              ) : (
                filterTags(data?.concursos ?? []).map((item) => (
                  <TagRow key={item.tag} item={item} campo="concursos" />
                ))
              )}
            </div>
          </div>

          {/* Áreas de estudo */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Área de estudo</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{data?.areasEstudo.length ?? 0} tags cadastradas</p>
              </div>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">
                {data?.areasEstudo.reduce((s, t) => s + t.count, 0) ?? 0} alunos
              </span>
            </div>
            <div className="space-y-0.5">
              {filterTags(data?.areasEstudo ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 italic">Nenhuma tag encontrada.</p>
              ) : (
                filterTags(data?.areasEstudo ?? []).map((item) => (
                  <TagRow key={item.tag} item={item} campo="areasEstudo" />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 shrink-0">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Remover tag</h3>
                <p className="text-sm text-gray-500 mt-1">
                  A tag <strong>"{confirmDelete.tag}"</strong> será removida de{' '}
                  <strong>{confirmDelete.count} aluno{confirmDelete.count !== 1 ? 's' : ''}</strong>.
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={deleteTag}
                disabled={deleting}
              >
                {deleting ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Trash2 size={13} className="mr-1.5" />}
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
