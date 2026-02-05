'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Bot, Loader2, User, MoreVertical, Phone, Video } from 'lucide-react'
import { sendUserMessageToBot } from '@/app/portal-gestor-x9z/actions'
import { motion, AnimatePresence } from 'framer-motion'

export default function ChatDirectPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const botId = params.id as string
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [botInfo, setBotInfo] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState('')

  // 1. Carrega Info Inicial
  useEffect(() => {
    async function load() {
        const { data: { user } } = await supabase.auth.getUser()
        if(!user) return router.push('/auth/login')
        setUserId(user.id)

        const { data: bot } = await supabase.from('bot_profiles').select('*').eq('id', botId).single()
        setBotInfo(bot)

        const { data: msgs } = await supabase
            .from('bot_messages')
            .select('*')
            .eq('user_id', user.id)
            .eq('bot_id', botId)
            .order('created_at', { ascending: true })
        
        setMessages(msgs || [])
    }
    load()

    const channel = supabase
        .channel(`chat:${botId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_messages', filter: `bot_id=eq.${botId}` }, (payload) => {
            if (payload.new.user_id === userId || payload.new.is_from_bot) {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev
                    return [...prev, payload.new]
                })
            }
        })
        .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [botId, userId])

  useEffect(() => { scrollToBottom() }, [messages])

  const scrollToBottom = () => {
      if(scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
  }

  async function handleSend() {
      if (!input.trim() || sending) return
      
      const content = input.trim()
      setInput('') 
      setSending(true)

      const optimisticMsg = {
          id: `temp-${Date.now()}`,
          content: content,
          is_from_bot: false,
          created_at: new Date().toISOString(),
          user_id: userId
      }
      setMessages(prev => [...prev, optimisticMsg])

      try {
          await sendUserMessageToBot(botId, content)
      } catch (error) {
          console.error("Erro ao enviar:", error)
      } finally {
          setSending(false)
      }
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090B] text-white overflow-hidden notranslate" translate="no">
        
        {/* Header Estilizado */}
        <header className="h-20 border-b border-white/5 flex items-center px-6 gap-4 bg-[#0F0F10]/80 backdrop-blur-xl z-10 shadow-2xl">
            <button 
                onClick={() => router.back()} 
                className="p-2.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl transition-all active:scale-90"
            >
                <ArrowLeft size={22}/>
            </button>
            
            <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 p-0.5 shadow-lg shadow-rose-500/20">
                        {botInfo?.avatar_url ? (
                            <img src={botInfo.avatar_url} className="w-full h-full object-cover rounded-[14px]" alt="avatar" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-[14px]"><Bot size={22}/></div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#0F0F10] rounded-full shadow-sm"></div>
                </div>
                
                <div className="flex flex-col">
                    <h3 className="font-black text-sm uppercase tracking-tight italic">{botInfo?.name || "Carregando..."}</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest italic">Ativo Agora</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 md:gap-3">
                <button className="hidden sm:flex p-2 text-zinc-500 hover:text-rose-500 transition-colors"><Video size={20}/></button>
                <button className="hidden sm:flex p-2 text-zinc-500 hover:text-rose-500 transition-colors"><Phone size={20}/></button>
                <button className="p-2 text-zinc-500 hover:text-white transition-colors"><MoreVertical size={20}/></button>
            </div>
        </header>

        {/* Messages Area */}
        <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-[url('/chat-bg.png')] bg-repeat bg-fixed"
            style={{ backgroundImage: 'radial-gradient(circle at center, #121214 0%, #09090B 100%)' }}
        >
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5 animate-bounce duration-[2000ms]">
                        <Bot size={40} className="text-rose-500 opacity-50"/>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Inicie a interação</p>
                        <p className="text-[10px] text-zinc-700 font-bold uppercase mt-1">Criptografado de ponta a ponta</p>
                    </div>
                </div>
            )}
            
            <AnimatePresence initial={false}>
                {messages.map((msg: any) => {
                    const isMe = !msg.is_from_bot
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={msg.id} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[85%] md:max-w-[70%] rounded-[24px] px-5 py-3.5 text-sm shadow-2xl relative
                                ${isMe 
                                    ? 'bg-rose-600 text-white rounded-tr-none shadow-rose-900/20' 
                                    : 'bg-[#18181B] border border-white/5 text-zinc-200 rounded-tl-none'
                                }
                            `}>
                                <p className="leading-relaxed font-medium">{msg.content}</p>
                                <div className={`flex items-center justify-end gap-1.5 mt-1.5 opacity-40`}>
                                    <span className="text-[8px] font-black uppercase italic">
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    {isMe && <div className="w-2 h-2 rounded-full border border-white/20"></div>}
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>

        {/* Input Premium */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-[#09090B] to-transparent">
            <div className="max-w-4xl mx-auto flex gap-3 items-end">
                <div className="flex-1 bg-[#121214] border border-white/10 p-2 pl-6 rounded-[28px] focus-within:border-rose-500/50 transition-all shadow-2xl flex items-center gap-3">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escreva sua mensagem..."
                        className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-600 py-3 font-medium"
                        disabled={sending}
                    />
                </div>
                
                <button 
                    onClick={handleSend} 
                    disabled={sending || !input.trim()}
                    className="bg-rose-600 hover:bg-rose-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-rose-900/20 disabled:opacity-20 disabled:grayscale transition-all active:scale-90 shrink-0"
                >
                    {sending ? (
                        <Loader2 size={24} className="animate-spin"/>
                    ) : (
                        <Send size={24} className="ml-1" fill="currentColor"/>
                    )}
                </button>
            </div>
            <p className="text-center text-[8px] text-zinc-700 font-black uppercase tracking-widest mt-4 italic">
                Respostas geradas por inteligência artificial avançada
            </p>
        </div>
    </div>
  )
}