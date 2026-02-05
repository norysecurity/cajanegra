'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Heart, MessageCircle, Share2, BadgeCheck, 
  Image as ImageIcon, Video, Users, X, MoreHorizontal, Plus, Send, Loader2,
  User, Settings, LayoutDashboard, Smile, Play
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Interface para garantir tipagem correta
interface StoryUser {
    id: string;
    name: string;
    avatar: string;
    is_bot: boolean;
    stories: any[];
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [activeStory, setActiveStory] = useState<any>(null)
  
  // Lista de Usuários COM Stories (Top Bar)
  const [usersWithStories, setUsersWithStories] = useState<StoryUser[]>([])

  // Lista de Usuários ONLINE (Sidebar - Bots + Humanos Reais)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]) 
  
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [issubmitting, setIsSubmitting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  // Inputs
  const [newPostContent, setNewPostContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let presenceChannel: any;

    const initData = async () => {
        // 1. Pega usuário atual
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setUserProfile(profile)

            // 2. Configura PRESENCE (Online Real)
            presenceChannel = supabase.channel('global_presence')
            
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState()
                    const onlineHumans: any[] = []
                    
                    // Converte o estado do presence em lista de usuários
                    for (const id in state) {
                        const userState = state[id][0] as any
                        // Não adiciona a si mesmo na lista de "outros online" se não quiser
                        if (userState && userState.id !== user.id) {
                            onlineHumans.push({
                                id: userState.id,
                                name: userState.name,
                                avatar: userState.avatar,
                                is_bot: false
                            })
                        }
                    }
                    updateOnlineList(onlineHumans)
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED' && profile) {
                        await presenceChannel.track({
                            id: profile.id,
                            name: profile.full_name,
                            avatar: profile.avatar_url,
                            online_at: new Date().toISOString(),
                        })
                    }
                })
        }

        // 3. Carrega dados iniciais
        await loadPosts()
        await loadStories()
        // Carrega bots inicialmente para compor a lista online
        updateOnlineList([]) 
        setLoading(false)
    }

    initData()

    // 4. Listeners para Atualização em Tempo Real do Banco (Backup do Reload Manual)
    const dbChannel = supabase
      .channel('community_db_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => loadStories())
      .subscribe()

    return () => { 
        if (presenceChannel) supabase.removeChannel(presenceChannel)
        supabase.removeChannel(dbChannel) 
    }
  }, [])

  // Função auxiliar para misturar Bots (sempre online) com Humanos (online via presence)
  async function updateOnlineList(realHumans: any[]) {
      const { data: bots } = await supabase.from('bot_profiles').select('id, name, avatar_url').limit(15)
      const formattedBots = (bots || []).map(b => ({ ...b, is_bot: true }))
      
      // Lista final = Bots + Humanos detectados pelo Presence
      setOnlineUsers([...formattedBots, ...realHumans])
  }

  async function loadPosts() {
      const { data: postsData } = await supabase
          .from('social_posts')
          .select(`*, profiles ( full_name, avatar_url, role ), bot_profiles ( name, avatar_url )`)
          .order('created_at', { ascending: false })
      setPosts(postsData || [])
  }

  async function loadStories() {
    // Filtra stories das últimas 24 horas (Consultando a tabela corretamente com filtro de tempo)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: allStories } = await supabase
      .from('stories')
      .select(`*, bot_profiles(id, name, avatar_url), profiles(id, full_name, avatar_url)`)
      .gte('created_at', yesterday) // APENAS STORIES VÁLIDOS
      .order('created_at', { ascending: false })
    
    if (!allStories) return;

    const groupedStories = new Map<string, StoryUser>();

    allStories.forEach((story) => {
        const isBot = !!story.bot_id;
        const id = isBot ? story.bot_id : story.user_id;
        // Fallback seguro para nome e avatar
        const name = isBot ? story.bot_profiles?.name : (story.profiles?.full_name || 'Usuário');
        const avatar = isBot ? story.bot_profiles?.avatar_url : story.profiles?.avatar_url;

        if (id) {
            if (!groupedStories.has(id)) {
                groupedStories.set(id, { id, name, avatar, is_bot: isBot, stories: [] });
            }
            groupedStories.get(id)?.stories.push(story);
        }
    });

    setUsersWithStories(Array.from(groupedStories.values()));
  }

  // --- LÓGICA DE UPLOAD E POSTAGEM ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      const isVideo = file.type.startsWith('video/')
      setMediaType(isVideo ? 'video' : 'image')
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const triggerFileInput = (type: 'image' | 'video') => {
    if (fileInputRef.current) {
        fileInputRef.current.accept = type === 'video' ? "video/*" : "image/*"
        fileInputRef.current.click()
    }
  }

  async function handleCreatePost() {
    if (!newPostContent.trim() && !selectedFile) return
    setIsSubmitting(true)
    try {
      let mediaUrl = ''
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from('community-media').upload(fileName, selectedFile)
        if (uploadError) throw uploadError
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName)
          mediaUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('social_posts').insert({
        user_id: userProfile.id,
        content: newPostContent,
        image_url: mediaUrl,
        likes_count: 0
      })
      
      if (error) throw error

      // ATUALIZAÇÃO IMEDIATA
      await loadPosts()
      
      setNewPostContent('')
      setSelectedFile(null)
      setPreviewUrl(null)
      setMediaType(null)

    } catch (e) { 
        console.error(e)
        alert("Erro ao postar. Verifique sua conexão.") 
    } finally { 
        setIsSubmitting(false) 
    }
  }

  // --- POSTAR STORY (ATUALIZAÇÃO IMEDIATA) ---
  async function handlePostStory(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setIsSubmitting(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `story-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('community-media').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName)
      
      const { error: insertError } = await supabase.from('stories').insert({
        user_id: userProfile.id,
        media_url: urlData.publicUrl
      })

      if (insertError) throw insertError

      // ATUALIZAÇÃO IMEDIATA: Garante que aparece na barra na hora
      await loadStories() 
      
    } catch (e) { 
      console.error(e)
      alert("Erro ao postar story.") 
    } finally { 
      setIsSubmitting(false)
      if (storyInputRef.current) storyInputRef.current.value = ''
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

  const isVideoUrl = (url: string) => {
    if (!url) return false
    return url.match(/\.(mp4|webm|ogg|mov)$/i)
  }

  const SafeAvatar = ({ src, className }: any) => {
      const isValid = src && (src.startsWith('http') || src.startsWith('/'))
      return isValid ? <img src={src} className={className} alt="" /> : <div className={`${className} flex items-center justify-center bg-zinc-800 text-zinc-500`}><Users size={14} /></div>
  }

  const myUserStory = usersWithStories.find(u => u.id === userProfile?.id)
  const hasMyStory = !!myUserStory

  if (loading) return <div className="min-h-screen bg-[#000000] flex items-center justify-center text-rose-600 font-black italic animate-pulse tracking-tighter">CARREGANDO...</div>

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 notranslate pb-20 overflow-x-hidden font-sans" translate="no">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="w-9 h-9 rounded-full overflow-hidden border border-white/10 active:scale-90 transition">
                <SafeAvatar src={userProfile?.avatar_url} className="w-full h-full object-cover" />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tighter italic">Feed</h1>
        </div>
        <div className="flex items-center gap-4">
             <Link href="/app/chat" className="relative">
                <MessageCircle size={24} className="text-white"/>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-black"></span>
             </Link>
        </div>
      </div>

      {/* MENU LATERAL */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-full w-4/5 max-w-sm bg-[#0F0F10] z-[110] border-r border-white/10 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <SafeAvatar src={userProfile?.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-rose-500" />
                        <div>
                            <p className="font-bold text-white">{userProfile?.full_name}</p>
                            <p className="text-xs text-zinc-500">Online</p>
                        </div>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)}><X size={20}/></button>
                </div>
                <nav className="flex-1 space-y-4">
                    <Link href="/app/profile" className="flex items-center gap-3 text-zinc-300 font-medium"><User size={20}/> Perfil</Link>
                    <Link href="/app/dashboard" className="flex items-center gap-3 text-zinc-300 font-medium"><LayoutDashboard size={20}/> Dashboard</Link>
                    <Link href="/app/settings" className="flex items-center gap-3 text-zinc-300 font-medium"><Settings size={20}/> Configurações</Link>
                </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto md:px-4 py-4 md:py-8 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* COLUNA ESQUERDA - MENU DESKTOP */}
        <aside className="hidden md:block col-span-1">
             <div className="sticky top-24 space-y-6">
                 <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition cursor-pointer" onClick={() => router.push('/app/profile')}>
                     <SafeAvatar src={userProfile?.avatar_url} className="w-14 h-14 rounded-full border border-white/10 object-cover" />
                     <div>
                         <p className="font-bold text-white text-sm">{userProfile?.full_name}</p>
                         <p className="text-zinc-500 text-xs">@{userProfile?.full_name?.split(' ')[0].toLowerCase()}</p>
                     </div>
                 </div>

                 <nav className="space-y-2 px-2">
                     <Link href="/app/dashboard" className="flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-medium text-sm">
                         <LayoutDashboard size={22}/> Feed Principal
                     </Link>
                     <Link href="/app/chat" className="flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-medium text-sm">
                         <MessageCircle size={22}/> Mensagens
                     </Link>
                     <Link href="/app/saved" className="flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-medium text-sm">
                         <BadgeCheck size={22}/> Salvos
                     </Link>
                 </nav>
             </div>
        </aside>

        {/* FEED CENTRAL */}
        <main className="col-span-1 md:col-span-2 space-y-6">
            
            {/* 1. CARROSSEL DE STORIES (CONSULTANDO TABELA CORRETA + FILTRO TEMPO) */}
            <div className="bg-[#0F0F10] md:bg-transparent md:border-none border-b border-white/10 pb-4 pt-2 md:pt-0">
                 <div className="overflow-x-auto custom-scrollbar flex gap-4 px-4 md:px-0">
                    
                    {/* MEU STORY (Fixo no início) */}
                    <div className="flex flex-col items-center gap-1 min-w-[70px] group relative">
                        <div className="relative w-[68px] h-[68px]">
                             <div 
                                onClick={() => hasMyStory ? setActiveStory({ user: myUserStory, stories: myUserStory?.stories, index: 0 }) : storyInputRef.current?.click()}
                                className={`w-full h-full rounded-full p-[2px] cursor-pointer transition ${hasMyStory ? 'bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600' : 'border-2 border-zinc-700 border-dashed hover:border-zinc-500'}`}
                             >
                                 <div className="w-full h-full rounded-full border-2 border-black bg-zinc-800 overflow-hidden">
                                     <SafeAvatar src={userProfile?.avatar_url} className="w-full h-full object-cover opacity-90" />
                                 </div>
                             </div>

                             <div 
                                onClick={(e) => { e.stopPropagation(); storyInputRef.current?.click(); }}
                                className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center border-2 border-black cursor-pointer transition z-10"
                             >
                                 {issubmitting ? <Loader2 size={12} className="animate-spin text-white"/> : <Plus size={14} className="text-white"/>}
                             </div>
                             <input ref={storyInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handlePostStory} disabled={issubmitting} />
                        </div>
                        <span className="text-xs text-zinc-400">Seu story</span>
                    </div>

                    {/* Lista de Stories */}
                    {usersWithStories.map((u) => {
                         if (u.id === userProfile?.id) return null; 
                         return (
                            <div key={u.id} onClick={() => setActiveStory({ user: u, stories: u.stories, index: 0 })} className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group">
                                <div className="w-[68px] h-[68px] rounded-full p-[2px] bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 transform transition group-hover:scale-105">
                                    <div className="w-full h-full rounded-full border-2 border-black bg-black p-0.5">
                                        <SafeAvatar src={u.avatar} className="w-full h-full rounded-full object-cover" />
                                    </div>
                                </div>
                                <span className="text-xs text-zinc-300 w-16 truncate text-center">{u.name?.split(' ')[0]}</span>
                            </div>
                         )
                    })}
                 </div>
            </div>

            {/* 2. ÁREA DE CRIAÇÃO DE POST */}
            <div className="bg-[#121214] border border-white/5 md:rounded-2xl p-4">
                <div className="flex gap-4">
                    <SafeAvatar src={userProfile?.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                        <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full bg-transparent text-zinc-200 placeholder:text-zinc-600 text-sm resize-none focus:outline-none min-h-[60px]" placeholder={`No que você está pensando, ${userProfile?.full_name?.split(' ')[0]}?`} />
                        {previewUrl && (
                          <div className="relative mt-3 rounded-xl overflow-hidden bg-black border border-white/10 max-h-[300px]">
                             <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); setMediaType(null) }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full z-10 text-white hover:bg-rose-600 transition"><X size={16}/></button>
                             {mediaType === 'video' ? <video src={previewUrl} controls className="w-full h-full object-contain bg-black" /> : <img src={previewUrl} className="w-full h-full object-contain" alt="preview" />}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                            <div className="flex gap-4">
                                <button onClick={() => triggerFileInput('image')} className="text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-full transition flex items-center gap-2"><ImageIcon size={20}/></button>
                                <button onClick={() => triggerFileInput('video')} className="text-blue-500 hover:bg-blue-500/10 p-2 rounded-full transition flex items-center gap-2"><Video size={20}/></button>
                                <button className="text-yellow-500 hover:bg-yellow-500/10 p-2 rounded-full transition hidden sm:block"><Smile size={20}/></button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            </div>
                            <button onClick={handleCreatePost} disabled={issubmitting || (!newPostContent.trim() && !selectedFile)} className={`px-6 py-2 rounded-full font-bold text-sm transition ${(!newPostContent.trim() && !selectedFile) ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}>{issubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Publicar'}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. FEED DE POSTS */}
            <div className="space-y-4">
                {posts.map((post) => (
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={post.id} className="bg-[#121214] border border-white/5 md:rounded-2xl overflow-hidden">
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex gap-3 items-center cursor-pointer" onClick={() => handleStartChat(post.bot_id || post.user_id, !!post.bot_id)}>
                                <div className="relative">
                                    <SafeAvatar src={post.bot_profiles?.avatar_url || post.profiles?.avatar_url} className="w-10 h-10 rounded-full object-cover border border-white/5" />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#121214] rounded-full"></div>
                                </div>
                                <div className="leading-tight">
                                    <p className="font-bold text-white text-sm hover:underline">{post.bot_profiles?.name || post.profiles?.full_name}</p>
                                    <p className="text-[11px] text-zinc-500">{new Date(post.created_at).toLocaleDateString()} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <button className="text-zinc-500 hover:text-white"><MoreHorizontal size={20}/></button>
                        </div>
                        {post.content && <div className="px-4 pb-3 text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</div>}
                        {post.image_url && <div className="w-full bg-black flex justify-center items-center max-h-[600px] overflow-hidden">{isVideoUrl(post.image_url) ? <video src={post.image_url} controls className="w-full max-h-[600px] object-contain" /> : <img src={post.image_url} className="w-full max-h-[600px] object-cover" alt="post content" />}</div>}
                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex gap-4"><button onClick={() => handleLike(post.id)} className="group flex items-center gap-1"><Heart size={24} className={`transition ${likedPosts.includes(post.id) ? 'fill-rose-500 text-rose-500' : 'text-white group-hover:text-zinc-300'}`} /></button><button className="text-white hover:text-zinc-300"><MessageCircle size={24}/></button><button className="text-white hover:text-zinc-300"><Share2 size={24}/></button></div>
                                <button className="text-white hover:text-zinc-300"><BadgeCheck size={24}/></button>
                            </div>
                            <p className="text-sm font-bold text-white mb-1">{post.likes_count || 0} curtidas</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </main>

        {/* COLUNA DIREITA - ONLINE AGORA (REALTIME + BOTS) */}
        <aside className="hidden md:block col-span-1">
            <div className="sticky top-24">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-zinc-400 font-bold text-sm">Online Agora</h3>
                    <span className="text-xs text-zinc-600">Ver tudo</span>
                </div>
                
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-2 space-y-1">
                    {onlineUsers.length > 0 ? onlineUsers.slice(0, 8).map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition" onClick={() => handleStartChat(u.id, u.is_bot)}>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <SafeAvatar src={u.avatar} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121214] rounded-full animate-pulse"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-200 group-hover:text-white">{u.name?.split(' ')[0]}</span>
                                    <span className="text-[10px] text-emerald-500 font-medium">Ativo agora</span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition text-zinc-400 hover:text-rose-500"><MessageCircle size={18} /></div>
                        </div>
                    )) : (
                        <div className="p-4 text-center text-xs text-zinc-600 italic">Ninguém online no momento</div>
                    )}
                </div>

                <div className="mt-8 text-[11px] text-zinc-600 leading-relaxed px-2">
                    © 2026 SOCIAL CLUB FROM CAJANEGRA <br/>
                    Privacidade • Termos • Publicidade • Cookies
                </div>
            </div>
        </aside>

      </div>
      
      {/* VISUALIZADOR DE STORIES */}
      <AnimatePresence>
        {activeStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-8 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SafeAvatar src={activeStory.user.avatar || activeStory.stories[activeStory.index].bot_profiles?.avatar_url} className="w-10 h-10 rounded-full border border-white/20" />
                    <div><p className="text-white font-bold text-sm shadow-sm">{activeStory.user.name}</p><p className="text-white/60 text-xs">Story Recente</p></div>
                </div>
                <button onClick={() => setActiveStory(null)} className="p-2 bg-white/10 rounded-full backdrop-blur-md text-white hover:bg-white/20"><X size={24}/></button>
            </div>
            <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative w-full h-full max-w-lg md:aspect-[9/16] md:h-auto md:rounded-2xl overflow-hidden flex items-center bg-black">
                    {isVideoUrl(activeStory.stories[activeStory.index].media_url) ? 
                         <video src={activeStory.stories[activeStory.index].media_url} autoPlay className="w-full h-full object-contain" onEnded={() => setActiveStory(null)}/> : 
                         <img src={activeStory.stories[activeStory.index].media_url} className="w-full h-full object-contain" alt="" />
                    }
                    <div className="absolute top-2 left-2 right-2 flex gap-1 z-30">
                        {activeStory.stories.map((_:any, i:number) => (
                            <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: i === activeStory.index ? '100%' : (i < activeStory.index ? '100%' : '0%') }} transition={{ duration: 5, ease: 'linear' }} className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"/>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}