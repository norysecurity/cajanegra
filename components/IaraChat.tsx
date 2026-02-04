'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  X, ArrowUp, Lock, Sparkles, 
  ChevronRight, CheckCircle2, Paperclip, Bot 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { checkAIAccess, getAISettings } from '@/app/portal-gestor-x9z/actions'
import { useChat } from 'ai/react'
import ReactMarkdown from 'react-markdown' 

const IARA_AVATAR_PNG = "https://cdn-icons-png.flaticon.com/512/3260/3260849.png" 

// --- TIPAGENS ---
interface AISettings {
  salesLink: string
  modalTitle: string
  modalDescription: string
  buttonText: string
  feature1: string
  feature2: string
  feature3: string
  modalImageUrl: string
}

interface AccessPermission { 
  allowed: boolean
  reason?: string 
}

interface IaraChatProps {
  isUnlocked?: boolean
  aiSettings?: Partial<AISettings>
}

const defaultSettings: AISettings = {
  salesLink: '#',
  modalTitle: 'I.A. Premium',
  modalDescription: 'Desbloqueie o potencial máximo da sua assistente.',
  buttonText: 'LIBERAR ACESSO',
  feature1: 'Respostas Ilimitadas', 
  feature2: 'Contexto Avançado', 
  feature3: 'Suporte Prioritário', 
  modalImageUrl: ''
}

export default function IaraChat({ isUnlocked: initialUnlocked = false, aiSettings: initialSettings }: IaraChatProps) {
  // Hook do Vercel AI SDK para chat inteligente
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: []
  })

  const [isOpen, setIsOpen] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked)
  const [settings, setSettings] = useState<AISettings>({ ...defaultSettings, ...initialSettings })
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Carregar configurações e permissões ao iniciar
  useEffect(() => {
    async function refreshData() {
      try {
        const [access, freshSettings] = await Promise.all([ checkAIAccess(), getAISettings() ])
        const accessData = access as AccessPermission
        
        setIsUnlocked(accessData.allowed)
        
        if (freshSettings) {
            setSettings((prev) => ({ ...prev, ...freshSettings }))
        }
      } catch (error) { console.error("Erro chat:", error) }
    }
    refreshData()
  }, [])

  // Expor função para o Menu Mobile
  useEffect(() => {
    (window as any).toggleIaraChat = () => {
      isUnlocked ? setIsOpen(prev => !prev) : setShowUnlockModal(true)
    }
  }, [isUnlocked])

  // Scroll automático para o fim
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) 
  }, [messages, isOpen, isLoading])

  // Handler de Envio
  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isUnlocked) { setShowUnlockModal(true); return }
    handleSubmit(e)
  }

  // Handler de Compra
  const handleBuyClick = () => {
    const link = settings.salesLink?.trim();
    if (link && link !== '#') window.open(link.startsWith('http') ? link : `https://${link}`, '_blank');
  }

  return (
    <>
      <AnimatePresence>
        {/* === MODAL DE VENDA (BLOQUEIO) === */}
        {showUnlockModal && !isUnlocked && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0F0F10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <button onClick={() => setShowUnlockModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-20 p-2"><X size={18}/></button>
              
              <div className="md:w-1/3 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center border-r border-white/5 min-h-[160px]">
                <img src={settings.modalImageUrl || IARA_AVATAR_PNG} className="w-24 h-24 object-contain opacity-90 drop-shadow-lg" />
              </div>
              
              <div className="flex-1 p-8 flex flex-col justify-center">
                <h2 className="text-2xl font-black text-white mb-2 leading-none uppercase italic">{settings.modalTitle}</h2>
                <p className="text-sm text-zinc-400 mb-6 font-medium leading-relaxed">{settings.modalDescription}</p>
                
                <div className="space-y-2 mb-8">
                  {[settings.feature1, settings.feature2, settings.feature3].filter(Boolean).map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300 font-bold uppercase"><CheckCircle2 size={12} className="text-emerald-500"/> {feat}</div>
                  ))}
                </div>
                
                <button onClick={handleBuyClick} className="w-full bg-white hover:bg-zinc-200 transition text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-lg active:scale-95">
                  {settings.buttonText} <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === CHAT FLUTUANTE (JANELA) === */}
      <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
        <AnimatePresence>
          {isOpen && isUnlocked && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} 
              className="w-[90vw] md:w-[400px] h-[60vh] md:h-[600px] max-h-[75vh] bg-[#09090B]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 mb-2 pointer-events-auto"
            >
              {/* HEADER DO CHAT */}
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={IARA_AVATAR_PNG} className="w-9 h-9 rounded-full border border-white/10 p-0.5 bg-black" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#09090B]"></div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white tracking-tight block">Iara AI</span>
                    <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1"><Sparkles size={8} className="text-purple-500"/> Online</span>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition p-2 rounded-full hover:bg-white/5"><X size={20} /></button>
              </div>

              {/* CORPO DE MENSAGENS */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-black/20">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4 opacity-60">
                    <img src={IARA_AVATAR_PNG} className="w-16 h-16 grayscale filter opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-widest">Como posso ajudar hoje?</p>
                  </div>
                )}
                
                {messages.map((m: any, i: number) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-white text-black rounded-3xl rounded-tr-sm font-medium' 
                        : 'bg-[#1C1C1E] text-zinc-100 border border-white/5 rounded-3xl rounded-tl-sm'
                    }`}>
                      <ReactMarkdown 
                        components={{
                          a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline cursor-pointer" />,
                          strong: ({node, ...props}) => <strong {...props} className={m.role === 'user' ? "font-black" : "text-white font-bold"} />,
                          ul: ({node, ...props}) => <ul {...props} className="list-disc pl-4 space-y-1 my-2" />,
                          p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA */}
              <div className="p-4 bg-[#09090B] border-t border-white/5">
                <form onSubmit={handleSend} className="relative flex items-center gap-2 group">
                  <button type="button" className="p-3 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition" title="Enviar Imagem">
                    <Paperclip size={20} />
                  </button>

                  <div className="flex-1 relative">
                    <input 
                      className="w-full bg-[#18181B] hover:bg-[#202022] focus:bg-black text-zinc-200 text-sm rounded-full pl-5 pr-12 py-3.5 border border-white/5 outline-none focus:border-white/20 transition-all placeholder:text-zinc-600 font-medium shadow-inner" 
                      value={input} 
                      onChange={handleInputChange} 
                      placeholder="Digite sua mensagem..." 
                      disabled={!isUnlocked}
                    />
                    <button 
                      type="submit" 
                      disabled={isLoading || !input.trim() || !isUnlocked} 
                      className="absolute right-2 top-2 p-1.5 bg-white text-black rounded-full disabled:opacity-0 disabled:scale-75 transition-all hover:bg-zinc-200 active:scale-95 shadow-lg flex items-center justify-center h-8 w-8"
                    >
                      <ArrowUp size={18} strokeWidth={3} />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- BOTÃO FLUTUANTE (TRIGGER) --- */}
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={() => isUnlocked ? setIsOpen(!isOpen) : setShowUnlockModal(true)} 
          className="relative group outline-none pointer-events-auto hidden md:flex" 
        >
           <div className="relative">
             {isUnlocked && !isOpen && <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full z-20 border-2 border-[#09090B] animate-pulse"></span>}
             <div className={`relative w-[64px] h-[64px] rounded-full overflow-hidden border-2 z-10 transition-all bg-[#09090B] flex items-center justify-center ${isUnlocked ? (isOpen ? 'border-white/20' : 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]') : 'border-white/10 grayscale opacity-70'}`}>
               <img src={IARA_AVATAR_PNG} className={`w-full h-full object-cover p-1 transition-all ${isOpen ? 'scale-90 opacity-50 blur-[1px]' : 'scale-100'}`} />
               {!isUnlocked && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Lock size={20} className="text-zinc-400" /></div>}
               {isOpen && <div className="absolute inset-0 flex items-center justify-center"><X size={24} className="text-white" /></div>}
             </div>
           </div>
        </motion.button>
      </div>
    </>
  )
}