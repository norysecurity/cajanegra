'use client'

import { X, ShieldCheck, Star, CreditCard } from 'lucide-react'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  productTitle: string
  price: string
}

export default function CheckoutModal({ isOpen, onClose, productTitle, price }: CheckoutModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fundo Escuro com Blur */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* O Card do Modal */}
      <div className="relative bg-[#0a0a0a] border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl shadow-red-900/20 animate-in zoom-in-95 duration-300">
        
        {/* Cabeçalho Premium */}
        <div className="bg-gradient-to-r from-red-900 to-black p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition"
          >
            <X size={20} />
          </button>
          <div className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/10">
            <Star className="text-yellow-500 fill-yellow-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Conteúdo Exclusivo</h2>
          <p className="text-red-200 text-sm">Desbloqueie o acesso total agora</p>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-zinc-400 text-sm">Você está comprando:</p>
            <h3 className="text-lg font-bold text-white">{productTitle}</h3>
          </div>

          {/* Lista de Benefícios */}
          <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <ShieldCheck size={16} className="text-green-500" />
              <span>Acesso imediato a todas as aulas</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <ShieldCheck size={16} className="text-green-500" />
              <span>Download dos PDFs e Scripts</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <ShieldCheck size={16} className="text-green-500" />
              <span>Suporte Prioritário</span>
            </div>
          </div>

          {/* Preço e Botão */}
          <div className="space-y-3">
             <div className="flex justify-between items-end px-2">
                <span className="text-zinc-500 text-sm line-through">R$ 97,00</span>
                <span className="text-2xl font-bold text-white">{price}</span>
             </div>
             
             <button className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-red-900/20">
                <CreditCard size={20} />
                DESBLOQUEAR AGORA
             </button>
             
             <p className="text-center text-[10px] text-zinc-600">
               Pagamento seguro via Hotmart/Kiwify
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}