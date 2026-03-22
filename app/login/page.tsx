'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tiles } from '@/components/ui/tiles'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'
import { toast } from '@/hooks/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', {
      email,
      password: senha,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      toast({ title: 'Credenciais inválidas', description: 'Verifique e-mail e senha.', variant: 'destructive' })
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen bg-[#111827]">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-[#0f172a] border-r border-white/8 relative overflow-hidden">
        {/* Tiles background */}
        <div className="absolute inset-0 opacity-30">
          <Tiles rows={30} cols={8} tileSize="lg" tileClassName="border-white/5" />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-transparent to-indigo-900/30 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-[15px]">Mentoria Experts</span>
        </div>

        <div className="relative z-10">
          <blockquote className="text-2xl font-semibold text-white leading-snug mb-4">
            "Gerencie sua mentoria<br />com precisão e clareza."
          </blockquote>
          <div className="flex items-center gap-3 mt-6">
            <div className="flex -space-x-2">
              {['V', 'A', 'R'].map((l, i) => (
                <div key={i} className={`h-8 w-8 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-xs font-bold text-white ${['bg-violet-500', 'bg-indigo-500', 'bg-blue-500'][i]}`}>
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400">Equipe Mentoria Experts</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Tiles background — mais sutil no painel do form */}
        <div className="absolute inset-0 opacity-10">
          <Tiles rows={20} cols={6} tileSize="lg" tileClassName="border-white/10" />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Boas-vindas de volta</h1>
          <p className="text-sm text-gray-400 mb-8">Entre com suas credenciais para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300 text-[13px]">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-gray-300 text-[13px]">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 h-10"
              />
            </div>
            <HoverBorderGradient
              as="button"
              type="submit"
              containerClassName="w-full rounded-lg"
              className="w-full justify-center text-sm font-medium h-9"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </HoverBorderGradient>
          </form>
        </div>
      </div>
    </div>
  )
}
