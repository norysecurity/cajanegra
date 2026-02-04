import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid, Users, BarChart3,
  Megaphone, Activity, Bell, Search, Filter,
  ArrowUpRight
} from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import { NotificationSender } from './NotificationSender'

// Garante que a página não faça cache estático
export const dynamic = 'force-dynamic'

export default async function NotificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // 1. DADOS DE USUÁRIOS (Select)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('created_at', { ascending: false })

  // 2. PRODUTOS (Select - Promoção)
  const { data: products } = await supabase
    .from('products')
    .select('id, title, sales_page_url, hotmart_id')
    .eq('is_locked_by_default', true)

  // 3. HISTÓRICO DE DISPAROS
  const { data: history } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0]

  return (
    /* ADICIONADO: notranslate e translate="no" para evitar o erro NotFoundError do Google Tradutor */
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans flex notranslate" translate="no">

      {/* SIDEBAR (Igual ao AdminDashboard) */}
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-white/[0.05] bg-[#0A0A0B] z-50 flex flex-col items-center py-8 gap-10">
        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
          <span className="font-black italic text-lg text-white">D</span>
        </div>
        
        <nav className="flex flex-col gap-8 text-zinc-600">
          <Link href="/portal-gestor-x9z" title="Dashboard">
            <LayoutGrid size={22} className="hover:text-white transition cursor-pointer" />
          </Link>
          <Link href="/portal-gestor-x9z/notifications" title="Marketing">
            <Megaphone size={22} className="text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition" />
          </Link>
          <Link href="/portal-gestor-x9z/monitoring" title="BI">
            <BarChart3 size={22} className="hover:text-white transition" />
          </Link>
          <Link href="/portal-gestor-x9z/users" title="Usuários">
            <Users size={22} className="hover:text-white transition" />
          </Link>
        </nav>
        
        <div className="mt-auto"><SignOutButton /></div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="pl-20 w-full min-h-screen flex flex-col">
        
        {/* HEADER */}
        <header className="h-20 border-b border-white/[0.05] px-10 flex justify-between items-center bg-[#0A0A0B]/95 backdrop-blur-md sticky top-0 z-40">
          <h2 className="text-[10px] font-black uppercase text-red-600 tracking-[0.3em] italic">
             MARKETING & PUSH
          </h2>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <div className="text-right mr-4">
              <p className="text-xs font-bold text-white capitalize leading-none">{userName}</p>
              <p className="text-[9px] text-zinc-500 font-black mt-1 uppercase">Root Admin</p>
            </div>
          </div>
        </header>

        {/* CONTEÚDO (GRID DESKTOP) */}
        <div className="flex-1 p-8 lg:p-10 overflow-y-auto custom-scrollbar">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* ESQUERDA: PAINEL DE CONTROLE */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-10">
                    <div className="p-6 rounded-[24px] bg-zinc-900/30 border border-white/[0.05] shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                             <h3 className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2 italic tracking-widest">
                                <Megaphone size={14} className="text-red-600" /> Criar Campanha
                            </h3>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                        </div>
                        <NotificationSender profiles={profiles || []} products={products || []} />
                    </div>

                    <div className="p-5 rounded-[20px] bg-gradient-to-br from-red-950/20 to-black border border-red-900/20">
                        <p className="text-[9px] font-black text-red-500 uppercase mb-1">Total Disparado</p>
                        <p className="text-2xl font-black text-white italic">{history?.length || 0}</p>
                    </div>
                </div>

                {/* DIREITA: HISTÓRICO EM TABELA */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2 italic tracking-widest">
                            <Activity size={14} /> Histórico Recente
                        </h3>
                        <div className="flex gap-2">
                             <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition"><Search size={14}/></button>
                             <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition"><Filter size={14}/></button>
                        </div>
                    </div>

                    <div className="bg-[#0F0F10] border border-white/[0.05] rounded-[24px] overflow-hidden">
                        
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-zinc-900/50">
                                        <th className="py-4 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-wider w-24">Tipo</th>
                                        <th className="py-4 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-wider">Título & Mensagem</th>
                                        <th className="py-4 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-wider w-32">Público</th>
                                        <th className="py-4 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-wider w-32 text-right">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history?.map((notif: any) => (
                                        /* ADICIONADO: Chave única prefixada para melhor reconciliação do React */
                                        <tr key={`notif-${notif.id}`} className="group border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                                            
                                            <td className="py-4 px-6 align-top">
                                                <span className={`
                                                    inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/5
                                                    ${notif.type === 'promo' ? 'bg-red-500/10 text-red-500' : 
                                                      notif.type === 'success' ? 'bg-green-500/10 text-green-500' : 
                                                      'bg-blue-500/10 text-blue-500'}
                                                `}>
                                                    <Megaphone size={14} />
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 align-top">
                                                <p className="text-[11px] font-bold text-zinc-200 uppercase mb-1">{notif.title}</p>
                                                <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 max-w-md">{notif.message}</p>
                                                {notif.link && (
                                                    <a href={notif.link} target="_blank" className="inline-flex items-center gap-1 mt-2 text-[9px] text-blue-400 hover:text-blue-300 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                        LINK ANEXADO <ArrowUpRight size={10}/>
                                                    </a>
                                                )}
                                            </td>

                                            <td className="py-4 px-6 align-top">
                                                <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded border border-white/5 uppercase">
                                                    {notif.user_id ? 'Individual' : 'Todos'}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 align-top text-right">
                                                {/* ADICIONADO: suppressHydrationWarning para evitar erros de renderização de datas */}
                                                <p suppressHydrationWarning className="text-[10px] font-mono text-zinc-600">
                                                    {new Date(notif.created_at).toLocaleDateString()}
                                                </p>
                                                <p suppressHydrationWarning className="text-[9px] text-zinc-700 font-mono">
                                                    {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="md:hidden space-y-4 p-4">
                            {history?.map((notif: any) => (
                                <div key={`mob-${notif.id}`} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl flex gap-3">
                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${notif.type === 'promo' ? 'bg-red-500' : 'bg-blue-500'}`}/>
                                    <div>
                                        <p className="text-xs font-bold text-white mb-1">{notif.title}</p>
                                        <p className="text-[10px] text-zinc-400 line-clamp-2">{notif.message}</p>
                                        <p suppressHydrationWarning className="text-[9px] text-zinc-600 mt-2 font-mono">{new Date(notif.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(!history || history.length === 0) && (
                            <div className="py-20 text-center">
                                <Bell size={24} className="mx-auto text-zinc-700 mb-2"/>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase">Nenhum registro encontrado</p>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  )
}