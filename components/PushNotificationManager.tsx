'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Função para converter a chave pública
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

export function PushNotificationManager({ userId }: { userId: string }) {
  const supabase = createClient()

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      // Pede permissão se ainda não tiver
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          await subscribeUser(registration)
        }
      } else if (Notification.permission === 'granted') {
        // Se já tem permissão, garante que está inscrito no banco
        await subscribeUser(registration)
      }
    } catch (error) {
      console.error('Erro no Service Worker:', error)
    }
  }

  async function subscribeUser(registration: ServiceWorkerRegistration) {
    try {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        // Já inscrito, salva no banco para garantir
        await saveSubscription(sub)
        return
      }

      // Cria nova inscrição
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      await saveSubscription(newSub)
    } catch (e) {
      console.error('Erro ao inscrever push:', e)
    }
  }

  async function saveSubscription(subscription: PushSubscription) {
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: JSON.parse(JSON.stringify(subscription))
    }, { onConflict: 'subscription' }) // Ignora se já existir igual
  }

  return null // Componente invisível, só roda a lógica
}