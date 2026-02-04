'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const supabase = createClient()
  const intervalRef = useRef<any>(null)

  // 1. Registra a troca de página (Page View)
  useEffect(() => {
    const trackView = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'page_view',
          path: pathname
        })
      }
    }
    trackView()
  }, [pathname])

  // 2. Registra o tempo de permanência (Heartbeat a cada 10s)
  useEffect(() => {
    // Limpa intervalo anterior se houver
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      // Só registra se a janela estiver focada (usuário olhando)
      if (document.visibilityState === 'visible') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('analytics_events').insert({
            user_id: user.id,
            event_type: 'heartbeat', // Representa 10 segundos de atenção
            path: pathname
          })
        }
      }
    }, 10000) // 10 segundos

    return () => clearInterval(intervalRef.current)
  }, [pathname])

  return null // Este componente não renderiza nada visualmente
}