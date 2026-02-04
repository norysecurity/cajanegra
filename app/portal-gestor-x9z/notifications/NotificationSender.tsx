'use client'

import { useState, useTransition, useEffect } from 'react'
import { sendNotification } from '@/app/portal-gestor-x9z/actions' 
import { Loader2, Send, Tag, ShoppingBag, Info, CheckCircle, Megaphone } from 'lucide-react'

interface Props {
  profiles: any[]
  products: any[]
}

export function NotificationSender({ profiles, products }: Props) {
  const [isPending, startTransition] = useTransition()

  const [target, setTarget] = useState('all')
  const [type, setType] = useState<'info' | 'promo' | 'success'>('info')

  const [selectedProduct, setSelectedProduct] = useState('')
  const [discount, setDiscount] = useState('')
  const [coupon, setCoupon] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    if (type !== 'promo') return
    const prod = products.find(p => p.id === selectedProduct)
    if (prod?.sales_page_url) {
      let finalLink = prod.sales_page_url
      if (coupon.trim()) {
        const sep = finalLink.includes('?') ? '&' : '?'
        finalLink = `${finalLink}${sep}offDiscount=${coupon.trim().toUpperCase()}`
      }
      setLinkUrl(finalLink)
    }
  }, [selectedProduct, coupon, type, products])

  async function handleSubmit(formData: FormData) {
    if (type === 'promo') {
      const originalMsg = formData.get('message') as string
      let promoText = originalMsg
      if (discount) promoText += `\n\n🔥 ${discount}% OFF`
      if (coupon) promoText += `\n🎟️ CUPOM: ${coupon.toUpperCase()}`
      formData.set('message', promoText)
    }

    formData.set('link', linkUrl)

    startTransition(async () => {
      try {
        await sendNotification(formData)
        alert('Disparo realizado com sucesso!')
      } catch {
        alert('Erro ao enviar.')
      }
    })
  }

  return (
    // DEFINI UMA ALTURA FIXA CALCULADA PARA CABER NA TELA SEM ESTOURAR O LAYOUT
    <form action={handleSubmit} className="flex flex-col h-[calc(100vh-200px)]">
      
      {/* --- ÁREA DE SCROLL (CONTEÚDO) --- */}
      {/* Adicionei estilização direta na scrollbar para garantir que fique "bonita" e dark */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-zinc-800
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">

        {/* TYPE SWITCH - Fica no topo da rolagem */}
        <div className="bg-[#0A0A0B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-xl sticky top-0 z-20">
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'info', label: 'Aviso', icon: Info },
              { id: 'promo', label: 'Promoção', icon: Tag },
              { id: 'success', label: 'Sucesso', icon: CheckCircle }
            ].map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setType(mode.id as any)}
                className={`h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all
                  ${type === mode.id
                    ? mode.id === 'promo'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                      : 'bg-zinc-800 text-white shadow-lg'
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}
                `}
              >
                <mode.icon size={14} />
                {mode.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />
        </div>

        {/* PROMO PANEL (ANIMADO) */}
        {type === 'promo' && (
          <div className="bg-red-950/10 border border-red-900/20 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 tracking-widest border-b border-red-500/10 pb-2">
              <ShoppingBag size={14} /> Configuração de Oferta
            </div>

            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-full h-12 bg-[#0A0A0B] border border-white/10 rounded-xl px-4 text-xs text-white focus:border-red-500 outline-none cursor-pointer"
            >
              <option value="">Selecionar produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                value={coupon}
                onChange={e => setCoupon(e.target.value)}
                placeholder="CUPOM"
                className="h-12 bg-[#0A0A0B] border border-white/10 rounded-xl px-4 text-xs uppercase font-mono text-white focus:border-red-500 outline-none placeholder:text-zinc-700"
              />
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="% OFF"
                className="h-12 bg-[#0A0A0B] border border-white/10 rounded-xl px-4 text-xs font-mono text-white focus:border-red-500 outline-none placeholder:text-zinc-700"
              />
            </div>
          </div>
        )}

        {/* TARGET */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Para quem?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTarget('all')}
              className={`px-4 h-12 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 border transition shrink-0
                ${target === 'all'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#0F0F10] border-white/10 text-zinc-500 hover:bg-zinc-900'}
              `}
            >
              <Megaphone size={14} />
              Todos
            </button>

            <select
              name="target_user_id"
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="flex-1 h-12 bg-[#0F0F10] border border-white/10 rounded-xl px-4 text-xs uppercase font-bold text-white outline-none focus:border-white/20 cursor-pointer"
            >
              <option value="all">Selecionar Aluno Específico...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-300">
                    {p.full_name || p.email}
                </option>
              ))}
            </select>
          </div>
          {target === 'all' && <input type="hidden" name="target_user_id" value="all" />}
        </div>

        {/* CAMPOS DE TEXTO */}
        <div className="space-y-4">
            <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Conteúdo</label>
                 <input
                    name="title"
                    placeholder="TÍTULO DA NOTIFICAÇÃO"
                    className="w-full h-12 bg-[#0F0F10] border border-white/10 rounded-xl px-4 font-bold uppercase text-xs text-white placeholder:text-zinc-700 outline-none focus:border-white/20 transition"
                    required
                 />
            </div>

            <textarea
                name="message"
                rows={5}
                placeholder="Escreva a mensagem aqui..."
                className="w-full bg-[#0F0F10] border border-white/10 rounded-xl p-4 text-xs text-zinc-300 resize-none placeholder:text-zinc-700 outline-none focus:border-white/20 transition leading-relaxed"
                required
            />

            <input
                name="link"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-12 bg-[#0F0F10] border border-white/10 rounded-xl px-4 font-mono text-xs text-blue-400 placeholder:text-zinc-700 outline-none focus:border-blue-500/50 transition"
            />
        </div>

      </div>
      {/* --- FIM DA ÁREA DE SCROLL --- */}

      {/* --- RODAPÉ FIXO (BOTÃO) --- */}
      <div className="pt-4 mt-2 border-t border-white/5 bg-transparent z-30">
        <button
            type="submit"
            disabled={isPending}
            className={`w-full h-14 rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition shadow-xl hover:scale-[1.01] active:scale-[0.99]
            ${type === 'promo' 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20' 
                : 'bg-white hover:bg-zinc-200 text-black shadow-white/10'}
            `}
        >
            {isPending ? <Loader2 className="animate-spin" /> : <><Send size={14}/> DISPARAR AGORA</>}
        </button>
      </div>

    </form>
  )
}