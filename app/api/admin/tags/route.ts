import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — return all tags with student count
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Aggregate concursos
  const concursosRaw = await prisma.aluno.findMany({ select: { concursos: true } })
  const concursosMap: Record<string, number> = {}
  concursosRaw.forEach((a) => a.concursos.forEach((t) => { concursosMap[t] = (concursosMap[t] ?? 0) + 1 }))

  // Aggregate areasEstudo
  const areasRaw = await prisma.aluno.findMany({ select: { areasEstudo: true } })
  const areasMap: Record<string, number> = {}
  areasRaw.forEach((a) => a.areasEstudo.forEach((t) => { areasMap[t] = (areasMap[t] ?? 0) + 1 }))

  const concursos = Object.entries(concursosMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const areasEstudo = Object.entries(areasMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  return NextResponse.json({ concursos, areasEstudo })
}

// PUT — rename a tag across all students
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { campo, oldTag, newTag } = await req.json()
  if (!campo || !oldTag || !newTag?.trim()) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const col = campo === 'concursos' ? 'concursos' : 'areasEstudo'
  // Use PostgreSQL array_replace for bulk rename
  await prisma.$executeRawUnsafe(
    `UPDATE alunos SET "${col}" = array_replace("${col}", $1, $2) WHERE $1 = ANY("${col}")`,
    oldTag,
    newTag.trim()
  )

  return NextResponse.json({ ok: true })
}

// DELETE — remove a tag from all students
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { campo, tag } = await req.json()
  if (!campo || !tag) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const col = campo === 'concursos' ? 'concursos' : 'areasEstudo'
  await prisma.$executeRawUnsafe(
    `UPDATE alunos SET "${col}" = array_remove("${col}", $1) WHERE $1 = ANY("${col}")`,
    tag
  )

  return NextResponse.json({ ok: true })
}
