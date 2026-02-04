'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Loader2, AlertCircle, FileText } from 'lucide-react'
import CourseCard from '../CourseCard'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userData, setUserData] = useState<any>({ 
    purchased: [], 
    completed: [], 
    saved: [] 
  })

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const { data: products } = await supabase
          .from('products')
          .select('*, modules(*, lessons(*))')
          .order('created_at', { ascending: false })

        const { data: purchases } = await supabase
          .from('purchases')
          .select('product_id')
          .eq('user_id', user.id)
          .in('status', ['active', 'completed', 'gift', 'manual_approved'])

        const { data: saved } = await supabase
          .from('user_saved_products')
          .select('product_id')
          .eq('user_id', user.id)

        const { data: completed } = await supabase
          .from('user_lessons_completed')
          .select('lesson_id')
          .eq('user_id', user.id)

        const validProducts = products || []
        setAllProducts(validProducts)
        setResults(validProducts)
        
        setUserData({
          purchased: purchases?.map((p: any) => p.product_id) || [],
          saved: saved?.map((s: any) => s.product_id) || [],
          completed: completed?.map((c: any) => c.lesson_id) || []
        })
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 2. LÓGICA DE FILTRAGEM
  useEffect(() => {
    if (loading) return

    const lowerQuery = query.toLowerCase().trim()

    if (lowerQuery === '') {
      setResults(allProducts)
      return
    }

    const filtered = allProducts.filter(product => {
      const titleMatch = product.title?.toLowerCase().includes(lowerQuery)
      const descMatch = product.description?.toLowerCase().includes(lowerQuery)
      return titleMatch || descMatch
    })

    setResults(filtered)
  }, [query, allProducts, loading])

  return (
    <div className="min-h-screen bg-[#09090B] pb-32 relative z-0">
      
      {/* === HEADER DE BUSCA FIXO E SÓLIDO === */}
      {/* CORREÇÃO 1 (Fundo): Mudei para bg-[#09090B] (Sólido) e z-50.
          Agora nada passa por trás dele.
      */}
      <div className="sticky top-0 z-50 bg-[#09090B] border-b border-white/5 px-4 pt-6 pb-4 shadow-xl shadow-black/80">
        <div className="relative max-w-2xl mx-auto">
            
            {/* CORREÇÃO 2 (Ícone Centralizado): 
               Removi o 'absolute top-1/2' antigo.
               Agora uso um container Flexbox que ocupa toda a altura (bottom-0 top-0).
               Isso força o ícone a ficar EXATAMENTE no meio verticalmente.
            */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-rose-500 pointer-events-none z-20">
                <Search size={20} strokeWidth={2.5} />
            </div>
            
            {/* Input */}
            <input 
                type="text" 
                placeholder="O que você quer aprender hoje?" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full relative z-10 bg-[#18181B] border border-white/10 text-white pl-12 pr-12 py-4 rounded-2xl outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-600 font-medium text-sm md:text-base shadow-inner"
            />
            
            {/* Botão Limpar (X) */}
            <AnimatePresence>
                {query && (
                    <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center z-20">
                        <motion.button 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setQuery('')} 
                            className="bg-zinc-800 text-zinc-400 hover:text-white p-1.5 rounded-full transition-colors flex items-center justify-center"
                        >
                            <X size={14} />
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="px-4 mt-6 max-w-7xl mx-auto relative z-0">
        {loading ? (
            <div className="flex flex-col items-center justify-center pt-32 text-zinc-500 gap-3">
                <Loader2 className="animate-spin text-rose-600" size={40} />
                <p className="text-xs uppercase tracking-widest font-bold animate-pulse">Carregando catálogo...</p>
            </div>
        ) : (
            <>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-zinc-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                       <FileText size={14} className="text-rose-500" /> Resultados: <span className="text-white">{results.length}</span>
                    </h2>
                </div>

                {results.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {results.map((product, index) => (
                            <motion.div 
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <CourseCard 
                                    product={product} 
                                    purchasedIds={userData.purchased}
                                    completedIds={userData.completed}
                                    savedIds={userData.saved}
                                />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-20 text-zinc-600">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
                            <AlertCircle size={32} className="text-zinc-700" />
                        </div>
                        <h3 className="text-zinc-300 font-bold text-lg">Nenhum treinamento encontrado</h3>
                        <p className="text-zinc-500 text-sm mt-1">Tente buscar por outro termo.</p>
                        
                        <button 
                            onClick={() => setQuery('')}
                            className="mt-6 text-rose-500 text-xs font-black uppercase tracking-widest hover:underline"
                        >
                            Limpar Filtros
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  )
}