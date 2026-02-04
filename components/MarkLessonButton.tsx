'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function MarkLessonButton() {
  const [isCompleted, setIsCompleted] = useState(false)

  return (
    <button 
      onClick={() => setIsCompleted(!isCompleted)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 active:scale-95 ${
        isCompleted 
          ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' 
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
      }`}
    >
      <CheckCircle2 size={18} className={isCompleted ? 'text-white' : 'text-zinc-500'} />
      <span>{isCompleted ? 'Concluída' : 'Marcar como Visto'}</span>
    </button>
  )
}