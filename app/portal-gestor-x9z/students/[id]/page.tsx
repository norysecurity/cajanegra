import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, MapPin, Calendar, CheckCircle, Shield, User, Activity, Smartphone, Clock 
} from 'lucide-react'
import StudentCourseGrid from './StudentCourseGrid'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function StudentProfilePage(props: PageProps) {
  const params = await props.params
  const studentId = params.id
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 1. BUSCA DADOS DO ALUNO E COMPRAS
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', studentId).single()
  const { data: purchases } = await supabase.from('purchases').select('*').eq('user_id', studentId).eq('status', 'active')
  const { data: allProducts } = await supabase.from('products').select('*, modules(*, lessons(*))').order('created_at', { ascending: false })

  // 2. BUSCA CONFIGURAÇÃO DA I.A. (COM PROTEÇÃO CONTRA ERRO)
  const { data: configData } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'ai_config')
    .single()
  
  // LÓGICA BLINDADA: Tenta ler como Objeto ou faz Parse se for Texto
  let aiProductId = null
  try {
      const rawValue = configData?.value
      if (typeof rawValue === 'string') {
          // Se veio como texto do banco, converte para JSON
          const parsed = JSON.parse(rawValue)
          aiProductId = parsed.aiProductId
      } else if (typeof rawValue === 'object' && rawValue !== null) {
          // Se já veio como objeto JSON
          aiProductId = rawValue.aiProductId
      }
  } catch (e) {
      console.error("Erro ao ler configuração da I.A.:", e)
  }

  // Fallback: Se ainda estiver null, tenta achar um produto com nome "I.A."
  if (!aiProductId && allProducts) {
      const fallbackProduct = allProducts.find(p => 
          p.title.toLowerCase().includes('i.a. premium') || 
          p.title.toLowerCase().includes('inteligência')
      )
      if (fallbackProduct) aiProductId = fallbackProduct.id
  }

  // 3. ESTATÍSTICAS
  const { count: completedCount } = await supabase
    .from('user_lessons_completed')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', studentId)

  const { data: activityLogs } = await supabase.from('user_activity_logs').select('seconds_watched').eq('user_id', studentId)
  
  const totalHours = ((activityLogs?.reduce((acc, curr) => acc + (curr.seconds_watched || 0), 0) || 0) / 3600).toFixed(1)
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '-'
  const lastLogin = profile?.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca'

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-zinc-100 font-sans overflow-hidden selection:bg-rose-900/30">
      
      {/* SIDEBAR FIXA */}
      <aside className="w-[360px] min-w-[360px] h-full border-r border-white/5 bg-[#09090A] flex flex-col p-8 overflow-y-auto custom-scrollbar z-20 shadow-2xl">
        <Link href="/portal-gestor-x9z" className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-600 hover:text-white transition mb-10 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition"/> Voltar para Lista
        </Link>

        {/* Perfil */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-32 h-32 rounded-full bg-[#0E0E10] border-2 border-white/5 p-1.5 mb-5 relative shadow-xl">
             <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover opacity-90" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={48}/></div>
                )}
             </div>
             <div className="absolute -bottom-2 px-3 py-1 bg-green-500 rounded-full border-4 border-[#09090A] text-[9px] font-black text-black uppercase tracking-widest shadow-lg">
                ATIVO
             </div>
          </div>
          
          <h2 className="text-xl font-black text-white uppercase italic leading-tight tracking-tight mb-1">{profile?.full_name || "ALUNO"}</h2>
          <p className="text-[10px] font-bold text-zinc-500 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5">{profile?.email}</p>
        </div>

        {/* Dados Lista */}
        <div className="space-y-2 bg-[#0E0E10] border border-white/5 rounded-2xl p-4 mb-auto">
           <InfoItem icon={MapPin} label="Local" value={profile?.city || "N/A"} />
           <InfoItem icon={Calendar} label="Membro Desde" value={joinDate} />
           <InfoItem icon={Activity} label="Último Login" value={lastLogin} highlight />
           <InfoItem icon={Smartphone} label="Dispositivo" value="Desktop" />
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.2em]">ID DO USUÁRIO</p>
            <p className="text-[10px] font-mono text-zinc-500 mt-1 truncate">{studentId}</p>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar bg-[#050505] relative">
        <div className="p-10 lg:p-14 max-w-[1800px] mx-auto space-y-12">
            
            {/* Header / Stats */}
            <div>
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <Activity className="text-rose-600" /> Painel Individual
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard 
                        title="JORNADA TOTAL" 
                        value={`${totalHours}h`} 
                        sub="Horas de conteúdo assistido"
                        icon={Clock} 
                    />
                    <MetricCard 
                        title="AULAS CONCLUÍDAS" 
                        value={completedCount || 0} 
                        sub="Lições marcadas como vistas"
                        icon={CheckCircle} 
                        color="text-emerald-500"
                    />
                    <div className="bg-[#09090A] border border-white/5 rounded-[24px] p-8 flex items-center justify-between group hover:border-white/10 transition">
                        <div>
                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-2">PRODUTOS ATIVOS</p>
                            <h3 className="text-4xl font-black text-white italic tracking-tighter">{purchases?.length || 0}</h3>
                        </div>
                        <div className="h-12 w-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                            <Shield size={24}/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent" />

            {/* SEÇÃO DE CURSOS + IA */}
            <section className="w-full">
                <StudentCourseGrid 
                    studentId={studentId}
                    allProducts={allProducts}
                    purchases={purchases} 
                    aiProductId={aiProductId} // ID BLINDADO
                />
            </section>

        </div>
      </main>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] transition">
      <div className="flex items-center gap-3 text-zinc-600">
        <Icon size={14}/>
        <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-[10px] font-bold truncate max-w-[140px] ${highlight ? 'text-green-500' : 'text-zinc-300'}`}>{value}</span>
    </div>
  )
}

function MetricCard({ title, value, sub, icon: Icon, color = "text-white" }: any) {
    return (
        <div className="bg-[#09090A] border border-white/5 p-8 rounded-[24px] relative overflow-hidden group hover:border-white/10 transition duration-300 flex flex-col justify-between min-h-[160px]">
            <div className="absolute top-6 right-6 text-zinc-800 opacity-30 group-hover:opacity-50 transition scale-125">
                <Icon size={48} />
            </div>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">{title}</p>
            <div>
                <h3 className={`text-5xl font-black italic tracking-tighter mb-2 ${color}`}>{value}</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">{sub}</p>
            </div>
        </div>
    )
}