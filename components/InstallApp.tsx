'use client'
import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Escuta o evento do navegador que diz "Ei, esse site pode ser um app!"
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    })
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    // Mostra o prompt nativo do celular
    deferredPrompt.prompt()
    
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl animate-in slide-in-from-bottom">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center font-bold text-white">
            D
          </div>
          <div>
            <p className="text-white font-bold text-sm">Instalar App Douglas</p>
            <p className="text-zinc-400 text-xs">Acesso rápido e tela cheia</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBanner(false)}
            className="p-2 text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
          <button 
            onClick={handleInstallClick}
            className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Download size={14} /> INSTALAR
          </button>
        </div>
      </div>
    </div>
  )
}