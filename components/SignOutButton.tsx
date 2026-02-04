'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [isExiting, setIsExiting] = useState(false)

  const handleSignOut = async () => {
    if (isExiting) return
    setIsExiting(true)

    try {
      // 1. Desloga no Supabase (limpa sessão no browser)
      await supabase.auth.signOut()
      
      // 2. Chama nossa rota de limpeza no servidor (pra garantir)
      await fetch('/auth/signout', { method: 'POST' })

      // 3. Redireciona e limpa cache
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error("Erro ao sair:", error)
      setIsExiting(false)
    }
  }

  return (
    <button 
      onClick={handleSignOut}
      disabled={isExiting}
      className={`
        w-full group flex items-center justify-center gap-3 p-5 rounded-[32px] 
        bg-zinc-900/50 border border-white/5 
        text-zinc-500 hover:text-rose-500 
        hover:bg-rose-500/5 hover:border-rose-500/20 
        transition-all duration-300 active:scale-[0.98]
        ${isExiting ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:bg-rose-500/10 transition-colors">
        <LogOut size={20} className={isExiting ? 'animate-pulse' : ''} />
      </div>
      
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">
          {isExiting ? 'Encerrando...' : 'Sair da Conta'}
        </span>
        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest group-hover:text-rose-500/50 transition-colors">
          Finalizar sessão atual
        </span>
      </div>
    </button>
  )
}
