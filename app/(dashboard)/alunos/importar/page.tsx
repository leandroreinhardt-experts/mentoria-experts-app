'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, Loader2, File } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

// Campos do sistema e seus labels
const camposSistema = [
  { value: 'nome', label: 'Nome *' },
  { value: 'cpf', label: 'CPF *' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'dataEntrada', label: 'Data de entrada' },
  { value: 'dataVencimento', label: 'Data de vencimento' },
  { value: 'plano', label: 'Plano (START/PRO/ELITE)' },
  { value: 'cursoPrincipal', label: 'Curso principal' },
  { value: 'areaEstudo', label: 'Área de estudo' },
  { value: 'incluiAcessoEstrategia', label: 'Acesso Estratégia (true/false)' },
  { value: '_ignorar', label: '— Ignorar coluna —' },
]

export default function ImportarPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'mapeamento' | 'resultado'>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [colunas, setColunas] = useState<string[]>([])
  const [preview, setPreview] = useState<any[][]>([])
  const [mapeamento, setMapeamento] = useState<Record<number, string>>({})
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function processarArquivo(file: File) {
    const { read, utils } = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = utils.sheet_to_json(ws, { header: 1 }) as any[][]
    if (rows.length === 0) { toast({ title: 'Arquivo vazio', variant: 'destructive' }); return }

    const header = rows[0].map(String)
    const previewRows = rows.slice(1, 6)
    setColunas(header)
    setPreview(previewRows)

    // Auto-mapear por nome da coluna
    const autoMap: Record<number, string> = {}
    header.forEach((col: string, i: number) => {
      const colLower = col.toLowerCase().replace(/\s/g, '')
      if (colLower.includes('nome')) autoMap[i] = 'nome'
      else if (colLower.includes('cpf')) autoMap[i] = 'cpf'
      else if (colLower.includes('email')) autoMap[i] = 'email'
      else if (colLower.includes('whats') || colLower.includes('fone') || colLower.includes('celular')) autoMap[i] = 'whatsapp'
      else if (colLower.includes('entrada')) autoMap[i] = 'dataEntrada'
      else if (colLower.includes('vencimento') || colLower.includes('expira')) autoMap[i] = 'dataVencimento'
      else if (colLower.includes('plano')) autoMap[i] = 'plano'
      else if (colLower.includes('curso')) autoMap[i] = 'cursoPrincipal'
      else if (colLower.includes('area') || colLower.includes('cargo')) autoMap[i] = 'areaEstudo'
      else autoMap[i] = '_ignorar'
    })
    setMapeamento(autoMap)
    setStep('mapeamento')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) { setArquivo(file); processarArquivo(file) }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setArquivo(file); processarArquivo(file) }
  }

  async function importar() {
    if (!arquivo) return
    const { read, utils } = await import('xlsx')
    const buffer = await arquivo.arrayBuffer()
    const wb = read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = utils.sheet_to_json(ws, { header: 1 }) as any[][]
    const dataRows = rows.slice(1)

    const alunos = dataRows.map((row) => {
      const obj: any = {}
      Object.entries(mapeamento).forEach(([colIdx, campo]) => {
        if (campo !== '_ignorar') {
          obj[campo] = row[Number(colIdx)] !== undefined ? String(row[Number(colIdx)]) : ''
        }
      })
      return obj
    }).filter((a) => a.nome || a.cpf)

    setLoading(true)
    const res = await fetch('/api/alunos/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alunos, nomeArquivo: arquivo.name }),
    })
    setLoading(false)
    const data = await res.json()
    setResultado(data)
    setStep('resultado')
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/alunos"><ArrowLeft size={20} /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar planilha</h1>
          <p className="text-sm text-gray-500">Importe alunos via arquivo .xlsx ou .csv</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6">
        {['Upload', 'Mapeamento', 'Resultado'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === ['upload', 'mapeamento', 'resultado'][i] ? 'bg-blue-600 text-white' :
              i < ['upload', 'mapeamento', 'resultado'].indexOf(step) ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>{i + 1}</div>
            <span className="text-sm text-gray-600">{s}</span>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Upload */}
      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload size={40} className="text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">Arraste o arquivo aqui</h3>
          <p className="text-sm text-gray-500 mt-1">ou clique para selecionar (.xlsx ou .csv)</p>
          <input id="file-input" type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Mapeamento */}
      {step === 'mapeamento' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <File size={16} className="text-blue-600" />
            <span className="text-sm text-blue-700">{arquivo?.name} — {preview.length} linhas de preview</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Coluna do arquivo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mapear para</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Exemplos</th>
                </tr>
              </thead>
              <tbody>
                {colunas.map((col, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-800">{col}</td>
                    <td className="px-4 py-2">
                      <Select
                        value={mapeamento[i] || '_ignorar'}
                        onValueChange={(v) => setMapeamento((m) => ({ ...m, [i]: v }))}
                      >
                        <SelectTrigger className="h-8 text-xs w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {camposSistema.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {preview.slice(0, 2).map((row) => row[i]).filter(Boolean).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
            <Button onClick={importar} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar alunos
            </Button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {step === 'resultado' && resultado && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle size={24} className="text-green-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{resultado.importados}</div>
              <div className="text-sm text-green-600">Importados</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <AlertTriangle size={24} className="text-yellow-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-yellow-700">{resultado.duplicados}</div>
              <div className="text-sm text-yellow-600">CPFs duplicados (ignorados)</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertTriangle size={24} className="text-red-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{resultado.erros}</div>
              <div className="text-sm text-red-600">Erros</div>
            </div>
          </div>

          {resultado.detalhesErros?.length > 0 && (
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-700 mb-2">Detalhes dos erros</h3>
              <div className="space-y-1">
                {resultado.detalhesErros.map((e: any, i: number) => (
                  <div key={i} className="text-xs text-red-600">
                    Linha {e.linha}: {e.erro} {e.cpf && `(CPF: ${e.cpf})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setArquivo(null); setResultado(null) }}>
              Nova importação
            </Button>
            <Button onClick={() => router.push('/alunos')}>Ver alunos</Button>
          </div>
        </div>
      )}
    </div>
  )
}
