import { BookOpen, Bot, Lock, Play, FileText, MessageCircle } from 'lucide-react'

// TIPO DE PRODUTO ATUALIZADO
export type Product = {
  id: string
  title: string
  description: string
  type: 'video' | 'ebook' | 'bot'
  image: string
  price?: string
  checkoutUrl?: string
  isLocked: boolean
  videoUrl?: string // <--- NOVO CAMPO: O link do vídeo
}

// LISTA DE PRODUTOS
export const products: Product[] = [
  {
    id: '1',
    title: 'Jogo do Texto (Vídeo Teste)',
    description: 'O atalho mais rápido da Atração Feminina.',
    type: 'video', // <--- MUDEI PARA VÍDEO PARA VOCÊ VER O PLAYER
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1000&auto=format&fit=crop',
    isLocked: false,
    // Vídeo Cyberpunk (Ambiente Dark)
    videoUrl: 'https://www.youtube.com/embed/YaCGkdC0q-k?autoplay=1&controls=1&rel=0' 
  },
  {
    id: '2',
    title: 'Bot da Conquista',
    description: 'IA treinada em sedução e psicologia.',
    type: 'bot',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop',
    price: 'R$ 19,90',
    checkoutUrl: 'https://pay.kiwify.com.br/SEU_LINK_AQUI',
    isLocked: true, // Upsell Bloqueado
  },
  {
    id: '3',
    title: 'Scripts Secretos',
    description: '1000 Scripts Psicológicos para copiar e colar.',
    type: 'ebook',
    image: 'https://images.unsplash.com/photo-1555421689-d68471e189f2?q=80&w=1000&auto=format&fit=crop',
    isLocked: false,
  },
  {
    id: '4',
    title: 'Aula Secreta: O Melhor Oral',
    description: 'Técnicas avançadas para levar ela à loucura.',
    type: 'video',
    image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1000&auto=format&fit=crop',
    price: 'R$ 29,90',
    checkoutUrl: 'https://pay.hotmart.com/SEU_LINK_AQUI',
    isLocked: false, // <--- LIBEREI TEMPORARIAMENTE PARA VOCÊ TESTAR
    // Vídeo Natureza 4K (Exemplo)
    videoUrl: 'https://www.youtube.com/embed/LXb3EKWsInQ?autoplay=1&controls=1&rel=0'
  },
  {
    id: '5',
    title: 'O Homem que Elas Desejam',
    description: 'Como transformar seu perfil e postura.',
    type: 'video',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    isLocked: true,
    price: 'R$ 14,90',
  }
]