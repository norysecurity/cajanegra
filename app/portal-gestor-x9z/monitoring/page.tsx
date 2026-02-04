import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, BarChart3, Clock, ChevronLeft,
  Activity, ArrowUpRight, Eye, Map, Zap, TrendingUp, Heart 
} from 'lucide-react'

// Garante dados frescos a cada acesso (Real-time)
export const dynamic = 'force-dynamic'

export default async function MonitoringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // --- 1. BUSCA DE DADOS ---
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  
  // Contagem de Likes
  const { count: totalLikes } = await supabase.from('lesson_interactions').select('*', { count: 'exact', head: true }).eq('is_liked', true)

  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url')
  
  // Busca Logs de Acesso (Analytics)
  const { data: logs } = await supabase
    .from('analytics_events')
    .select('event_type, created_at, path, user_id')
    .order('created_at', { ascending: false })
    .limit(5000)

  const { data: allProducts } = await supabase
    .from('products')
    .select('id, title, modules(id, lessons(id))');

  const safeLogs = logs || []

  // --- 2. PROCESSAMENTO DE DADOS (BI) ---
  
  // A. Mapear Aulas -> Cursos
  const lessonToProductMap: Record<string, string> = {};
  allProducts?.forEach(p => {
      p.modules?.forEach(m => {
          m.lessons?.forEach(l => {
              // @ts-ignore
              lessonToProductMap[l.id] = p.title;
          });
      });
  });

  // B. Top Cursos (Baseado em Page Views)
  const courseViews: Record<string, number> = {};
  safeLogs.forEach(log => {
      if (log.event_type === 'page_view' && log.path && log.path.includes('/app/view/')) {
          const lessonId = log.path.split('/').pop() || '';
          if (lessonToProductMap[lessonId]) {
             const productName = lessonToProductMap[lessonId];
             courseViews[productName] = (courseViews[productName] || 0) + 1;
          }
      }
  });
  
  const topCourseEntry = Object.entries(courseViews).sort(([,a], [,b]) => b - a)[0];
  const topCourseName = topCourseEntry ? topCourseEntry[0] : "Aguardando dados...";
  const topCourseViews = topCourseEntry ? topCourseEntry[1] : 0;

  // C. Métricas Gerais
  const heartbeats = safeLogs.filter(l => l.event_type === 'heartbeat')
  const totalSecondsLogged = heartbeats.length * 10
  const totalMinutes = Math.floor(totalSecondsLogged / 60)
  const avgMinutesPerUser = totalUsers ? Math.floor(totalMinutes / totalUsers) : 0

  const pageViews = safeLogs.filter(l => l.event_type === 'page_view')
  const pageCounts: Record<string, number> = {}
  
  pageViews.forEach(v => {
     if(!v.path) return;
     // Limpa a URL para ficar bonita no gráfico
     const cleanPath = v.path
        .replace('/app/view/', 'Aula: ')
        .replace('/app', 'Dashboard')
        .replace(/\/$/, '') // Remove barra final
     
     if(cleanPath) pageCounts[cleanPath] = (pageCounts[cleanPath] || 0) + 1
  })
  const topPages = Object.entries(pageCounts).sort(([,a], [,b]) => b - a).slice(0, 5)

  // D. GRÁFICO DE PICO DE ACESSO (24h)
  const hourCounts = new Array(24).fill(0)
  safeLogs.forEach(l => {
      // Ajuste de Fuso Horário (UTC -> Brasil -3)
      const date = new Date(l.created_at)
      let hour = date.getUTCHours() - 3
      if (hour < 0) hour += 24 // Corrige horas negativas (ex: 23h do dia anterior)
      
      if (hour >= 0 && hour < 24) {
        hourCounts[hour]++
      }
  })
  const maxActivity = Math.max(...hourCounts)

  // E. Ranking de Alunos
  const userActivity: Record<string, number> = {}
  heartbeats.forEach(h => {
     if(!h.user_id) return;
     userActivity[h.user_id] = (userActivity[h.user_id] || 0) + 1
  })
  
  const topStudents = Object.entries(userActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([uid, count]) => {
        const profile = profiles?.find(p => p.id === uid)
        return {
            name: profile?.full_name || 'Aluno',
            email: profile?.email || '...',
            avatar: profile?.avatar_url,
            minutes: Math.floor((count * 10) / 60)
        }
    })

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans p-8 relative">
      
      {/* CARD FLUTUANTE DE DESTAQUE */}
      <div className="fixed bottom-6 right-6 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 group hover:border-rose-500/50 transition-all cursor-default">
         <div className="bg-rose-600/20 p-3 rounded-xl group-hover:bg-rose-600/30 transition">
            <TrendingUp size={24} className="text-rose-500 animate-pulse"/>
         </div>
         <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Curso Mais Visualizado</p>
            <h4 className="text-xl font-black text-white italic uppercase truncate max-w-[250px] leading-none mb-1">{topCourseName}</h4>
            <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
               <Eye size={12}/> {topCourseViews} visualizações recentes
            </p>
         </div>
      </div>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10 border-b border-white/5 pb-6">
        <div className="flex items-center gap-6">
            <Link href="/portal-gestor-x9z" className="p-3 bg-zinc-900 rounded-2xl border border-white/10 hover:bg-white hover:text-black transition group shadow-lg">
                <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <Activity className="text-rose-600" /> Intelligence <span className="text-zinc-600">Hub</span>
                </h1>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">
                    Análise de Comportamento e Retenção em Tempo Real
                </p>
            </div>
        </div>

        <div className="flex gap-4">
           <div className="bg-zinc-900 border border-white/5 px-4 py-2 rounded-lg text-center">
              <p className="text-[9px] text-zinc-500 font-black uppercase">Status do Rastreador</p>
              <p className="text-emerald-500 font-bold text-xs flex items-center gap-1 justify-center mt-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Coletando Dados</p>
           </div>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
         <KPICard icon={<Users size={20}/>} label="Total Alunos" value={totalUsers || 0} sub="Base ativa" />
         <KPICard icon={<Clock size={20}/>} label="Minutos Consumidos" value={totalMinutes} sub="Tempo total de tela" color="text-blue-500"/>
         <KPICard icon={<Zap size={20}/>} label="Média p/ Aluno" value={`${avgMinutesPerUser}m`} sub="Retenção média" color="text-amber-500"/>
         <KPICard icon={<Eye size={20}/>} label="Page Views" value={pageViews.length} sub="Navegação total" color="text-emerald-500"/>
         <KPICard icon={<Heart size={20}/>} label="Interações" value={totalLikes || 0} sub="Aulas curtidas" color="text-rose-500"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* COLUNA 1: MAPA DE HORÁRIOS (GRÁFICO) */}
         <div className="lg:col-span-2 bg-[#0F0F10] border border-white/5 rounded-[32px] p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-lg font-bold uppercase italic text-zinc-300 flex items-center gap-2">
                  <Clock size={18} className="text-rose-600" /> Pico de Acesso (24h)
               </h3>
               <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">Horário de Brasília</span>
            </div>
            
            <div className="flex items-end justify-between h-48 gap-1">
               {hourCounts.map((count, hour) => {
                  const heightPercent = maxActivity > 0 ? (count / maxActivity) * 100 : 0
                  // Altura mínima visual para barras vazias (5%)
                  const barHeight = count > 0 ? Math.max(heightPercent, 10) : 5 
                  
                  return (
                     <div key={hour} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div 
                            className={`w-full rounded-t-sm relative transition-all duration-500 ${count > 0 ? 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-zinc-800/50'}`} 
                            style={{ height: `${barHeight}%` }}
                        >
                           {count > 0 && (
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg z-10 pointer-events-none">
                                 {count} acessos
                              </div>
                           )}
                        </div>
                        {/* Mostra horários a cada 3h para não poluir */}
                        <span className="text-[8px] text-zinc-600 font-bold">{hour % 3 === 0 ? `${hour}h` : ''}</span>
                     </div>
                  )
               })}
            </div>
         </div>

         {/* COLUNA 2: CONTEÚDO MAIS ACESSADO */}
         <div className="bg-[#0F0F10] border border-white/5 rounded-[32px] p-8">
            <h3 className="text-lg font-bold uppercase italic text-zinc-300 mb-6 flex items-center gap-2">
               <Map size={18} className="text-blue-500" /> Navegação Recente
            </h3>
            <div className="space-y-4">
               {topPages.map(([path, count], index) => (
                  <div key={path} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-xs font-black text-zinc-600">#{index + 1}</span>
                        <p className="text-xs font-bold text-zinc-300 truncate max-w-[180px]" title={path}>{path}</p>
                     </div>
                     <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded text-white whitespace-nowrap">{count} views</span>
                  </div>
               ))}
               {topPages.length === 0 && <p className="text-zinc-600 text-xs">Sem dados de navegação ainda.</p>}
            </div>
         </div>

         {/* LINHA DE BAIXO: LEADERBOARD DE ALUNOS */}
         <div className="lg:col-span-3 bg-[#0F0F10] border border-white/5 rounded-[32px] p-8 mb-20">
            <h3 className="text-lg font-bold uppercase italic text-zinc-300 mb-6 flex items-center gap-2">
               <Users size={18} className="text-emerald-500" /> Alunos Mais Engajados (Tempo de Tela)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
               {topStudents.map((student, i) => (
                  <div key={i} className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center hover:border-emerald-500/30 transition relative group">
                     <div className="absolute top-2 right-2 text-[10px] font-black text-zinc-700">#{i+1}</div>
                     <div className="w-12 h-12 rounded-full bg-zinc-800 mb-3 overflow-hidden border border-white/10 group-hover:border-emerald-500 transition">
                        {student.avatar ? (
                           <img src={student.avatar} className="w-full h-full object-cover" alt={student.name} />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center font-bold text-zinc-600">{student.name[0]}</div>
                        )}
                     </div>
                     <p className="text-xs font-bold text-white truncate w-full">{student.name}</p>
                     <div className="mt-2 bg-emerald-900/20 text-emerald-400 border border-emerald-900/30 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                        <Clock size={10}/> {student.minutes} min
                     </div>
                  </div>
               ))}
               {topStudents.length === 0 && <p className="col-span-5 text-center text-zinc-600 text-sm py-10">Aguardando dados de atividade...</p>}
            </div>
         </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, icon, color = "text-rose-600" }: any) {
   return (
      <div className="bg-[#0F0F10] border border-white/5 p-6 rounded-[24px] relative overflow-hidden group hover:border-white/10 transition">
         <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg bg-zinc-900 ${color} border border-white/5 shadow-lg shadow-${color.split('-')[1]}-900/20`}>{icon}</div>
            <ArrowUpRight size={16} className="text-zinc-700 group-hover:text-white transition" />
         </div>
         <h2 className="text-3xl font-black italic text-white mb-1">{value}</h2>
         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
         <p className="text-[9px] text-zinc-600 mt-2 flex items-center gap-1"><Activity size={10}/> {sub}</p>
      </div>
   )
}