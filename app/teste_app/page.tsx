'use client'

import { useState } from 'react'
import { CheckCircle2, Lock, ShieldCheck, CreditCard, Gift, Loader2, ArrowRight, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { triggerHotmartSimulation } from './actions'

// CONFIGURAÇÃO DOS PRODUTOS (IDs do seu Banco de Dados)
const PRODUCTS = {
    MAIN: { id: '7065101', name: 'Curso Mestre do App', price: 97.00 },
    UPSELL_SOCIAL: { id: '7131963', name: 'Comunidade VIP + Stories', price: 27.00 },
    UPSELL_IA: { id: '7154599', name: 'Acesso Chat Inteligência Artificial', price: 47.00 }
}

export default function HotmartCheckoutSimulator() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // DADOS DO COMPRADOR
  const [name, setName] = useState('Aluno Teste')
  const [email, setEmail] = useState('')
  
  // SELEÇÃO DE PRODUTOS (Principal sempre true)
  const [addSocial, setAddSocial] = useState(false)
  const [addIA, setAddIA] = useState(false)

  // CÁLCULO TOTAL
  const total = PRODUCTS.MAIN.price + (addSocial ? PRODUCTS.UPSELL_SOCIAL.price : 0) + (addIA ? PRODUCTS.UPSELL_IA.price : 0)

  async function handleCheckout() {
    if (!email || !email.includes('@')) return alert("Por favor, insira um e-mail válido para liberar o acesso.")
    
    setLoading(true)

    // Lista de produtos a serem processados
    const queue = [PRODUCTS.MAIN.id] // Curso principal sempre vai
    if (addSocial) queue.push(PRODUCTS.UPSELL_SOCIAL.id)
    if (addIA) queue.push(PRODUCTS.UPSELL_IA.id)

    try {
        // Dispara uma requisição para cada produto selecionado (Simulando a Hotmart enviando eventos)
        // Usamos Promise.all para ser rápido, mas em ordem seria mais seguro se dependesse de criação.
        // Como o Webhook trata "se usuário não existe, cria", podemos mandar em paralelo ou sequencial.
        
        for (const prodId of queue) {
            await triggerHotmartSimulation({
                email,
                name,
                productId: prodId
            })
        }

        setSuccess(true)
        
        // Redireciona para login após 3s
        setTimeout(() => {
            router.push(`/auth/login?email=${encodeURIComponent(email)}`)
        }, 3000)

    } catch (e) {
        alert("Erro na simulação")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#333] font-sans pb-20 notranslate" translate="no">
      
      {/* HEADER SIMPLES */}
      <header className="bg-white border-b border-gray-200 py-4 mb-8">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-orange-500 text-white font-black p-1 px-2 rounded text-xs tracking-tighter">H</div>
                <span className="font-bold text-gray-600 text-sm">Pay Simulator</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Lock size={12} className="text-green-600"/> Pagamento 100% Seguro
            </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: DADOS E PAGAMENTO */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* SEÇÃO 1: DADOS PESSOAIS */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-gray-50"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">E-mail (Seu Acesso)</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-white font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: PAGAMENTO (FAKE) */}
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-100 opacity-80 select-none cursor-not-allowed">
                <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <span className="bg-gray-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Pagamento (Simulado)
                </h3>
                <div className="flex gap-4 mb-4">
                    <button className="flex items-center gap-2 border-2 border-blue-600 text-blue-600 px-4 py-2 rounded font-bold text-sm bg-blue-50"><CreditCard size={16}/> Cartão de Crédito</button>
                    <button className="flex items-center gap-2 border border-gray-200 text-gray-500 px-4 py-2 rounded font-bold text-sm bg-white">Pix</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input disabled placeholder="0000 0000 0000 0000" className="border p-2 rounded text-sm bg-gray-50 col-span-2"/>
                    <input disabled placeholder="Nome no Cartão" className="border p-2 rounded text-sm bg-gray-50"/>
                    <div className="grid grid-cols-2 gap-2">
                        <input disabled placeholder="MM/AA" className="border p-2 rounded text-sm bg-gray-50"/>
                        <input disabled placeholder="CVV" className="border p-2 rounded text-sm bg-gray-50"/>
                    </div>
                </div>
            </div>

        </div>

        {/* COLUNA DIREITA: RESUMO E UPSELLS */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* RESUMO DO PEDIDO */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 sticky top-4">
                <div className="border-b pb-4 mb-4">
                    <img src="https://placehold.co/600x400/18181b/FFF?text=CURSO+BASE" className="w-full h-32 object-cover rounded-md mb-3" />
                    <h3 className="font-bold text-gray-800">{PRODUCTS.MAIN.name}</h3>
                    <p className="text-green-600 font-bold text-xl mt-1">R$ {PRODUCTS.MAIN.price.toFixed(2).replace('.',',')}</p>
                </div>

                {/* UPSELL 1 - REDE SOCIAL */}
                <div 
                    onClick={() => setAddSocial(!addSocial)}
                    className={`border-2 rounded-lg p-3 mb-3 cursor-pointer transition-all relative ${addSocial ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300 hover:border-gray-400'}`}
                >
                    {addSocial && <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5"><CheckCircle2 size={16}/></div>}
                    <div className="flex items-start gap-2">
                        <input type="checkbox" checked={addSocial} readOnly className="mt-1 accent-green-600"/>
                        <div>
                            <p className="font-bold text-sm text-gray-800">Adicionar {PRODUCTS.UPSELL_SOCIAL.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Desbloqueie Stories e Feed da comunidade.</p>
                            <p className="text-green-600 font-bold text-sm mt-1">+ R$ {PRODUCTS.UPSELL_SOCIAL.price.toFixed(2).replace('.',',')}</p>
                        </div>
                    </div>
                </div>

                {/* UPSELL 2 - I.A. */}
                <div 
                    onClick={() => setAddIA(!addIA)}
                    className={`border-2 rounded-lg p-3 mb-6 cursor-pointer transition-all relative ${addIA ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300 hover:border-gray-400'}`}
                >
                    {addIA && <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5"><CheckCircle2 size={16}/></div>}
                    <div className="flex items-start gap-2">
                        <input type="checkbox" checked={addIA} readOnly className="mt-1 accent-green-600"/>
                        <div>
                            <p className="font-bold text-sm text-gray-800">Adicionar {PRODUCTS.UPSELL_IA.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Chatbot inteligente ilimitado.</p>
                            <p className="text-green-600 font-bold text-sm mt-1">+ R$ {PRODUCTS.UPSELL_IA.price.toFixed(2).replace('.',',')}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4 text-gray-800">
                    <span className="font-medium">Total:</span>
                    <span className="font-black text-2xl">R$ {total.toFixed(2).replace('.',',')}</span>
                </div>

                <button 
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg text-lg uppercase tracking-wide shadow-md transition-all active:scale-95 disabled:opacity-50 flex justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin"/> : 'Comprar Agora'}
                </button>

                <div className="mt-4 flex justify-center gap-2">
                    <img src="https://logodownload.org/wp-content/uploads/2019/09/compra-segura-selo.png" className="h-8 opacity-60 grayscale"/>
                </div>
            </div>
        </div>

      </div>

      {/* MODAL DE SUCESSO */}
      <AnimatePresence>
        {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Pagamento Aprovado!</h2>
                    <p className="text-gray-500 text-sm mb-6">Sua conta foi criada e os produtos foram liberados.</p>
                    
                    <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-bold"><CheckCircle2 size={14} className="text-green-500"/> {PRODUCTS.MAIN.name}</div>
                        {addSocial && <div className="flex items-center gap-2 text-sm text-gray-700 font-bold"><CheckCircle2 size={14} className="text-green-500"/> Rede Social VIP</div>}
                        {addIA && <div className="flex items-center gap-2 text-sm text-gray-700 font-bold"><CheckCircle2 size={14} className="text-green-500"/> Inteligência Artificial</div>}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-xs uppercase animate-pulse">
                        Acessando Área de Membros <ArrowRight size={14}/>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}