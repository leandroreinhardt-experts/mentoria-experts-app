'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Star } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function AprovadosPage() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alunos?status=APROVADO&limit=100').then((r) => r.json()).then((d) => {
      setAlunos(d.alunos || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex h-full items-center justify-center p-8 text-gray-500">Carregando...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mural de aprovados</h1>
          <p className="text-sm text-gray-500">{alunos.length} aprovação{alunos.length !== 1 ? 'ões' : ''} registrada{alunos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Trophy size={40} className="text-yellow-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900">Nenhum aprovado ainda</h3>
          <p className="text-sm text-gray-500 mt-1">Quando um aluno for aprovado, aparecerá aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alunos.map((aluno: any) => (
            <Link
              key={aluno.id}
              href={`/alunos/${aluno.id}`}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Star size={20} className="text-yellow-600" />
                </div>
                <span className="text-xs text-gray-500">{formatDate(aluno.registroAprovacao?.dataAprovacao)}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{aluno.nome}</h3>
              <p className="text-sm text-yellow-700 font-medium">
                {aluno.registroAprovacao?.concurso || aluno.areaEstudo || 'Aprovado!'}
              </p>
              {aluno.registroAprovacao?.observacao && (
                <p className="text-xs text-gray-500 mt-2">{aluno.registroAprovacao.observacao}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
