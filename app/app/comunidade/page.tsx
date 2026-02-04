'use client'

import { useState, useEffect } from 'react'
import { 
  Heart, MessageCircle, Share2, BadgeCheck, 
  Image as ImageIcon, Users, X, Zap, Crown, Search, MoreHorizontal, Plus, Send, Loader2,
  User, Settings, LogOut, LayoutDashboard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [mixedUsers, setMixedUsers] = useState<any[]>([]) 
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [issubmitting, setIsSubmitting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // Estado para o menu lateral
  
  // ESTADOS DE STORIES
  const [stories, setStories] = useState<any[]>([])
  const [activeStory, setActiveStory] = useState<any>(null)
  
  // ESTADO DE NOVA POSTAGEM
  const [newPostContent, setNewPostContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadFullData()

    const channel = supabase
      .channel('community_main_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => loadFullData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => fetchStories())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadFullData() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setUserProfile(profile)
        }

        const { data: postsData } = await supabase
          .from('social_posts')
          .select(`*, profiles ( full_name, avatar_url, role ), bot_profiles ( name, avatar_url )`)
          .order('created_at', { ascending: false })

        setPosts(postsData || [])
        await fetchStories()

        const { data: humans } = await supabase.from('profiles').select('id, full_name, avatar_url').limit(10)
        const { data: bots } = await supabase.from('bot_profiles').select('id, name, avatar_url').limit(15)

        const allUsers = [
            ...(bots || []).map(b => ({ ...b, is_bot: true })),
            ...(humans || []).map(h => ({ id: h.id, name: h.full_name, avatar: h.avatar_url, is_bot: false }))
        ].sort(() => Math.random() - 0.5)

        setMixedUsers(allUsers)
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  async function fetchStories() {
    const { data } = await supabase
      .from('stories')
      .select(`*, bot_profiles(name, avatar_url), profiles(full_name, avatar_url)`)
      .order('created_at', { ascending: false })
    setStories(data || [])
  }

  // --- LÓGICA DE UPLOAD E POSTAGEM ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  async function handleCreatePost() {
    if (!newPostContent.trim() && !selectedFile) return
    setIsSubmitting(true)
    try {
      let imageUrl = ''
      if (selectedFile) {
        const fileName = `${Date.now()}-${selectedFile.name}`
        const { data: uploadData } = await supabase.storage.from('community-media').upload(fileName, selectedFile)
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName)
          imageUrl = urlData.publicUrl
        }
      }
      await supabase.from('social_posts').insert({
        user_id: userProfile.id,
        content: newPostContent,
        image_url: imageUrl,
        likes_count: 0
      })
      setNewPostContent(''); setSelectedFile(null); setPreviewUrl(null);
    } catch (e) { alert("Erro ao postar") } finally { setIsSubmitting(false) }
  }

  // --- POSTAR STORY ---
  async function handlePostStory(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setIsSubmitting(true)
      try {
        const fileName = `story-${Date.now()}-${file.name}`
        const { data: uploadData } = await supabase.storage.from('community-media').upload(fileName, file)
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName)
          await supabase.from('stories').insert({
            user_id: userProfile.id,
            media_url: urlData.publicUrl
          })
          alert("Story publicado com sucesso!")
        }
      } catch (e) { alert("Erro ao postar story") } finally { setIsSubmitting(false) }
    }
  }

  const handleLike = async (postId: string) => {
    const isLiking = !likedPosts.includes(postId)
    setLikedPosts(prev => isLiking ? [...prev, postId] : prev.filter(id => id !== postId))
    const currentPost = posts.find(p => p.id === postId)
    await supabase.from('social_posts').update({ 
      likes_count: isLiking ? (currentPost.likes_count || 0) + 1 : Math.max(0, (currentPost.likes_count || 0) - 1) 
    }).eq('id', postId)
  }

  const handleStartChat = (targetId: string, isBot: boolean) => {
    router.push(`/app/chat/direct/${targetId}?type=${isBot ? 'bot' : 'user'}`)
  }

  const SafeAvatar = ({ src, className }: any) => {
      const isValid = src && (src.startsWith('http') || src.startsWith('/'))
      return isValid ? <img src={src} className={className} alt="" /> : <div className={`${className} flex items-center justify-center bg-zinc-800 text-zinc-500`}><Users size={14} /></div>
  }

  if (loading) return <div className="min-h-screen bg-[#18181B] flex items-center justify-center text-rose-500 font-black italic animate-pulse tracking-tighter">CARREGANDO...</div>

  return (
    <div className="min-h-screen bg-[#18181B] text-zinc-100 notranslate pb-20 overflow-x-hidden" translate="no">
      
      {/* MOBILE HEADER - FOTO LADO ESQUERDO ABRE MENU */}
      <div className="md:hidden sticky top-0 z-50 bg-[#18181B]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="w-9 h-9 rounded-full overflow-hidden border border-white/10 active:scale-90 transition">
                <SafeAvatar src={userProfile?.avatar_url} className="w-full h-full object-cover" />
            </button>
            <h1 className="text-lg font-black italic text-white uppercase tracking-tighter">Social Club</h1>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-[10px] font-bold text-zinc-300">LIVE</span>
        </div>
      </div>

      {/* MENU LATERAL (SIDEBAR) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-full w-4/5 max-w-sm bg-[#0F0F10] z-[110] border-r border-white/5 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-0.5 shadow-lg shadow-rose-500/20">
                            <SafeAvatar src={userProfile?.avatar_url} className="w-full h-full rounded-2xl object-cover border-2 border-[#0F0F10]" />
                        </div>
                        <div>
                            <p className="font-black text-white uppercase tracking-tighter">{userProfile?.full_name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">Membro VIP</p>
                        </div>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 text-zinc-500"><X size={20}/></button>
                </div>

                <nav className="flex-1 space-y-2">
                    <Link href="/app/profile" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-zinc-400 hover:text-white">
                        <User size={20} className="group-hover:text-rose-500"/> <span className="font-bold text-sm uppercase">Meu Perfil</span>
                    </Link>
                    <Link href="/app/dashboard" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-zinc-400 hover:text-white">
                        <LayoutDashboard size={20} className="group-hover:text-rose-500"/> <span className="font-bold text-sm uppercase">Painel Aluno</span>
                    </Link>
                    <Link href="/app/settings" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition group text-zinc-400 hover:text-white">
                        <Settings size={20} className="group-hover:text-rose-500"/> <span className="font-bold text-sm uppercase">Configurações</span>
                    </Link>
                </nav>

                <button className="flex items-center gap-4 p-4 rounded-2xl text-rose-500 font-black uppercase text-sm tracking-widest mt-auto border border-rose-500/20 hover:bg-rose-500/10 transition">
                    <LogOut size={20}/> Sair da Conta
                </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto md:px-4 py-4 md:py-6 grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* COLUNA ESQUERDA (DESKTOP) */}
        <aside className="hidden md:block col-span-1">
          <div className="bg-[#0F0F10] border border-white/5 rounded-3xl p-6 sticky top-24 text-center shadow-xl">
             <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-rose-500 to-purple-600">
                    <SafeAvatar src={userProfile?.avatar_url} className="w-full h-full rounded-full object-cover border-4 border-[#0F0F10]" />
                </div>
                <div className="absolute bottom-1 right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-[#0F0F10]"></div>
             </div>
             <h3 className="text-white font-bold text-lg">{userProfile?.full_name || 'Usuário'}</h3>
             <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-1">Membro Oficial</p>
             <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-2 text-left">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest italic">Info Conta</p>
                <div className="flex justify-between text-[11px] font-bold py-1 text-zinc-400"><span>Seguindo</span> <span className="text-white">142</span></div>
                <div className="flex justify-between text-[11px] font-bold py-1 text-zinc-400"><span>Seguidores</span> <span className="text-white">840</span></div>
                <button onClick={() => router.push('/app/profile')} className="w-full mt-4 bg-zinc-900 border border-white/5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition">Editar Perfil</button>
             </div>
          </div>
        </aside>

        {/* FEED CENTRAL */}
        <main className="col-span-1 md:col-span-2">
            
            {/* STORIES - INTEGRADO COM VISUALIZADOR */}
            <div className="mb-8 overflow-x-auto custom-scrollbar flex gap-4 pb-2 px-4 md:px-0">
                <label className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-600 p-1 flex items-center justify-center relative hover:border-rose-500 transition group overflow-hidden">
                        <div className="bg-zinc-800 w-full h-full rounded-full flex items-center justify-center group-hover:scale-110 transition">
                            {issubmitting ? <Loader2 size={24} className="animate-spin text-rose-500"/> : <Plus size={24} className="text-white"/>}
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handlePostStory} disabled={issubmitting} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Meu Story</span>
                </label>

                {mixedUsers.map((u) => {
                    const userStories = stories.filter(s => s.bot_id === u.id || s.user_id === u.id);
                    const hasStory = userStories.length > 0;
                    return (
                        <div key={u.id} 
                             onClick={() => hasStory ? setActiveStory({ user: u, stories: userStories, index: 0 }) : handleStartChat(u.id, u.is_bot)} 
                             className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer group">
                            <div className={`w-16 h-16 rounded-full p-0.5 relative transition border-2 ${hasStory ? 'border-rose-600 p-[3px]' : 'border-zinc-800'}`}>
                                <SafeAvatar src={u.avatar} className="w-full h-full rounded-full object-cover bg-zinc-800" />
                            </div>
                            <span className={`text-[10px] truncate w-16 text-center font-bold uppercase ${hasStory ? 'text-rose-500' : 'text-zinc-400'}`}>{u.name?.split(' ')[0]}</span>
                        </div>
                    )
                })}
            </div>

            {/* INPUT POSTAR FEED */}
            <div className="bg-[#0F0F10] border border-white/5 rounded-3xl p-5 mb-8 shadow-sm">
                <div className="flex gap-4">
                    <SafeAvatar src={userProfile?.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                        <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm text-zinc-300 placeholder:text-zinc-600 resize-none h-20" placeholder="No que você está pensando?" />
                        {previewUrl && (
                          <div className="relative w-full h-40 mb-4 rounded-2xl overflow-hidden border border-white/10">
                            <img src={previewUrl} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => { setSelectedFile(null); setPreviewUrl(null) }} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full"><X size={14}/></button>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <label className="flex items-center gap-2 text-zinc-500 hover:text-white cursor-pointer transition">
                                <ImageIcon size={18} /> <span className="text-[10px] font-bold uppercase tracking-widest">Mídia</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            <button onClick={handleCreatePost} disabled={issubmitting} className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2">
                              {issubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Postar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* FEED */}
            <div className="space-y-6 px-4 md:px-0">
                {posts.map((post) => (
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} key={post.id} className="bg-[#0F0F10] border border-white/5 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 flex justify-between items-start">
                            <div className="flex gap-3">
                                <div className="w-11 h-11 rounded-full p-0.5 bg-zinc-800 cursor-pointer" onClick={() => handleStartChat(post.bot_id || post.user_id, !!post.bot_id)}>
                                    <SafeAvatar src={post.bot_profiles?.avatar_url || post.profiles?.avatar_url} className="w-full h-full rounded-full object-cover" />
                                </div>
                                <div>
                                    <span className="font-bold text-white text-sm italic uppercase tracking-tighter">{post.bot_profiles?.name || post.profiles?.full_name}</span>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase">{new Date(post.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 pb-4 text-zinc-300 text-sm leading-relaxed whitespace-pre-line font-medium">{post.content}</div>
                        {post.image_url && <img src={post.image_url} className="w-full h-auto object-cover max-h-[500px] border-y border-white/5" alt="" />}
                        <div className="px-5 py-4 flex items-center gap-6 bg-white/[0.01]">
                            <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition ${likedPosts.includes(post.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-white'}`}>
                              <Heart size={18} className={likedPosts.includes(post.id) ? 'fill-current' : ''} /> {post.likes_count || 0}
                            </button>
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition"><MessageCircle size={18}/> Comentar</button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </main>

        {/* COLUNA DIREITA (DESKTOP) */}
        <aside className="hidden md:block col-span-1">
            <div className="bg-[#0F0F10] border border-white/5 rounded-3xl p-6 sticky top-24 shadow-xl">
                <h3 className="text-white font-black text-xs uppercase tracking-widest italic mb-6">Sugestões VIP</h3>
                <div className="space-y-4">
                    {mixedUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between group cursor-pointer" onClick={() => handleStartChat(u.id, u.is_bot)}>
                            <div className="flex items-center gap-3">
                                <SafeAvatar src={u.avatar} className="w-9 h-9 rounded-full object-cover bg-zinc-800" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-zinc-200 text-xs font-bold truncate group-hover:text-rose-500 transition-colors uppercase italic">{u.name}</span>
                                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter italic">Online</span>
                                </div>
                            </div>
                            <button className="text-[8px] font-black uppercase tracking-widest text-zinc-500 border border-white/5 px-2 py-1 rounded-lg">Bate-Papo</button>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
      </div>
      
      {/* VISUALIZADOR DE STORY ESTILO INSTAGRAM */}
      <AnimatePresence>
        {activeStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 p-4">
            <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-rose-500 p-0.5">
                    <SafeAvatar src={activeStory.user.avatar || activeStory.stories[activeStory.index].bot_profiles?.avatar_url} className="w-full h-full rounded-full object-cover" />
                </div>
                <p className="text-white font-black italic uppercase text-sm tracking-widest">{activeStory.user.name}</p>
            </div>
            <button onClick={() => setActiveStory(null)} className="absolute top-8 right-8 text-white z-[210] p-2 hover:bg-white/10 rounded-full transition"><X size={32}/></button>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <img src={activeStory.stories[activeStory.index].media_url} className="w-full h-full object-cover" alt="" />
                {/* Barra de progresso do Story */}
                <div className="absolute top-4 left-4 right-4 flex gap-1">
                    {activeStory.stories.map((_:any, i:number) => (
                        <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: i === activeStory.index ? '100%' : (i < activeStory.index ? '100%' : '0%') }} transition={{ duration: 5, ease: 'linear' }} className="h-full bg-white"/>
                        </div>
                    ))}
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}