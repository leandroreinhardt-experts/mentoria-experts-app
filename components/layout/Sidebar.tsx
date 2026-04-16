'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Users, Upload, CalendarDays, CheckSquare,
  Columns3, List, Trophy, Archive, Settings, UserCog, User,
  LogOut, ChevronDown, ListTodo, LayoutGrid, Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import React, { useState, useEffect } from 'react'
import { NotificationBell } from './NotificationBell'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={15} /> },
  {
    label: 'Alunos',
    icon: <Users size={15} />,
    children: [
      { label: 'Lista de alunos',   href: '/alunos',          icon: <List size={14} /> },
      { label: 'Kanban',            href: '/alunos/kanban',   icon: <LayoutGrid size={14} /> },
      { label: 'Importar planilha', href: '/alunos/importar', icon: <Upload size={14} /> },
    ],
  },
  { label: 'Fila do dia', href: '/fila', icon: <CalendarDays size={15} /> },
  {
    label: 'Tarefas',
    icon: <CheckSquare size={15} />,
    children: [
      { label: 'Board',      href: '/tarefas/board',      icon: <Columns3 size={14} /> },
      { label: 'Lista',      href: '/tarefas/lista',      icon: <ListTodo size={14} /> },
      { label: 'Calendário', href: '/tarefas/calendario', icon: <CalendarDays size={14} /> },
    ],
  },
  { label: 'Aprovados', href: '/aprovados', icon: <Trophy size={15} /> },
  { label: 'Churn',     href: '/churn',     icon: <Archive size={15} /> },
  {
    label: 'Configurações',
    icon: <Settings size={15} />,
    children: [
      { label: 'Membros do time', href: '/configuracoes/membros', icon: <UserCog size={14} /> },
      { label: 'Minha conta',     href: '/configuracoes/conta',   icon: <User size={14} /> },
      { label: 'Gerenciar Tags',  href: '/configuracoes/tags',    icon: <Tag size={14} /> },
    ],
  },
]

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() =>
    item.children ? item.children.some((c) => c.href && pathname.startsWith(c.href)) : false
  )

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
        >
          <span className="text-gray-400">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            size={12}
            className={cn('text-gray-300 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div className="mt-0.5 ml-2.5 space-y-0.5 border-l border-gray-100 pl-3">
            {item.children.map((child) => (
              <NavLink key={child.href || child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = item.href
    ? item.href === '/dashboard'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    : false

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        isActive
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
        depth > 0 && 'text-[12px]'
      )}
    >
      <span className={cn(isActive ? 'text-indigo-600' : 'text-gray-400')}>{item.icon}</span>
      {item.label}
    </Link>
  )
}

const ALL_HREFS = navItems.flatMap((item) =>
  item.href ? [item.href] : (item.children?.map((c) => c.href!).filter(Boolean) ?? [])
)

export function Sidebar() {
  const router = useRouter()
  const { data: session } = useSession()
  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  // Pré-carrega todas as rotas do sidebar na montagem
  useEffect(() => {
    ALL_HREFS.forEach((href) => router.prefetch(href))
  }, [router])

  return (
    <aside className="flex h-screen w-56 flex-col bg-white border-r border-gray-100 shadow-sm">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-gray-100">
        <Image src="/logo.png" alt="Mentoria Experts" width={28} height={28} className="rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-tight">Mentoria Experts</p>
          <p className="text-[10px] text-gray-400">CRM Educacional</p>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href || item.label} item={item} />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-2">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors group cursor-default">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-gray-800 truncate leading-tight">
              {session?.user?.name}
            </p>
            <p className="text-[10px] text-gray-400 truncate">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
