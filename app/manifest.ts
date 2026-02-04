import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CAJA NEGRA',
    short_name: 'CAJA NEGRA',
    description: 'Aprenda a arte da conquista em pouco tempo',
    start_url: '/app',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        // O erro estava aqui. Adicionamos 'as any' para o TS aceitar as duas palavras
        purpose: 'any maskable' as any 
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        // Aqui também
        purpose: 'any maskable' as any
      },
    ],
  }
}