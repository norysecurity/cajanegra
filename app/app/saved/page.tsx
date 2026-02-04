import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Bookmark, Play } from 'lucide-react'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Debug: Busca simples para ver se tem algo
  const { data: rawData, error } = await supabase
    .from('user_saved_products')
    .select(`
      product_id,
      products (
        id, title, image_url, 
        modules (id, lessons (id))
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error("Erro ao carregar salvos:", error)
  }

  return (
    <div className="min-h-screen bg-[#0F0F10] text-zinc-100 p-8 md:pl-28">
      <header className="flex items-center gap-4 mb-10">
        <Link href="/app" className="p-2 bg-zinc-900 rounded-full hover:bg-white hover:text-black transition">
          <ChevronLeft size={20} />
        </Link>
        <div>
           <h1 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
             <Bookmark className="text-rose-500" /> Meus Favoritos
           </h1>
           <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
             {rawData?.length || 0} Cursos Salvos
           </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {rawData?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
             <Bookmark size={48} className="mb-4 text-zinc-700"/>
             <p className="text-zinc-500 text-sm uppercase font-bold tracking-widest">Sua lista está vazia.</p>
          </div>
        )}

        {rawData?.map((item: any) => {
           // Proteção contra produto deletado
           if (!item.products) return null;
           
           const firstLesson = item.products.modules?.[0]?.lessons?.[0]?.id || ''
           
           return (
            <Link key={item.product_id} href={`/app/view/${firstLesson}`} className="group block">
              <div className="aspect-video rounded-[24px] overflow-hidden border border-white/5 relative mb-4 bg-zinc-900">
                <img 
                  src={item.products.image_url || "https://via.placeholder.com/500x300"} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" 
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                   <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                      <Play size={20} fill="white" className="text-white ml-1"/>
                   </div>
                </div>
              </div>
              <h3 className="font-bold text-lg uppercase italic leading-none text-zinc-300 group-hover:text-white transition">{item.products.title}</h3>
            </Link>
           )
        })}
      </div>
    </div>
  )
}