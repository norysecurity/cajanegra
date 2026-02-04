'use client'

import { useRef } from 'react'

export default function Carousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative w-full group">
      {/* Container de Rolagem */}
      <div 
        ref={scrollRef}
        className="
          flex 
          overflow-x-auto 
          snap-x snap-mandatory 
          gap-4 
          pb-4 
          px-4 md:px-0
          scrollbar-hide 
          w-full
        "
        style={{ WebkitOverflowScrolling: 'touch' }} // Deixa o scroll suave no iPhone
      >
        {children}
      </div>
      
      {/* Sombra lateral para indicar que tem mais conteúdo (Opcional) */}
      <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#0F0F10] to-transparent pointer-events-none md:hidden" />
    </div>
  )
}