import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  // Usa componentes UTC para evitar que a conversão de fuso (UTC→BRT)
  // mude o dia exibido — funciona tanto para T00:00Z quanto T12:00Z
  const day   = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year  = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function daysDiff(date: Date | string | null | undefined): number {
  if (!date) return 0
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function daysUntil(date: Date | string | null | undefined): number {
  if (!date) return Infinity
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Avança a data para o próximo dia útil (seg–sex), se cair em fim de semana */
export function garantirDiaUtil(date: Date): Date {
  const d = new Date(date)
  const dia = d.getUTCDay() // usa UTC para consistência com datas T12:00Z
  if (dia === 6) d.setUTCDate(d.getUTCDate() + 2) // sáb → seg
  else if (dia === 0) d.setUTCDate(d.getUTCDate() + 1) // dom → seg
  return d
}

/** Soma N dias corridos e garante que o resultado caia em dia útil */
export function addDaysUtil(date: Date, days: number): Date {
  return garantirDiaUtil(addDays(date, days))
}

export function nowBrasilia(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}
