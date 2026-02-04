'use client'

import Link from 'next/link'
import { Play, Lock, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react'
import SaveProductButton from '@/components/SaveProductButton'

export default function CourseCard({ product, purchasedIds, completedIds, savedIds }: any) {
  
  // ==================================================================================
  // 1. LÓGICA ORIGINAL (RESTAUROU TUDO)
  // ==================================================================================
  const isLocked = product.is_locked_by_default && !purchasedIds.includes(product.id)
  const isSaved = savedIds.includes(product.id)
  
  const firstLessonId = product.modules?.find((m: any) => m.lessons?.length > 0)?.lessons?.[0]?.id

  const allLessons = product.modules?.flatMap((m: any) => m.lessons) || []
  const totalLessons = allLessons.length
  const lessonsDone = allLessons.filter((l: any) => completedIds.includes(l.id)).length
  const progressPercent = totalLessons > 0 ? Math.round((lessonsDone / totalLessons) * 100) : 0
  const isFinished = progressPercent === 100 && totalLessons > 0

  // ==================================================================================
  // CORREÇÃO DO LINK: Usa o sales_page_url direto do banco
  // ==================================================================================
  const checkoutUrl = product.sales_page_url?.trim() || '#'

  // Definição do Destino
  const targetLink = isLocked 
      ? checkoutUrl 
      : (firstLessonId ? `/app/view/${firstLessonId}` : '#')

  // ==================================================================================
  // 2. DESIGN NOVO (MANTIDO EXATAMENTE IGUAL)
  // ==================================================================================
  return (
    <div className="w-full aspect-square relative group">
      
      {/* Botão de Salvar (Mantido funcional) */}
      <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <SaveProductButton productId={product.id} initialState={isSaved} />
      </div>

      <Link 
        href={targetLink}
        target={isLocked ? "_blank" : "_self"}
        className={`
            block w-full h-full relative overflow-hidden bg-[#121214] border border-white/5 
            transition-all duration-300 hover:border-white/20
            ${!firstLessonId && !isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
        `}
        onClick={(e) => {
            if (!isLocked && !firstLessonId) {
                e.preventDefault();
                alert("Este curso ainda não possui aulas cadastradas.");
            }
        }}
      >
        {/* IMAGEM DE FUNDO */}
        <img 
          src={product.image_url || "https://via.placeholder.com/500x500?text=Sem+Capa"} 
          className={`
            w-full h-full object-cover transition duration-700 
            ${isLocked ? 'grayscale opacity-40' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}
          `} 
          alt={product.title} 
        />
        
        {/* OVERLAY ESCURO */}
        <div className={`absolute inset-0 transition-colors duration-300 ${isLocked ? 'bg-black/50' : 'bg-black/30 group-hover:bg-black/10'}`} />
        
        {/* ÍCONE CENTRAL (Aparece no Hover) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            {isLocked ? (
                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                     <ShoppingCart size={20} strokeWidth={2.5} />
                </div>
            ) : (
                <div className="w-14 h-14 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-rose-600/40 transform scale-75 group-hover:scale-100 transition-transform">
                     <Play size={24} fill="white" className="ml-1" />
                </div>
            )}
        </div>

        {/* INFO RODAPÉ */}
        <div className="absolute bottom-0 left-0 w-full p-4 z-10 bg-gradient-to-t from-black via-black/90 to-transparent">
            
            {/* Badges de Status */}
            <div className="flex justify-between items-end mb-2">
                {isLocked ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 border border-white/20 text-[9px] font-black text-zinc-400 uppercase tracking-widest rounded-sm">
                        <Lock size={10} /> Bloqueado
                    </span>
                ) : isFinished ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest rounded-sm">
                        <CheckCircle2 size={10} /> Concluído
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-600/20 border border-rose-600/30 text-[9px] font-black text-rose-500 uppercase tracking-widest rounded-sm">
                        {progressPercent > 0 ? `${progressPercent}%` : 'Novo'}
                    </span>
                )}
            </div>

            {/* Título */}
            <h3 className="text-white font-black text-xs md:text-sm uppercase leading-tight tracking-wide line-clamp-2 mb-1 group-hover:text-rose-500 transition-colors">
              {product.title}
            </h3>

            {/* Barra de Progresso Clean */}
            {!isLocked && totalLessons > 0 && (
                <div className="w-full h-[2px] bg-white/10 mt-2 overflow-hidden">
                    <div 
                        className="h-full bg-rose-600 transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercent}%` }} 
                    />
                </div>
            )}

            {/* Aviso "Em Breve" se não tiver aulas */}
            {!isLocked && totalLessons === 0 && (
                 <div className="mt-1 flex items-center gap-1 text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
                    <AlertCircle size={10}/> Em Breve
                 </div>
            )}
        </div>
      </Link>
    </div>
  )
}