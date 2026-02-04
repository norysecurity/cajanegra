import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid, Users, BarChart3, Settings,
  Zap, PlayCircle, Clock, Shield, CheckCircle, Lock, ChevronRight, Activity,
  Megaphone, Heart, Bot // <--- Adicionei Bot para o ícone da comunidade
} from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import AdminClient from './AdminClient'

// Garante dados frescos a cada acesso
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // 1. DADOS GERAIS
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

  // --- NOVA CONTAGEM DE LIKES (REAL) ---
  const { count: totalLikes } = await supabase
    .from('lesson_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('is_liked', true)

  // Busca Produtos para exibir nomes e no editor
  const { data: products } = await supabase
    .from('products')
    .select('*, modules(*, lessons(*))')
    .order('created_at', { ascending: false })

  // 2. BI MONITORAMENTO
  const { data: studentsStats } = await supabase
    .from('profiles')
    .select(`
      email,
      last_sign_in_at,
      user_activity_logs (seconds_watched),
      lesson_interactions (is_liked),
      lesson_comments (id)
    `)
    .limit(5)

  // 3. LISTA DE ALUNOS & ACESSOS
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, last_sign_in_at, created_at')
    .order('last_sign_in_at', { ascending: false, nullsFirst: false })
    .limit(20)

  if (profileError) {
    console.error("ERRO SQL PERFIS:", profileError.message)
  }

  // B) Busca Compras Ativas
  const { data: allPurchases } = await supabase
    .from('purchases')
    .select('user_id, product_id, status')
    .eq('status', 'active')

  // C) Junta Tudo
  const studentsAccess = profiles?.map(student => {
    const myPurchases = allPurchases?.filter(p => p.user_id === student.id) || []

    const purchasesWithNames = myPurchases.map(p => {
      const productInfo = products?.find(prod => prod.id === p.product_id)
      return {
        status: p.status,
        products: { title: productInfo?.title || 'Produto Desconhecido' }
      }
    })

    return {
      ...student,
      purchases: purchasesWithNames
    }
  }) || []

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0]

  const isUserOnline = (dateString: string | null) => {
    if (!dateString) return false
    const lastSeen = new Date(dateString).getTime()
    const now = new Date().getTime()
    const diffMinutes = (now - lastSeen) / 1000 / 60
    return diffMinutes < 30
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans h-screen overflow-hidden">

      {/* SIDEBAR ADMINISTRATIVA (NAVEGAÇÃO GLOBAL) */}
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-white/[0.05] bg-[#0A0A0B] z-50 flex flex-col items-center py-8 gap-10">
        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
          <span className="font-black italic text-lg text-white">D</span>
        </div>
        
        <nav className="flex flex-col gap-8 text-zinc-600">
          
          {/* Dashboard (Home) */}
          <Link href="/portal-gestor-x9z" title="Dashboard Geral">
            <LayoutGrid size={22} className="text-white cursor-pointer" />
          </Link>

          {/* --- AQUI ESTÁ O NOVO BOTÃO DA COMUNIDADE (Bots/Posts) --- */}
          <Link href="/portal-gestor-x9z/comunidade" title="Gestão da Comunidade">
            <Bot size={22} className="text-rose-500 hover:text-white hover:scale-110 transition duration-300" />
          </Link>

          {/* Monitoramento */}
          <Link href="/portal-gestor-x9z/monitoring" title="Monitoramento de BI">
            <BarChart3 size={22} className="hover:text-white transition" />
          </Link>

          {/* Usuários */}
          <Link href="/portal-gestor-x9z/users" title="Todos os Usuários">
            <Users size={22} className="hover:text-white transition" />
          </Link>

        </nav>
        
        <div className="mt-auto"><SignOutButton /></div>
      </aside>

      <main className="pl-20 h-full flex flex-col">
        {/* NAVBAR */}
        <header className="h-20 border-b border-white/[0.05] px-10 flex justify-between items-center bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-40">
          <h2 className="text-[10px] font-black uppercase text-red-600 tracking-[0.3em] italic">Command Center v3.0</h2>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <div className="text-right mr-4">
              <p className="text-xs font-bold text-white capitalize leading-none">{userName}</p>
              <p className="text-[9px] text-green-500 font-black mt-1 uppercase">Root Admin</p>
            </div>
          </div>
        </header>

        {/* SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Alunos" value={totalUsers || 0} trend="DB Real" />
            
            {/* CARD DE LIKES */}
            <div className="p-8 rounded-[32px] bg-zinc-900/20 border border-white/[0.05] group hover:border-rose-500/20 transition duration-500">
                <p className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Aulas Curtidas</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-black italic leading-none text-rose-500 group-hover:scale-110 transition origin-left">{totalLikes || 0}</h3>
                    <Heart size={16} className="text-rose-500 mb-1 fill-rose-500 animate-pulse" />
                </div>
            </div>

            <div className="p-8 rounded-[40px] bg-zinc-900/40 border border-white/5 flex flex-col justify-center">
              <p className="text-zinc-500 text-[10px] font-black uppercase mb-2 italic">Performance</p>
              <h3 className="text-xl font-black text-white italic">RETENÇÃO 84%</h3>
            </div>
            <div className="p-8 rounded-[40px] bg-red-600 flex flex-col justify-center shadow-xl shadow-red-600/20">
              <p className="text-red-100 text-[10px] font-black uppercase mb-2 italic">Sistema</p>
              <h3 className="text-xl font-black text-white italic text-center">OPERACIONAL</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

            {/* EDITOR (ESQUERDA) */}
            <div className="xl:col-span-2 space-y-6">
              <h3 className="text-sm font-black uppercase text-zinc-500 flex items-center gap-3 italic tracking-widest">
                <PlayCircle size={18} className="text-red-600" /> Grade de Conteúdos
              </h3>
              <AdminClient products={products || []} />
            </div>

            {/* LISTA DE ALUNOS (DIREITA) */}
            <div className="space-y-6 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-zinc-500 flex items-center gap-3 italic tracking-widest">
                  <Shield size={18} className="text-green-500" /> Alunos & Acessos
                </h3>
                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-white/5">
                  {studentsAccess.length} Ativos
                </span>
              </div>

              {/* LISTA DE ALUNOS */}
              <div className="bg-zinc-900/30 border border-white/[0.05] rounded-[32px] p-4 backdrop-blur-sm min-h-[400px]">
                <div className="space-y-2">
                  {studentsAccess.map((student: any) => {
                    const hasAccess = student.purchases.length > 0
                    const isOnline = isUserOnline(student.last_sign_in_at)

                    return (
                      <Link href={`/portal-gestor-x9z/students/${student.id}`} key={student.id} className="block group">
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition cursor-pointer flex items-center gap-3 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                          {/* AVATAR */}
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex-shrink-0">
                              {student.avatar_url ? (
                                <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-xs">
                                  {student.full_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0A0A0B] ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'}`} title={isOnline ? "Online agora" : `Visto em: ${new Date(student.last_sign_in_at).toLocaleDateString()}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <p className="text-[11px] font-bold text-white truncate group-hover:text-red-500 transition">
                                {student.full_name || 'Usuário Sem Nome'}
                              </p>
                              <ChevronRight size={12} className="text-zinc-700 group-hover:text-white transition -mr-1" />
                            </div>
                            <p className="text-[9px] text-zinc-600 truncate mb-1">{student.email}</p>
                            {hasAccess ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle size={10} className="text-green-500" />
                                <span className="text-[9px] text-zinc-400 truncate w-32">{student.purchases.length} curso(s)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Lock size={10} className="text-zinc-600" />
                                <span className="text-[9px] text-zinc-600">Sem acesso</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  {(!studentsAccess || studentsAccess.length === 0) && (
                    <div className="text-center py-10 px-4 border border-dashed border-white/10 rounded-2xl">
                      <Users className="mx-auto text-zinc-600 mb-2" size={24} />
                      <p className="text-xs font-bold text-zinc-500">Nenhum aluno encontrado</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD INSIGHT */}
              <div className="p-6 rounded-[32px] bg-gradient-to-br from-zinc-900 to-black border border-white/5">
                <Activity size={16} className="text-blue-500 mb-2" />
                <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-tighter">Status em Tempo Real</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  A lista agora mostra os alunos ordenados por quem acessou a plataforma mais recentemente.
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value, trend }: any) {
  return (
    <div className="p-8 rounded-[32px] bg-zinc-900/20 border border-white/[0.05] group hover:border-white/10 transition duration-500">
      <p className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">{title}</p>
      <div className="flex items-end gap-3">
        <h3 className="text-4xl font-black italic leading-none group-hover:text-red-600 transition-colors">{value}</h3>
        <span className="text-green-500 text-[10px] font-black mb-1">{trend}</span>
      </div>
    </div>
  )
}