import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { cn } from '@/lib/utils'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fc] relative">
      {/* Animated background — muito sutil, só visível no fundo */}
      <AnimatedGridPattern
        numSquares={25}
        maxOpacity={0.04}
        duration={5}
        repeatDelay={1}
        width={48}
        height={48}
        className={cn(
          'fill-indigo-500/20 stroke-indigo-300/20',
          '[mask-image:radial-gradient(900px_circle_at_60%_40%,white,transparent)]'
        )}
      />

      <Sidebar />

      <main className="flex-1 overflow-y-auto relative z-10">
        {children}
      </main>
    </div>
  )
}
