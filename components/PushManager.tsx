'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BellRing, Loader2 } from 'lucide-react'

// Converte a chave VAPID para o formato que o navegador entende
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushManager({ userId }: { userId: string }) {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // 1. Verifica se o navegador suporta e se o Service Worker está pronto
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      
      // Verifica se já tem inscrição salva no navegador
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Erro no Service Worker:', error)
    }
  }

  async function subscribeToPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready

      // 2. A MÁGICA DO IPHONE: Pede permissão aqui
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        // 3. Gera o Token Único do Celular
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! // Tenha certeza que isso está no .env
          )
        })

        setSubscription(sub)

        // 4. Salva no Supabase para podermos enviar depois
        await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            subscription: JSON.parse(JSON.stringify(sub))
        }, { onConflict: 'subscription' })

        alert('Sucesso! Seu iPhone irá vibrar nas próximas notificações.')
      } else {
        alert('Você precisa clicar em "Permitir" para receber avisos.')
      }
    } catch (error) {
      console.error('Erro ao assinar:', error)
      alert('Erro: Verifique se o app está adicionado à Tela de Início.')
    } finally {
      setLoading(false)
    }
  }

  // Se não suporta ou já está inscrito, não mostra o botão
  if (!isSupported || subscription) return null

  return (
    <div className="fixed bottom-24 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <button
        onClick={subscribeToPush}
        disabled={loading}
        className="bg-rose-600 text-white p-3 rounded-full shadow-2xl shadow-rose-900/50 flex items-center gap-3 pr-5 hover:scale-105 transition-transform"
      >
        <div className="bg-white/20 p-2 rounded-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />}
        </div>
        <div className="text-left">
            <p className="text-[9px] font-bold uppercase opacity-80">Ativar Avisos</p>
            <p className="text-[11px] font-black uppercase">Receber Notificações</p>
        </div>
      </button>
    </div>
  )
}
