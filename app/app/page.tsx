import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutGrid, Home } from 'lucide-react'
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

  // Processamento IA
  let aiSettings = { salesLink: '#', modalTitle: 'I.A. Premium', buttonText: 'LIBERAR ACESSO' }
  if (aiConfigRes.data?.value) {
    try { aiSettings = { ...aiSettings, ...JSON.parse(aiConfigRes.data.value) } } catch (e) {}
  }
  const aiAccess = await checkAIAccess() 

  // Processamento Banners (Chave: home_banners conforme seu banco)
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
        
        {/* BOTÃO HOME DISCRETO */}
        <div className="absolute top-6 left-6 z-50">
            <div className="w-12 h-12 bg-zinc-900/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                <Home size={22} className="text-white/80" />
            </div>
        </div>

        {/* SEÇÃO DO BANNER (DESIGN LIMPO) */}
        <section className="w-full">
          <HeroBanner banners={bannersData} />
        </section>

        <div className="max-w-[1500px] mx-auto px-6 md:px-12 mt-12 space-y-16">
          
          {/* GRID DE CURSOS */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <LayoutGrid className="text-rose-600" size={24} /> Meus Treinamentos
                </h2>
                <div className="h-1 w-12 bg-rose-600 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {productsRes.data?.map((product) => (
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
        </div>

        {/* CHAT I.A. */}
        <IaraChat isUnlocked={aiAccess.allowed} aiSettings={aiSettings} />
      </main>
    </div>
  )
}