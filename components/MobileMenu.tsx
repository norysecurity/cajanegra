'use client'

import { useState, useEffect, useMemo } from 'react'
import { Home, Users, PlayCircle, User, Bot } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

export default function MobileMenu() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(pathname || '#')

  useEffect(() => {
    if (pathname) setActiveTab(pathname)
  }, [pathname])

  const tabs = useMemo(() => [
    { id: 'home', icon: Home, path: '/app' },
    { id: 'community', icon: Users, path: '/app/comunidade' }, 
    { id: 'ai', icon: Bot, path: '#', isMain: true }, // BOTÃO DA IARA
    { id: 'courses', icon: PlayCircle, path: '/app/view/all' }, 
    { id: 'profile', icon: User, path: '/app/profile' },
  ], [])

  const handleAiClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if ((window as any).toggleIaraChat) {
      (window as any).toggleIaraChat()
    }
  }

  // Lógica para garantir que a animação da luz siga o item ativo
  const activeIndex = tabs.findIndex(tab => tab.path === activeTab)
  
  // Se não encontrar a rota (ex: sub-página), mantém a luz no centro (Botão IA - índice 2)
  // Ou tenta aproximar se for uma sub-rota conhecida
  const safeIndex = activeIndex === -1 ? 2 : activeIndex
  const positionPercent = `${(safeIndex * 20) + 10}%`

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
        <div className="absolute inset-0 z-20 flex justify-between items-end px-6 pb-4">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.path || (tab.path !== '#' && activeTab.startsWith(tab.path))
                const Icon = tab.icon
                
                if (tab.isMain) {
                    return (
                        <div key={tab.id} className="absolute left-1/2 -translate-x-1/2 -top-6">
                            <button onClick={handleAiClick} className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-[#0F0F10] bg-rose-600 text-white shadow-xl active:scale-90 transition-transform">
                                <Icon size={28} />
                            </button>
                        </div>
                    )
                }

                return (
                    <Link key={tab.id} href={tab.path} className={`flex flex-col items-center justify-end pb-2 w-12 h-12 transition-all ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                        <Icon size={22} strokeWidth={isActive ? 3 : 2} />
                    </Link>
                )
            })}
        </div>
      </div>
    </div>
  )
}