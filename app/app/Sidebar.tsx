'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Adicionei Users (Comunidade) e Bot (I.A.)
import { LayoutGrid, Bookmark, User, ShieldCheck, Users, Bot } from 'lucide-react' 
import SignOutButton from '@/components/SignOutButton'
import { createClient } from '@/lib/supabase/client'

export default function Sidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  // Verifica se o usuário é admin
  useEffect(() => {
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (data?.role === 'admin') {
        setIsAdmin(true)
      }
    }
    checkPermission()
  }, [])

  const isActive = (path: string) => pathname === path

  // Função para abrir o Chat da Iara
  const handleAiClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if ((window as any).toggleIaraChat) {
      (window as any).toggleIaraChat()
    }
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-20 border-r border-white/[0.03] bg-[#0F0F10] z-50 flex-col items-center py-8 gap-10">
      
      {/* Logo */}
      <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.2)]">
        <span className="font-black italic text-lg text-white">D</span>
      </div>

      {/* Navegação */}
      <nav className="flex flex-col gap-8 text-zinc-600">
        
        {/* 1. Dashboard */}
        <Link href="/app" title="Início">
          <LayoutGrid 
            size={22} 
            className={`transition cursor-pointer ${isActive('/app') ? 'text-white' : 'hover:text-white'}`} 
          />
        </Link>

        {/* 2. Comunidade (NOVO) */}
        <Link href="/app/comunidade" title="Comunidade VIP">
          <Users 
            size={22} 
            className={`transition cursor-pointer ${isActive('/app/comunidade') ? 'text-white' : 'hover:text-white'}`} 
          />
        </Link>

        {/* 3. I.A. Mentor (NOVO - Abre Chat) */}
        <button onClick={handleAiClick} title="I.A. Mentor" className="group outline-none">
           <Bot 
             size={22} 
             className="text-rose-600 transition group-hover:text-rose-400 group-hover:scale-110 group-active:scale-95" 
           />
        </button>
        
        {/* 4. Salvos */}
        <Link href="/app/saved" title="Salvos">
          <Bookmark 
            size={22} 
            className={`transition cursor-pointer ${isActive('/app/saved') ? 'text-white' : 'hover:text-white'}`} 
          />
        </Link>

        {/* 5. Perfil */}
        <Link href="/app/profile" title="Meu Perfil">
          <User 
            size={22} 
            className={`transition cursor-pointer ${isActive('/app/profile') ? 'text-white' : 'hover:text-white'}`} 
          />
        </Link>

        {/* --- BOTÃO DE ADMIN (SECRETO) --- */}
        {isAdmin && (
            <Link href="/portal-gestor-x9z" title="Painel do Administrador">
                <div className={`p-2 rounded-xl transition-all cursor-pointer ${isActive('/portal-gestor-x9z') ? 'bg-rose-500/20 text-rose-500' : 'text-rose-700 hover:text-rose-500 hover:bg-rose-500/10'}`}>
                    <ShieldCheck size={22} />
                </div>
            </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="mt-auto">
        <SignOutButton />
      </div>
    </aside>
  )
}