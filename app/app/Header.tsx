'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, User } from 'lucide-react'
import Link from 'next/link'
import { StudentNotificationBell } from '@/components/StudentNotificationBell'

export default function Header() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile({
        id: user.id,
        name: data?.full_name || user.email?.split('@')[0],
        avatar: data?.avatar_url,
      })
      setLoading(false)

      // --- REGISTRO DO SERVICE WORKER PARA NOTIFICAÇÕES PUSH ---
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('SW registrado com sucesso:', reg.scope)
        }).catch(err => {
          console.error('Erro ao registrar SW:', err)
        })
      }
    }
    loadProfile()
  }, [])

  return (
    <header className="h-16 md:h-20 border-b border-white/[0.03] px-6 md:px-10 flex justify-between items-center bg-[#0F0F10]/80 backdrop-blur-md sticky top-0 z-[100] notranslate" translate="no">
      
      {/* Lado Esquerdo: Logo e Busca */}
      <div className="flex items-center gap-8 flex-1">
          <Link href="/app" className="shrink-0 transition-transform active:scale-95">
            <img src="/logo.png" className="h-7 w-auto object-contain" alt="Logo" />
          </Link>

          <div className="hidden lg:flex items-center bg-zinc-900/40 border border-white/[0.05] rounded-full px-5 py-2.5 w-full max-w-[350px] gap-3 focus-within:border-rose-500/50 transition-all">
            <Search size={14} className="text-zinc-600" />
            <input 
              type="text" 
              placeholder="Buscar treinamentos..." 
              className="bg-transparent border-none outline-none text-xs w-full placeholder:text-zinc-700 text-zinc-300 font-medium" 
            />
          </div>
      </div>

      {/* Lado Direito: Notificações e Perfil */}
      <div className="flex items-center gap-5 shrink-0"> 
          
          {/* Sino de Notificações - Recebe o ID para monitorar as mensagens do Admin */}
          <div className="relative">
            {!loading && profile?.id && (
                <StudentNotificationBell userId={profile.id} />
            )}
          </div>

          <div className="w-[1px] h-6 bg-white/5 mx-1 hidden sm:block" />

          {/* Perfil do Aluno */}
          <Link href="/app/profile" className="flex items-center gap-3 group">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-rose-500 transition-colors">
                  {profile?.name || 'Aluno'}
                </span>
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                  Ver Perfil
                </span>
              </div>
              
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-rose-500/50 transition-all shadow-2xl">
                {profile?.avatar ? (
                  <img src={profile.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <User size={20} className="text-zinc-600" />
                )}
              </div>
          </Link>
      </div>
    </header>
  )
}