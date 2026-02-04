'use client'

import { motion, Variants } from 'framer-motion'
import CourseCard from './CourseCard'
import { Bell } from 'lucide-react'

// Simulando categorias
const categories = [
  { id: 'continuar', title: 'Continuar Estudando 🕒', items: [1] },
  { id: 'destaques', title: 'Recomendados para Você 🔥', items: [2, 3, 4] },
  { id: 'ia', title: 'Módulos de IA 🤖', items: [5, 6] },
  { id: 'vendas', title: 'Vendas e Copy 💰', items: [7, 8, 9] },
]

export default function DashboardClient({ user }: any) {
  
  // Configuração da Animação: DE BAIXO PARA CIMA
  // ADICIONADO ": Variants" AQUI PARA CORRIGIR O ERRO
  const containerVars: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15, // Cascata suave
        delayChildren: 0.2
      }
    }
  }

  // ADICIONADO ": Variants" AQUI TAMBÉM
  const itemVars: Variants = {
    hidden: { y: 100, opacity: 0 }, // Começa 100px ABAIXO
    show: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 100 
      } 
    }
  }

  return (
    <div className="pb-32 min-h-screen">
      
      {/* 1. HEADER LIMPO */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center sticky top-0 z-40 bg-[#09090B]/80 backdrop-blur-md border-b border-white/5">
        <div>
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold">Plataforma</p>
          <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">
            Olá, {user?.user_metadata?.name?.split(' ')[0] || 'Aluno'}
          </h1>
        </div>
        <div className="p-2.5 bg-white/5 border border-white/10 rounded-full relative hover:bg-white/10 transition cursor-pointer">
          <Bell size={20} className="text-zinc-300" />
          <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
        </div>
      </header>

      {/* 2. LISTAS DE CURSOS (Entrando de baixo) */}
      <motion.div 
        variants={containerVars}
        initial="hidden"
        animate="show"
        className="space-y-8 mt-4"
      >
        {categories.map((cat) => (
            <motion.section key={cat.id} variants={itemVars} className="space-y-3">
                
                {/* Título da Seção */}
                <div className="px-6 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2 border-l-2 border-rose-600 pl-3">
                        {cat.title}
                    </h3>
                </div>
                
                {/* Carrossel Horizontal Limpo */}
                <div className="flex overflow-x-auto px-6 gap-4 pb-4 snap-x snap-mandatory scrollbar-hide pt-2">
                    {/* Renderiza Cards */}
                    {cat.items.map((i) => (
                        <div key={i} className="snap-center shrink-0 w-[150px] md:w-[200px] transform transition hover:scale-105 active:scale-95 duration-300">
                           {/* NOTA: Certifique-se que o seu CourseCard aceita essa prop 'item'.
                              Se ele esperar 'product', você precisará ajustar aqui ou no componente CourseCard.
                           */}
                           <CourseCard 
                              product={{
                                id: `mock-${i}`,
                                title: `Módulo ${i}`,
                                image_url: null, 
                                is_locked_by_default: i > 4 
                              }}
                              // Passando arrays vazios só para o componente não quebrar se for o da versão Supabase
                              purchasedIds={[]}
                              completedIds={[]}
                              savedIds={[]}
                           />
                        </div>
                    ))}
                    
                    {/* Espaço extra no final */}
                    <div className="w-2 shrink-0" />
                </div>
            </motion.section>
        ))}
      </motion.div>
    </div>
  )
}