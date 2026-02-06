'use client'

import { useState, useEffect } from 'react'
import { Search, MoreVertical, ChevronLeft, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ChatListPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Busca Bots
    const { data: bots } = await supabase.from('bot_profiles').select('*').limit(20)
    
    const formattedBots = (bots || []).map(b => ({
        id: b.id,
        name: b.name,
        avatar_url: b.avatar_url,
        type: 'bot',
        last_message: 'Toque para conversar'
    }))

    // 2. Busca Humanos
    const { data: sentMsgs } = await supabase.from('direct_messages').select('receiver_id').eq('sender_id', user.id)
    const { data: receivedMsgs } = await supabase.from('direct_messages').select('sender_id').eq('receiver_id', user.id)

    const humanIds = new Set<string>()
    sentMsgs?.forEach(m => humanIds.add(m.receiver_id))
    receivedMsgs?.forEach(m => humanIds.add(m.sender_id))

    let formattedHumans: any[] = []

    if (humanIds.size > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(humanIds))
        
        formattedHumans = (profiles || []).map(p => ({
            id: p.id,
            name: p.full_name,
            avatar_url: p.avatar_url,
            type: 'user',
            last_message: 'Toque para conversar'
        }))
    }

    // 3. Junta tudo
    setConversations([...formattedBots, ...formattedHumans])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 pb-20">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#000000]/90 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => router.back()} 
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
                >
                    <ChevronLeft size={20}/>
                </button>
                <h1 className="text-2xl font-bold">Conversas</h1>
            </div>
            <button className="p-2 bg-white/5 rounded-full"><MoreVertical size={20}/></button>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
            <input 
                type="text" 
                placeholder="Pesquisar conversa..." 
                className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-white/20"
            />
        </div>
      </div>

      {/* LISTA DE CONVERSAS */}
      <div className="p-2 space-y-1">
        {loading ? (
            <div className="text-center p-10 text-zinc-500 animate-pulse">Carregando...</div>
        ) : conversations.map((chat) => (
            <div 
                key={chat.id} 
                onClick={() => router.push(`/app/chat/direct/${chat.id}?type=${chat.type}`)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition cursor-pointer active:scale-[0.98]"
            >
                <div className="relative">
                    {/* Avatar unificado: se não tiver foto, usa ícone de User padrão para todos */}
                    {chat.avatar_url ? (
                        <img src={chat.avatar_url} className="w-14 h-14 rounded-full object-cover bg-zinc-800" alt="" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <User size={24}/>
                        </div>
                    )}
                    
                    {/* Status unificado (Verde para todos) */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-black rounded-full bg-emerald-500"></div>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        {/* Nome Limpo, sem badges */}
                        <h3 className="font-bold text-base truncate">{chat.name}</h3>
                        <span className="text-[10px] text-zinc-500">Agora</span>
                    </div>
                    <p className="text-sm text-zinc-400 truncate">{chat.last_message}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}