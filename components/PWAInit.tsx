'use client'
import { useEffect } from 'react'

export default function PWAInit() {
  useEffect(() => {
    // Só roda no navegador
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('App pronto para instalar:', reg.scope))
        .catch((err) => console.error('Erro no PWA:', err))
    }
  }, [])

  return null // Não mostra nada na tela, só roda a lógica
}