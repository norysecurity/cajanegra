'use client'

import { useState } from 'react'
import { Volume2, Loader2, Square, Lock } from 'lucide-react'
import { checkLessonAccess } from '@/app/portal-gestor-x9z/actions' // <--- IMPORTA A ACTION

interface IaraReaderProps {
  text: string
  lessonId: string // <--- OBRIGATÓRIO AGORA
}

export default function IaraReader({ text, lessonId }: IaraReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  async function handlePlay() {
    if (isPlaying) {
      audio?.pause()
      setIsPlaying(false)
      return
    }

    setIsLoading(true)
    
    // 1. VERIFICAÇÃO DE SEGURANÇA ANTES DE TOCAR
    const { allowed } = await checkLessonAccess(lessonId)
    if (!allowed) {
        alert("Acesso negado: Você precisa desbloquear este módulo para ouvir.")
        setIsLoading(false)
        return
    }

    // 2. Se permitido, busca o áudio
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const newAudio = new Audio(url)
      
      setAudio(newAudio)
      newAudio.play()
      setIsPlaying(true)

      newAudio.onended = () => setIsPlaying(false)
    } catch (error) {
      console.error("Erro ao ouvir a Iara:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 px-4 py-2 rounded-full border border-rose-600/20 transition-all font-medium text-sm"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <Square className="w-4 h-4 fill-current" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
      {isLoading ? 'Verificando...' : isPlaying ? 'Parar Leitura' : 'Ouvir com a Iara'}
    </button>
  )
}