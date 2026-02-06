'use client'

import { useState, useEffect, useMemo } from 'react'
import { Home, Users, PlayCircle, User, Bot } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import LanguageSwitcher from '@/components/LanguageSwitcher' // Certifique-se que o caminho está correto

export default function MobileMenu() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(pathname || '#')

  // 1. VERIFICAÇÃO DE ROTA: Se estiver no chat, esconde o menu
  const isChatPage = pathname?.includes('/app/chat/direct')

  useEffect(() => {
    if (pathname) setActiveTab(pathname)
  }, [pathname])

  const tabs = useMemo(() => [
    { id: 'home', icon: Home, path: '/app' },
    { id: 'community', icon: Users, path: '/app/comunidade' },
    // 2. ITEM ESPECIAL: TRADUTOR (Não é link, é componente)
    { id: 'translate', icon: null, path: '#' }, 
    { id: 'ai', icon: Bot, path: '#', isMain: true }, // BOTÃO DA IARA (Central)
    { id: 'courses', icon: PlayCircle, path: '/app/view/all' }, 
    { id: 'profile', icon: User, path: '/app/profile' },
  ], [])

  const handleAiClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if ((window as any).toggleIaraChat) {
      (window as any).toggleIaraChat()
    }
  }

  // Se for página de chat, não renderiza nada
  if (isChatPage) return null

  // Cálculo da posição da luz (Ajustado para 6 colunas)
  // 100% / 6 itens = ~16.66% por item. O centro do item é +8.33%
  const activeIndex = tabs.findIndex(tab => tab.path === activeTab)
  // Se não achar a aba (ex: sub-rota), joga a luz para o botão I.A. (índice 3)
  const safeIndex = activeIndex === -1 ? 3 : activeIndex 
  const positionPercent = `${(safeIndex * 16.66) + 8.33}%`

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[80]">
      <div className="relative w-full h-[80px] pb-safe">
        
        {/* Luz Rosa Animada */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <motion.div
                className="absolute bottom-0 h-40 w-40 -translate-x-1/2 rounded-full bg-rose-600/60 blur-[60px]"
                animate={{ left: positionPercent }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                style={{ bottom: '-30px' }}
            />
        </div>

        {/* Forma do Menu SVG */}
        <div className="absolute inset-0 z-10 drop-shadow-[0_-5px_15px_rgba(0,0,0,0.8)]">
            <svg viewBox="0 0 375 80" fill="none" className="w-full h-full text-[#0F0F10]" preserveAspectRatio="none">
              <path d="M0 20C0 20 110 20 135 20C148.5 20 155 0 187.5 0C220 0 226.5 20 240 20C265 20 375 20 375 20V80H0V20Z" fill="currentColor"/>
            </svg>
        </div>

        {/* Ícones */}
        <div className="absolute inset-0 z-20 flex justify-between items-end px-4 pb-4">
            {/* 1. HOME */}
            <Link href="/app" className={`flex flex-col items-center justify-end pb-2 w-10 transition-all ${activeTab === '/app' ? 'text-white' : 'text-zinc-600'}`}>
                <Home size={22} strokeWidth={activeTab === '/app' ? 3 : 2} />
            </Link>

            {/* 2. COMUNIDADE */}
            <Link href="/app/comunidade" className={`flex flex-col items-center justify-end pb-2 w-10 transition-all ${activeTab === '/app/comunidade' ? 'text-white' : 'text-zinc-600'}`}>
                <Users size={22} strokeWidth={activeTab === '/app/comunidade' ? 3 : 2} />
            </Link>

            {/* 3. TRADUTOR (NOVO LUGAR) */}
            <div className="flex flex-col items-center justify-end pb-1 w-10">
                <LanguageSwitcher isMobile={true} />
            </div>

            {/* 4. IA (CENTRAL) */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button onClick={handleAiClick} className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-[#0F0F10] bg-rose-600 text-white shadow-xl active:scale-90 transition-transform">
                    <Bot size={28} />
                </button>
            </div>
            
            {/* Espaço vazio para pular o botão central no flex layout */}
            <div className="w-10"></div> 

            {/* 5. CURSOS */}
            <Link href="/app/view/all" className={`flex flex-col items-center justify-end pb-2 w-10 transition-all ${activeTab === '/app/view/all' ? 'text-white' : 'text-zinc-600'}`}>
                <PlayCircle size={22} strokeWidth={activeTab === '/app/view/all' ? 3 : 2} />
            </Link>

            {/* 6. PERFIL */}
            <Link href="/app/profile" className={`flex flex-col items-center justify-end pb-2 w-10 transition-all ${activeTab === '/app/profile' ? 'text-white' : 'text-zinc-600'}`}>
                <User size={22} strokeWidth={activeTab === '/app/profile' ? 3 : 2} />
            </Link>
        </div>
      </div>
    </div>
  )
}