'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Bot, Loader2, User, MoreVertical, Phone, Video } from 'lucide-react'
import { sendUserMessageToBot, sendDirectMessage } from '@/app/portal-gestor-x9z/actions'
import { motion, AnimatePresence } from 'framer-motion'

export default function ChatDirectPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const targetId = params.id as string
  const chatType = searchParams.get('type') || 'bot' // 'bot' ou 'user'

  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [targetInfo, setTargetInfo] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState('')

  // 1. Carrega Info Inicial
  useEffect(() => {
    async function load() {
        const { data: { user } } = await supabase.auth.getUser()
        if(!user) return router.push('/auth/login')
        setCurrentUserId(user.id)

        // Carrega Perfil do Destinatário
        if (chatType === 'bot') {
            const { data: bot } = await supabase.from('bot_profiles').select('*').eq('id', targetId).single()
            setTargetInfo(bot)
        } else {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).single()
            setTargetInfo({ ...profile, name: profile.full_name }) // Normaliza nome
        }

        await fetchMessages(user.id)
    }
    load()

    // 2. Realtime (Escuta mensagens novas)
    const channel = supabase.channel(`chat_room:${targetId}`)

    const handleNewMessage = (payload: any) => {
       const msg = payload.new
       let shouldAdd = false
       
       if (chatType === 'bot') {
           shouldAdd = (msg.user_id === currentUserId || msg.is_from_bot)
       } else {
           const isRelated = (msg.sender_id === currentUserId && msg.receiver_id === targetId) || 
                             (msg.sender_id === targetId && msg.receiver_id === currentUserId)
           shouldAdd = isRelated
       }

       if (shouldAdd) {
           const normalizedMsg = {
               id: msg.id,
               content: msg.content,
               created_at: msg.created_at,
               is_me: chatType === 'bot' ? !msg.is_from_bot : msg.sender_id === currentUserId,
               is_from_bot: chatType === 'bot' ? msg.is_from_bot : false
           }
           addMessageToState(normalizedMsg)
       }
    }

    if (chatType === 'bot') {
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_messages', filter: `bot_id=eq.${targetId}` }, handleNewMessage).subscribe()
    } else {
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, handleNewMessage).subscribe()
    }

    return () => { supabase.removeChannel(channel) }
  }, [targetId, chatType, currentUserId])

  // Função auxiliar para buscar mensagens
  const fetchMessages = async (myId: string) => {
      if (chatType === 'bot') {
          const { data } = await supabase.from('bot_messages')
            .select('*').eq('user_id', myId).eq('bot_id', targetId).order('created_at', { ascending: true })
          setMessages(data || [])
      } else {
          const { data } = await supabase.from('direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${myId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${myId})`)
            .order('created_at', { ascending: true })
          
          const formatted = (data || []).map(m => ({
              id: m.id, content: m.content, created_at: m.created_at,
              is_me: m.sender_id === myId, is_from_bot: false
          }))
          setMessages(formatted)
      }
  }

  const addMessageToState = (newMsg: any) => {
      setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev
          if (chatType === 'bot') {
              newMsg.is_me = !newMsg.is_from_bot
          }
          if (newMsg.is_me) {
              const tempIndex = [...prev].reverse().findIndex(m => String(m.id).startsWith('temp-') && m.content === newMsg.content)
              if (tempIndex !== -1) {
                  const realIndex = prev.length - 1 - tempIndex
                  const newHistory = [...prev]
                  newHistory[realIndex] = { ...newMsg, is_me: true }
                  return newHistory
              }
          }
          return [...prev, newMsg]
      })
  }

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
          is_me: true, is_from_bot: false,
          created_at: new Date().toISOString(),
          user_id: currentUserId
      }
      setMessages(prev => [...prev, optimisticMsg])

      try {
          if (chatType === 'bot') await sendUserMessageToBot(targetId, content)
          else await sendDirectMessage(targetId, content)
      } catch (error) {
          console.error("Erro envio:", error)
      } finally {
          setSending(false)
      }
  }

  const avatarUrl = targetInfo?.avatar_url
  const displayName = targetInfo?.name || targetInfo?.full_name

  return (
    // 🔴 ALTERAÇÃO CRÍTICA AQUI:
    // Mobile: fixed inset-0 z-[9999] (Cobre tudo, tela cheia)
    // Desktop (md): relative z-0 (Volta ao fluxo normal da página para respeitar a Sidebar)
    <div className="fixed inset-0 z-[9999] md:relative md:z-0 md:inset-auto w-full h-[100dvh] flex flex-col bg-[#09090B] text-white overflow-hidden notranslate" translate="no">
        
        {/* Header */}
        <header className="h-16 md:h-20 shrink-0 border-b border-white/5 flex items-center px-4 md:px-6 gap-3 bg-[#0F0F10] z-20 shadow-lg">
            <button 
                onClick={() => router.back()} 
                className="p-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl transition-all active:scale-90"
            >
                <ArrowLeft size={22}/>
            </button>
            
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className="relative shrink-0">
                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl p-0.5 shadow-lg ${chatType === 'bot' ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        {avatarUrl ? (
                            <img src={avatarUrl} className="w-full h-full object-cover rounded-[14px]" alt="avatar" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-[14px]">
                                {chatType === 'bot' ? <Bot size={20}/> : <User size={20}/>}
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-4 border-[#0F0F10] rounded-full shadow-sm"></div>
                </div>
                
                <div className="flex flex-col overflow-hidden">
                    <h3 className="font-black text-sm uppercase tracking-tight italic truncate">{displayName || "Carregando..."}</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest italic truncate">
                            {chatType === 'bot' ? '' : ''}
                        </p>
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
            className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-zinc-950"
            style={{ 
                backgroundImage: 'radial-gradient(circle at center, #121214 0%, #09090B 100%)',
                backgroundAttachment: 'fixed' 
            }}
        >
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-60">
                    <div className="w-16 h-16 bg-zinc-900/50 rounded-3xl flex items-center justify-center border border-white/5">
                        {chatType === 'bot' ? <Bot size={32} className="text-rose-500 opacity-50"/> : <User size={32} className="text-blue-500 opacity-50"/>}
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Comece a conversa</p>
                        <p className="text-[10px] text-zinc-700 font-bold uppercase mt-1">Criptografado de ponta a ponta</p>
                    </div>
                </div>
            )}
            
            <AnimatePresence initial={false}>
                {messages.map((msg: any) => {
                    const isMe = msg.is_me !== undefined ? msg.is_me : !msg.is_from_bot
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={msg.id} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}
                        >
                            <div className={`
                                max-w-[85%] md:max-w-[65%] rounded-2xl px-4 py-3 text-sm shadow-sm relative break-words
                                ${isMe 
                                    ? 'bg-rose-600 text-white rounded-tr-none' 
                                    : 'bg-[#1F1F22] border border-white/5 text-zinc-200 rounded-tl-none'
                                }
                            `}>
                                <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 opacity-50`}>
                                    <span className="text-[9px] font-bold uppercase tracking-wide">
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="shrink-0 w-full p-3 md:p-6 bg-[#09090B] border-t border-white/10 z-30 pb-safe">
            <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-end">
                <div className="flex-1 bg-[#121214] border border-white/10 p-1 pl-4 rounded-[24px] focus-within:border-rose-500/50 transition-all shadow-xl flex items-center gap-2">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Enviar mensagem...`}
                        className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-600 py-3 font-medium min-w-0"
                        disabled={sending}
                        autoComplete="off"
                    />
                </div>
                
                <button 
                    onClick={handleSend} 
                    disabled={sending || !input.trim()}
                    className="bg-rose-600 hover:bg-rose-500 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg shadow-rose-900/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shrink-0"
                >
                    {sending ? (
                        <Loader2 size={20} className="animate-spin"/>
                    ) : (
                        <Send size={20} className="ml-0.5" fill="currentColor"/>
                    )}
                </button>
            </div>
            <p className="text-center text-[8px] text-zinc-700 font-black uppercase tracking-widest mt-3 italic md:block hidden">
                CajaNegra Chat 
            </p>
        </div>
    </div>
  )
}