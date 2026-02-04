'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { toggleProductSave } from '@/app/portal-gestor-x9z/actions'

export default function SaveProductButton({ productId, initialState }: { productId: string, initialState: boolean }) {
  const [isSaved, setIsSaved] = useState(initialState)

  const handleToggle = async (e: any) => {
    e.preventDefault() // Impede de abrir o curso ao clicar na bandeira
    e.stopPropagation()
    
    // Otimismo Visual (Muda a cor na hora)
    const newState = !isSaved
    setIsSaved(newState)
    
    // Chama o servidor
    await toggleProductSave(productId, isSaved)
  }

  return (
    <button 
      onClick={handleToggle}
      className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all group/btn"
      title={isSaved ? "Remover dos Salvos" : "Salvar Curso"}
    >
      <Bookmark 
        size={16} 
        className={`transition-colors ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-white group-hover/btn:text-black'}`} 
      />
    </button>
  )
}