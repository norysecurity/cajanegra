'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type BannerProps = {
  banners?: any[] 
}

export default function HeroBanner({ banners }: BannerProps) {
  const [current, setCurrent] = useState(0)
  
  // Filtra apenas banners que possuem imagem para não quebrar o layout
  const validBanners = banners && banners.length > 0 
    ? banners.filter(b => b.image) 
    : []

  // Autoplay a cada 6 segundos
  useEffect(() => {
    if (validBanners.length <= 1) return
    const timer = setInterval(() => nextSlide(), 6000)
    return () => clearInterval(timer)
  }, [current, validBanners.length])

  const nextSlide = () => setCurrent((prev) => (prev + 1) % validBanners.length)
  const prevSlide = () => setCurrent((prev) => (prev - 1 + validBanners.length) % validBanners.length)

  if (!validBanners.length) return null

  return (
    <div className="w-full">
      {/* CONTAINER DA IMAGEM (Com arredondamento e corte) */}
      <div className="relative w-full aspect-[16/7] md:aspect-[21/8] rounded-[24px] overflow-hidden bg-black group shadow-2xl border border-white/5">
        
        {/* LINK ENVOLVENDO TODO O CONTEÚDO */}
        <Link href={validBanners[current].link || '#'} className="absolute inset-0 z-0 block">
          <AnimatePresence mode='wait'>
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <img
                src={validBanners[current].image}
                alt="Banner"
                className="w-full h-full object-cover"
              />
              {/* Overlay sutil apenas para dar profundidade */}
              <div className="absolute inset-0 bg-black/10" />
            </motion.div>
          </AnimatePresence>
        </Link>

        {/* CONTROLES LATERAIS (SETAS) - Continuam dentro, nas laterais */}
        {validBanners.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.preventDefault(); prevSlide(); }} 
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={24} />
            </button>

            <button 
              onClick={(e) => { e.preventDefault(); nextSlide(); }} 
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* INDICADORES (PONTINHOS) - Agora FORA da caixa da imagem, posicionados abaixo */}
      {validBanners.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {validBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); setCurrent(idx); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === current ? 'w-8 bg-rose-600' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}