'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Sparkles, ArrowRight, Lock } from 'lucide-react'
import Image from 'next/image'

export default function SmartNotification() {
  const [isVisible, setIsVisible] = useState(false)
  const [offer, setOffer] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const runSmartOffer = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: purchases } = await supabase
        .from('purchases')
        .select('product_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'completed', 'gift', 'manual_approved'])
      
      const purchasedIds = purchases?.map((p: any) => p.product_id) || []

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_locked_by_default', true)
      
      if (!products) return

      const notPurchased = products.filter(p => !purchasedIds.includes(p.id))

      if (notPurchased.length > 0) {
        const randomOffer = notPurchased[Math.floor(Math.random() * notPurchased.length)]
        setOffer(randomOffer)
        setTimeout(() => setIsVisible(true), 1000) 
      }
    }
    runSmartOffer()
  }, [])

  if (!mounted || !offer) return null

  let checkoutUrl = offer.hotmart_id || '#'
  if (checkoutUrl !== '#' && !checkoutUrl.startsWith('http')) {
      checkoutUrl = `https://pay.hotmart.com/${checkoutUrl}?checkoutMode=10`
  }

  // --- Z-INDEX MÁXIMO PERMITIDO PELO NAVEGADOR (2147483647) ---
  const MAX_Z_INDEX = 2147483647;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ 
                zIndex: MAX_Z_INDEX, 
                position: 'fixed',
                isolation: 'isolate' // Garante que ele crie um novo contexto
            }}
        >
          
          {/* BACKDROP (FUNDO PRETO) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVisible(false)}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl"
            style={{ zIndex: -1 }} // Fica atrás do card, mas na frente do site
          />

          {/* O CARD */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            style={{ zIndex: MAX_Z_INDEX }} // Garante prioridade máxima
          >
            {/* Imagem */}
            <div className="relative h-64 w-full group">
                {offer.image_url ? (
                    <Image 
                        src={offer.image_url} 
                        alt={offer.title} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <Lock className="text-zinc-600" size={48} />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/20 to-transparent" />

                <div className="absolute top-4 left-4 bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse z-20">
                    <Sparkles size={12} fill="currentColor" /> Recomendado
                </div>

                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 bg-black/60 hover:bg-rose-600 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/20 z-20"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 relative -mt-10 z-10">
                <h3 className="text-2xl font-black text-white mb-2 leading-none uppercase italic drop-shadow-lg">
                    {offer.title}
                </h3>
                
                <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-medium">
                    Desbloqueie seu potencial agora. Conteúdo exclusivo esperando por você.
                </p>

                <a 
                    href={checkoutUrl}
                    target="_blank"
                    className="group relative w-full flex items-center justify-center gap-3 bg-gradient-to-r from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white py-4 rounded-xl shadow-lg shadow-rose-900/40 transition-all active:scale-95 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                    <ShoppingCart size={20} />
                    <span className="font-black uppercase tracking-wider text-sm">Desbloquear Acesso</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>

                <div className="mt-4 text-center">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold flex items-center justify-center gap-1">
                        <Lock size={10} /> Compra Segura
                    </span>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}