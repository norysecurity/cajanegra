'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Share, PlusSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/app') {
        setIsVisible(false)
        return
    }

    const dismissedTime = localStorage.getItem('install_prompt_dismissed')
    if (dismissedTime) {
      const timePassed = Date.now() - parseInt(dismissedTime)
      if (timePassed < 24 * 60 * 60 * 1000) { // Agora espera 24h para mostrar de novo se fechar
        return 
      }
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    if (isIosDevice) {
        setIsVisible(true)
    } else {
        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setIsVisible(true)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [pathname])

  const handleInstall = async () => {
    if (isIOS) {
        setShowIOSInstructions(true)
    } else if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setIsVisible(false)
        }
        setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('install_prompt_dismissed', Date.now().toString())
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && !showIOSInstructions && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-[90px] left-4 right-4 z-[45] md:hidden" 
          >
            {/* bottom-[90px] garante que fique acima do MobileMenu que tem ~80px */}
            <div className="bg-[#121214]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500" />

              <div className="w-10 h-10 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                 <Smartphone className="text-rose-500" size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-xs">Instalar Web App</h4>
                <p className="text-zinc-500 text-[10px] truncate">Melhor experiência mobile.</p>
              </div>

              <button 
                onClick={handleInstall}
                className="bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-transform active:scale-95 flex items-center gap-2"
              >
                <Download size={12} />
                Instalar
              </button>

              <button 
                onClick={handleDismiss}
                className="absolute top-1 right-1 text-zinc-600 p-1"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial iOS (Inalterado) */}
      <AnimatePresence>
        {showIOSInstructions && (
            <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-end justify-center p-4">
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="bg-[#151516] w-full max-w-sm rounded-3xl border border-white/10 p-6 relative pb-10"
                >
                    <button onClick={() => setShowIOSInstructions(false)} className="absolute top-4 right-4 p-2 text-zinc-500"><X size={20} /></button>
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-black text-white uppercase mb-2">Instalar no iPhone</h3>
                        <p className="text-xs text-zinc-400">Siga os passos para adicionar à tela de início.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                            <Share className="text-blue-500" size={24} />
                            <p className="text-xs font-bold text-zinc-200">1. Toque no botão de Compartilhar</p>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                            <PlusSquare className="text-zinc-200" size={24} />
                            <p className="text-xs font-bold text-zinc-200">2. Selecione "Adicionar à Tela de Início"</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </>
  )
}
