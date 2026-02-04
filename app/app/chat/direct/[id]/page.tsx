'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Phone, Video, Plus, Image as ImageIcon, Smile } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EmojiPicker, { Theme } from 'emoji-picker-react'

export default function ChatDirectPage() {
  const { id: targetId } = useParams()
  const searchParams = useSearchParams()
  const chatType = searchParams.get('type') || 'user' // 'bot' ou 'user'

  const router = useRouter()
  const supabase = createClient()
  
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [targetProfile, setTargetProfile] = useState<any>(null)
  const [myId, setMyId] = useState<string | null>(null)
  
  const [showEmoji, setShowEmoji] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChat()
    
    // Configura Realtime dependendo do tipo de chat
    const tableToListen = chatType === 'bot' ? 'bot_messages' : 'direct_messages'
    
    const channel = supabase
      .channel('chat_room_unified')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableToListen }, (payload) => {
        const newMsg = payload.new
        
        let isRelevant = false
        if (chatType === 'bot') {
            // Se for bot, a mensagem deve ser entre MIM e o BOT
            // Atualizado para garantir que mensagens marcadas como is_from_bot (admin) cheguem ao aluno
            if (newMsg.bot_id === targetId && (newMsg.user_id === myId)) {
                isRelevant = true
            }
        } else {
            // Chat normal P2P
            if ((newMsg.sender_id === myId && newMsg.receiver_id === targetId) || (newMsg.sender_id === targetId && newMsg.receiver_id === myId)) {
                isRelevant = true
            }
        }

        if (isRelevant) {
            setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev
                return [...prev, newMsg]
            })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [targetId, chatType, myId])

  async function loadChat() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    if (chatType === 'bot') {
        const { data: bot } = await supabase.from('bot_profiles').select('*').eq('id', targetId).single()
        if (bot) setTargetProfile({ full_name: bot.name, avatar_url: bot.avatar_url })

        const { data: msgs } = await supabase.from('bot_messages')
            .select('*')
            .eq('user_id', user.id).eq('bot_id', targetId)
            .order('created_at', { ascending: true })
        setMessages(msgs || [])
    } else {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).single()
        if (profile) setTargetProfile(profile)

        const { data: msgs } = await supabase.from('direct_messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true })
        
        const filtered = (msgs || []).filter(m => 
            (m.sender_id === user.id && m.receiver_id === targetId) || 
            (m.sender_id === targetId && m.receiver_id === user.id)
        )
        setMessages(filtered)
    }
  }

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !myId) return
    const content = newMessage
    setNewMessage('')
    setShowEmoji(false)

    // Otimista (Mostra na tela antes de ir pro servidor)
    const tempMsg = {
        id: 'temp-' + Date.now(),
        content: content,
        created_at: new Date().toISOString(),
        sender_id: myId, 
        user_id: myId,   
        is_from_bot: false
    }
    setMessages(prev => [...prev, tempMsg])

    if (chatType === 'bot') {
        await supabase.from('bot_messages').insert({
            user_id: myId,
            bot_id: targetId,
            content: content,
            is_from_bot: false
        })
    } else {
        await supabase.from('direct_messages').insert({
            sender_id: myId,
            receiver_id: targetId,
            content: content
        })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090B] md:items-center md:justify-center md:bg-black/90 md:p-8 notranslate" translate="no">
      <div className="flex flex-col w-full h-full md:max-w-4xl md:h-[85vh] md:bg-[#0F0F10] md:border md:border-white/10 md:rounded-3xl md:shadow-2xl md:overflow-hidden relative">
        
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#121214] border-b border-white/5 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <button onClick={() => router.push('/app/comunidade')} className="p-2 -ml-2 text-zinc-400 hover:text-white transition rounded-full hover:bg-white/5"><ArrowLeft size={20} /></button>
                <div className="relative">
                    <img src={targetProfile?.avatar_url || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#121214] rounded-full"></div>
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">{targetProfile?.full_name || "Usuário"}</h3>
                    <span className="text-emerald-500 text-xs font-medium">Online agora</span>
                </div>
            </div>
            <div className="flex gap-2 text-zinc-400">
                <Video size={20} className="cursor-pointer hover:text-white"/>
                <Phone size={20} className="cursor-pointer hover:text-white"/>
            </div>
        </header>

        {/* MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar">
            {messages.map((msg) => {
                // Lógica de Identificação: No chat de bot, o Aluno é o remetente se is_from_bot for falso.
                // Se is_from_bot for verdadeiro, a mensagem veio do Admin (suporte) e deve aparecer na esquerda.
                let isMe = false
                if (chatType === 'bot') isMe = !msg.is_from_bot
                else isMe = msg.sender_id === myId

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-rose-600 text-white rounded-tr-sm' : 'bg-[#1C1C1E] text-zinc-200 rounded-tl-sm'}`}>
                            {msg.content}
                            <div className="text-[9px] mt-1 text-right opacity-70">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                )
            })}
            <div ref={scrollRef} />
        </div>

        {/* INPUT */}
        <div className="bg-[#121214] border-t border-white/5 relative z-40 p-3 flex items-end gap-2">
            <div className="flex-1 bg-[#09090B] rounded-2xl border border-white/10 flex items-center min-h-[50px] px-2 relative">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-zinc-400 hover:text-yellow-500 transition-colors"><Smile size={20} /></button>
                <input 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Mensagem..." 
                    className="flex-1 bg-transparent text-white text-sm outline-none py-3 placeholder:text-zinc-600" 
                />
            </div>
            <button onClick={sendMessage} className="p-3.5 bg-rose-600 text-white rounded-full hover:bg-rose-500 shadow-lg active:scale-95 transition-all"><Send size={18} /></button>
            <AnimatePresence>
                {showEmoji && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 350, opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="absolute bottom-full left-0 w-full overflow-hidden bg-[#121214] border-t border-white/5 shadow-2xl"
                  >
                    <EmojiPicker 
                      onEmojiClick={(e) => setNewMessage(p => p + e.emoji)} 
                      theme={Theme.DARK} 
                      width="100%" 
                      height={350} 
                      lazyLoadEmojis={true}
                    />
                  </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  )
}