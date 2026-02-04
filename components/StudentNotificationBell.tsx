'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Bell, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearNotifications } from '@/app/portal-gestor-x9z/actions'

export function StudentNotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Usamos useRef para manter o cliente Supabase vivo sem disparar re-renderizações infinitas
  const supabase = useRef(createClient())

  const fetchNotifs = async () => {
    const { data } = await supabase.current
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
    if (data) setNotifications(data)
  }

  useEffect(() => {
    // Busca inicial ao carregar a página
    fetchNotifs()

    // CONFIGURAÇÃO DO REALTIME (Escutando respostas do Admin e Notificações Gerais)
    const channel = supabase.current
      .channel(`student-notifs-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications' 
        },
        (payload) => {
          // Verifica se a notificação é para este usuário ou para todos
          if (!payload.new.user_id || payload.new.user_id === userId) {
            setNotifications((prev) => [payload.new, ...prev])
            
            // Toca um alerta sonoro discreto se o navegador permitir
            try {
              const audio = new Audio('/notification.mp3')
              audio.play().catch(() => {}) 
            } catch (e) {}
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        () => fetchNotifs() // Se deletar no banco, limpa no front na hora
      )
      .subscribe()

    return () => {
      supabase.current.removeChannel(channel)
    }
  }, [userId])

  const handleClear = () => {
    startTransition(async () => {
      try {
        await clearNotifications()
        // Limpamos aqui para feedback instantâneo na UI
        setNotifications([])
        setIsOpen(false)
      } catch (e) {
        console.error("Erro ao limpar notificações:", e)
      }
    })
  }

  return (
    <div className="relative notranslate" translate="no">
      {/* BOTÃO DO SINO COM INDICADOR DE NOTIFICAÇÃO */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-zinc-400 hover:text-white transition-all active:scale-90"
      >
        <Bell size={22} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-[#0F0F10] animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.5)]" />
        )}
      </button>

      {/* DROPDOWN DE NOTIFICAÇÕES */}
      {isOpen && (
        <div className="absolute right-0 mt-4 w-85 bg-[#0A0A0B] border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Notificações</span>
            
            <button 
              onClick={handleClear}
              disabled={isPending || notifications.length === 0}
              className="flex items-center gap-2 text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 disabled:opacity-20 transition-all"
            >
              <span className="flex items-center justify-center w-4 h-4">
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </span>
              Limpar Tudo
            </button>
          </div>

          <div className="max-h-[450px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <a 
                  key={`notif-item-${n.id}`} 
                  href={n.link || '#'} 
                  className="block p-5 rounded-[24px] bg-white/[0.03] hover:bg-white/[0.07] transition-all border border-white/5 group relative"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-rose-500 transition-colors">
                      {n.title}
                    </p>
                    <span className="text-[8px] font-mono text-zinc-600 italic">
                       {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 font-medium">
                    {n.message}
                  </p>
                  
                  {/* Linha indicadora lateral no hover */}
                  <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-rose-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                </a>
              ))
            ) : (
              <div className="py-16 text-center">
                <Bell size={32} className="mx-auto text-zinc-800 mb-3 opacity-20" />
                <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                  Nenhuma nova mensagem
                </p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-zinc-900/30 text-center border-t border-white/5">
            <p className="text-[8px] font-black text-zinc-800 uppercase tracking-widest italic">
              Central de Atendimento
            </p>
          </div>
        </div>
      )}
    </div>
  )
}