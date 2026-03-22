import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/layout/SessionProvider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Mentoria Experts — CRM',
  description: 'Sistema de gestão de alunos para Mentoria Experts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
