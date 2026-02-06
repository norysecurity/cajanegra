import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutGrid, Home, Bot, Users, GraduationCap } from 'lucide-react'
import CourseCard from './CourseCard'
import HeroBanner from './HeroBanner'
import IaraChat from '@/components/IaraChat'
import { checkAIAccess } from '@/app/portal-gestor-x9z/actions' 

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // --- BUSCA DE DADOS EM PARALELO ---
  const [aiConfigRes, bannerRes, productsRes, purchasesRes, savedRes] = await Promise.all([
    supabase.from('site_config').select('value').eq('key', 'ai_config').maybeSingle(),
    supabase.from('site_config').select('value').eq('key', 'home_banners').maybeSingle(),
    supabase.from('products').select(`*, modules(id, lessons(id, user_lessons_completed(user_id)))`).order('created_at', { ascending: false }),
    supabase.from('purchases').select('product_id').eq('user_id', user.id).eq('status', 'active'),
    supabase.from('user_saved_products').select('product_id').eq('user_id', user.id)
  ])

  // --- LÓGICA DE SEPARAÇÃO (FILTRO) ---
  const allProducts = productsRes.data || []

  // 1. Filtra I.A.
  const aiProducts = allProducts.filter(p => {
    const title = p.title.toLowerCase()
    return title.includes('i.a.') || title.includes('ai ') || title.includes('inteligência') || title.includes('chat')
  })

  // 2. Filtra Comunidade
  const communityProducts = allProducts.filter(p => {
    const title = p.title.toLowerCase()
    return title.includes('comunidade') || title.includes('social') || title.includes('vip') || title.includes('networking')
  })

  // 3. Filtra Cursos
  const courseProducts = allProducts.filter(p => {
    const isAI = aiProducts.some(ai => ai.id === p.id)
    const isCommunity = communityProducts.some(c => c.id === p.id)
    return !isAI && !isCommunity
  })

  // Processamento IA e Banners
  let aiSettings = { salesLink: '#', modalTitle: 'I.A. Premium', buttonText: 'LIBERAR ACESSO' }
  if (aiConfigRes.data?.value) {
    try { aiSettings = { ...aiSettings, ...JSON.parse(aiConfigRes.data.value) } } catch (e) {}
  }
  const aiAccess = await checkAIAccess() 

  let bannersData = []
  if (bannerRes.data?.value) {
    try { 
      const parsed = JSON.parse(bannerRes.data.value)
      bannersData = Array.isArray(parsed) ? parsed : [parsed]
    } catch (e) {}
  }

  const purchasedIds = purchasesRes.data?.map(p => p.product_id) || []
  const savedIds = savedRes.data?.map(p => p.product_id) || []

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-900/30">
      
      <main className="relative pb-32">
        
        {/* REMOVIDO: O ÍCONE HOME FLUTUANTE FOI RETIRADO DAQUI */}

        {/* SEÇÃO DO BANNER */}
        <section className="w-full">
          <HeroBanner banners={bannersData} />
        </section>

        <div className="max-w-[1500px] mx-auto px-6 md:px-12 mt-10 space-y-12">
          
          {/* --- SEÇÃO 1: CURSOS (Treinamentos) --- */}
          {courseProducts.length > 0 && (
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                <div className="space-y-1">
                    {/* FONTE REDUZIDA: text-lg md:text-2xl */}
                    <h2 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                    <GraduationCap className="text-rose-600" size={24} /> Meus Treinamentos
                    </h2>
                    <div className="h-0.5 w-8 bg-rose-600 rounded-full" />
                </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {courseProducts.map((product) => (
                    <CourseCard 
                    key={product.id} 
                    product={product} 
                    purchasedIds={purchasedIds} 
                    completedIds={[]} 
                    savedIds={savedIds} 
                    />
                ))}
                </div>
            </section>
          )}

          {/* --- SEÇÃO 2: FERRAMENTAS & I.A. --- */}
          {aiProducts.length > 0 && (
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-blue-400">
                    <Bot className="text-blue-500" size={24} /> Inteligência Artificial
                    </h2>
                    <div className="h-0.5 w-8 bg-blue-500 rounded-full" />
                </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {aiProducts.map((product) => (
                    <CourseCard 
                    key={product.id} 
                    product={product} 
                    purchasedIds={purchasedIds} 
                    completedIds={[]} 
                    savedIds={savedIds} 
                    />
                ))}
                </div>
            </section>
          )}

          {/* --- SEÇÃO 3: COMUNIDADE --- */}
          {communityProducts.length > 0 && (
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-green-400">
                    <Users className="text-green-500" size={24} /> Comunidade & Networking
                    </h2>
                    <div className="h-0.5 w-8 bg-green-500 rounded-full" />
                </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {communityProducts.map((product) => (
                    <CourseCard 
                    key={product.id} 
                    product={product} 
                    purchasedIds={purchasedIds} 
                    completedIds={[]} 
                    savedIds={savedIds} 
                    />
                ))}
                </div>
            </section>
          )}

        </div>

        {/* CHAT I.A. */}
        <IaraChat isUnlocked={aiAccess.allowed} aiSettings={aiSettings} />
      </main>
    </div>
  )
}