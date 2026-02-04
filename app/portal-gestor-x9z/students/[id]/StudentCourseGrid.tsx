'use client'

import { useState, useTransition, useEffect } from 'react'
import { 
  Lock, Unlock, Loader2, LayoutGrid, Search, 
  Bot, BrainCircuit, CheckCircle2, Power, ShieldAlert
} from 'lucide-react'
import { grantAccess, revokeAccess } from '@/app/portal-gestor-x9z/actions'

// 🎭 MÁSCARA ANONYMOUS
const ANONYMOUS_MASK_URL = "https://cdn-icons-png.flaticon.com/512/3260/3260849.png"

export default function StudentCourseGrid({ studentId, allProducts, purchases, aiProductId }: any) {
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<'grid' | 'ai'>('grid')
  const [filter, setFilter] = useState('')
  
  // 🛡️ BLINDAGEM DE HIDRATAÇÃO (Evita o erro NotFoundError / insertBefore)
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Verifica o que o aluno já tem desbloqueado
  const unlocked = new Set(purchases?.map((p: any) => p.product_id) || [])
  
  // Verifica se o aluno tem a IA
  const hasAiAccess = aiProductId && unlocked.has(aiProductId)

  // --- FILTRO: ESCONDE A I.A. DA LISTA DE CURSOS ---
  const filteredProducts = allProducts.filter((p: any) => {
    const matchName = p.title.toLowerCase().includes(filter.toLowerCase())
    const isNotAI = aiProductId ? p.id !== aiProductId : !p.title.toLowerCase().includes('i.a. premium')
    return matchName && isNotAI
  })

  // Função para Liberar/Bloquear a I.A.
  const toggleAI = () => {
    if (!aiProductId) return alert("ERRO: ID da I.A. não encontrado.")
    
    startTransition(async () => {
      try {
        if(hasAiAccess) {
            if(confirm("⚠ Tem certeza que deseja REMOVER o acesso deste aluno à I.A.?")) {
                await revokeAccess(studentId, aiProductId)
            }
        } else {
            await grantAccess(studentId, aiProductId)
        }
      } catch(e) {
        alert("Erro ao processar.")
      }
    })
  }

  // Função para Cursos Normais
  const toggleCourse = (id: string, has: boolean) => {
    startTransition(async () => {
      try {
        if(has) {
            if(confirm("Bloquear acesso a este curso?")) await revokeAccess(studentId, id)
        } else {
            await grantAccess(studentId, id)
        }
      } catch(e) { alert("Erro ao alterar curso") }
    })
  }

  // Enquanto não monta no navegador, retornamos um esqueleto simples para não quebrar a hidratação
  if (!isMounted) return <div className="min-h-screen animate-pulse bg-white/5 rounded-3xl" />

  return (
    <div className="space-y-6 notranslate" translate="no"> 

      {/* HEADER DE ABAS (Igual ao Admin) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
         <div className="flex bg-[#0E0E10] p-1 rounded-xl border border-white/5 w-fit">
            <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <LayoutGrid size={14}/> Cursos
            </button>
            <button 
                onClick={() => setViewMode('ai')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ml-1 ${viewMode === 'ai' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-zinc-500 hover:text-rose-500'}`}
            >
                <BrainCircuit size={14}/> Gestão I.A.
            </button>
         </div>

         {viewMode === 'grid' && (
             <div className="flex items-center gap-3 bg-[#0E0E10] border border-white/5 rounded-xl px-4 py-2 w-full md:w-64 focus-within:border-white/20 transition opacity-80 hover:opacity-100">
                <Search size={16} className="text-zinc-500"/>
                <input 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filtrar cursos..."
                    className="bg-transparent border-none outline-none text-xs text-white placeholder:text-zinc-600 w-full font-bold"
                />
             </div>
         )}
      </div>

      {/* === ABA 1: GALERIA DE CURSOS === */}
      {viewMode === 'grid' && (
        <div className="relative w-full animate-in fade-in zoom-in duration-300">
            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((p: any) => {
                        const has = unlocked.has(p.id)
                        const bgImage = p.image_url && p.image_url.length > 5 ? p.image_url : "https://via.placeholder.com/600x400/18181b/52525b?text=CURSO"

                        return (
                            <div key={p.id} className={`group relative flex flex-col bg-[#0E0E10] border rounded-3xl overflow-hidden transition-all duration-300 ${has ? 'border-green-500/20 shadow-lg shadow-green-900/5' : 'border-white/5 opacity-80 hover:opacity-100'}`}>
                                <div className="h-48 w-full bg-black relative overflow-hidden">
                                    <img src={bgImage} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!has && 'grayscale'}`} alt={p.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] to-transparent opacity-90"/>
                                    <div className="absolute top-3 right-3">
                                        {isMounted && (has ? (
                                            <span key={`unlocked-${p.id}`} className="bg-green-500/10 text-green-500 border border-green-500/20 text-[9px] font-black px-2 py-1 rounded uppercase flex items-center gap-1">
                                              <Unlock size={10}/> Liberado
                                            </span>
                                        ) : (
                                            <span key={`locked-${p.id}`} className="bg-black/60 text-zinc-500 border border-white/10 text-[9px] font-black px-2 py-1 rounded uppercase flex items-center gap-1">
                                              <Lock size={10}/> Bloqueado
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col gap-4 flex-1">
                                    <h4 className="text-sm font-black text-zinc-200 uppercase leading-tight line-clamp-2">{p.title}</h4>
                                    <button 
                                        onClick={() => toggleCourse(p.id, has)}
                                        disabled={isPending}
                                        className={`mt-auto w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${has ? 'bg-zinc-900 text-zinc-500 hover:bg-red-950/30 hover:text-red-500' : 'bg-white text-black hover:bg-green-400'}`}
                                    >
                                        {isPending ? <Loader2 size={14} className="animate-spin"/> : has ? 'Revogar Acesso' : 'Liberar Curso'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-20 text-zinc-600 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-3xl">
                    Nenhum curso encontrado.
                </div>
            )}
        </div>
      )}

      {/* === ABA 2: GESTÃO I.A. (RÉPLICA PERFEITA DO ADMIN) === */}
      {viewMode === 'ai' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  
                  {/* Cabeçalho */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-8 relative z-10">
                      <div>
                          <h2 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-3">
                              <Bot className="text-rose-600" size={28} /> Configuração Individual
                          </h2>
                          <p className="text-zinc-500 text-sm mt-1">Gerencie a permissão do robô para este aluno específico.</p>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${hasAiAccess ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-800 border-white/5 text-zinc-500'}`}>
                          {isMounted && (hasAiAccess ? <CheckCircle2 size={16}/> : <ShieldAlert size={16}/>)}
                          <span className="text-xs font-bold uppercase tracking-wide">
                              {hasAiAccess ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                          </span>
                      </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                      
                      {/* Avatar */}
                      <div className="md:col-span-1 bg-zinc-900/30 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center">
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 shadow-xl transition-all duration-500 ${hasAiAccess ? 'bg-green-500/10 border-green-500 shadow-green-500/20' : 'bg-black border-zinc-800 grayscale opacity-50'}`}>
                              <img src={ANONYMOUS_MASK_URL} className="w-14 h-14 object-contain" alt="IA Avatar" />
                          </div>
                          <div>
                             <h3 className="text-white font-bold text-sm uppercase tracking-wide">Iara AI</h3>
                             <p className="text-[10px] text-zinc-500 mt-1">Status: {hasAiAccess ? 'Online' : 'Offline'}</p>
                          </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="md:col-span-2 flex flex-col justify-center gap-4">
                          
                          {/* Botão VERDE (Liberar) */}
                          <button 
                              onClick={() => !hasAiAccess && toggleAI()}
                              disabled={hasAiAccess || isPending || !aiProductId}
                              className={`flex items-center justify-between p-5 rounded-2xl border transition-all group ${hasAiAccess ? 'bg-zinc-900/50 border-white/5 opacity-50 cursor-default' : 'bg-zinc-800 border-white/10 hover:border-green-500 hover:bg-zinc-800/80 cursor-pointer'}`}
                          >
                              <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl ${hasAiAccess ? 'bg-zinc-800 text-zinc-600' : 'bg-green-500/20 text-green-500 group-hover:scale-110 transition'}`}>
                                      {isMounted && <Unlock size={24} />}
                                  </div>
                                  <div className="text-left">
                                      <h4 className={`font-bold text-sm uppercase ${hasAiAccess ? 'text-zinc-500' : 'text-white group-hover:text-green-400'}`}>Liberar Acesso</h4>
                                      <p className="text-[10px] text-zinc-500">Concede acesso imediato ao aluno.</p>
                                  </div>
                              </div>
                              {!hasAiAccess && (isPending ? <Loader2 className="animate-spin text-zinc-500"/> : isMounted && <CheckCircle2 className="text-zinc-600 group-hover:text-green-500 transition"/>)}
                          </button>

                          {/* Botão VERMELHO (Bloquear) */}
                          <button 
                              onClick={() => hasAiAccess && toggleAI()}
                              disabled={!hasAiAccess || isPending}
                              className={`flex items-center justify-between p-5 rounded-2xl border transition-all group ${!hasAiAccess ? 'bg-zinc-900/50 border-white/5 opacity-50 cursor-default' : 'bg-zinc-800 border-white/10 hover:border-red-500 hover:bg-zinc-800/80 cursor-pointer'}`}
                          >
                              <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl ${!hasAiAccess ? 'bg-zinc-800 text-zinc-600' : 'bg-red-500/20 text-red-500 group-hover:scale-110 transition'}`}>
                                      {isMounted && <Power size={24} />}
                                  </div>
                                  <div className="text-left">
                                      <h4 className={`font-bold text-sm uppercase ${!hasAiAccess ? 'text-zinc-500' : 'text-white group-hover:text-red-400'}`}>Revogar Acesso</h4>
                                      <p className="text-[10px] text-zinc-500">Remove o acesso do aluno imediatamente.</p>
                                  </div>
                              </div>
                              {hasAiAccess && (isPending ? <Loader2 className="animate-spin text-zinc-500"/> : isMounted && <ShieldAlert className="text-zinc-600 group-hover:text-red-500 transition"/>)}
                          </button>

                      </div>
                  </div>
                  
                  {/* Fundo Decorativo */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"/>
              </div>
          </div>
      )}

    </div>
  )
}