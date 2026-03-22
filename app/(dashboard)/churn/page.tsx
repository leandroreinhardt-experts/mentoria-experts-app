'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Plano } from '@prisma/client'

const planoColors: Record<Plano, string> = {
  START: 'bg-gray-100 text-gray-700',
  PRO: 'bg-purple-100 text-purple-700',
  ELITE: 'bg-yellow-100 text-yellow-700',
}

const motivoLabels: Record<string, string> = {
  RESCISAO_SOLICITADA: 'Rescisão solicitada',
  VENCIMENTO_SEM_RENOVACAO: 'Vencimento sem renovação',
  OUTRO: 'Outro',
}

export default function ChurnPage() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alunos?status=CHURN&limit=100').then((r) => r.json()).then((d) => {
      setAlunos(d.alunos || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex h-full items-center justify-center p-8 text-gray-500">Carregando...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Archive className="h-7 w-7 text-gray-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Churn</h1>
          <p className="text-sm text-gray-500">{alunos.length} aluno{alunos.length !== 1 ? 's' : ''} com rescisão</p>
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Archive size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900">Nenhum churn registrado</h3>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aluno</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plano</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data entrada</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data churn</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno: any) => (
                <tr key={aluno.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/alunos/${aluno.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {aluno.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${planoColors[aluno.plano as Plano]}`}>
                      {aluno.plano}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {aluno.registroChurn?.motivo ? motivoLabels[aluno.registroChurn.motivo] || aluno.registroChurn.motivo : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(aluno.dataEntrada)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(aluno.registroChurn?.dataChurn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
