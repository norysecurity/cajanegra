'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Heart, MessageCircle, Share2, BadgeCheck, 
  Image as ImageIcon, Video, Users, X, MoreHorizontal, Plus, Loader2,
  User, Settings, LayoutDashboard, Smile, ChevronLeft, ChevronRight, Send
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  
  // Listas
  const [usersWithStories, setUsersWithStories] = useState<StoryUser[]>([])
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]) 
  
  // Estados Gerais
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [issubmitting, setIsSubmitting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  // Inputs Post
  const [newPostContent, setNewPostContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Controle de Comentários
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  // Controle de progresso do Story
  const [progress, setProgress] = useState(0)

  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storyInputRef = useRef<HTMLInputElement>(null)

  // 1. CARREGAR LIKES
  useEffect(() => {
    const savedLikes = localStorage.getItem('user_liked_posts')
    if (savedLikes) {
        setLikedPosts(JSON.parse(savedLikes))
    }
  }, [])

  // 2. SALVAR LIKES
  useEffect(() => {
    localStorage.setItem('user_liked_posts', JSON.stringify(likedPosts))
  }, [likedPosts])

  useEffect(() => {
    let presenceChannel: any;

    const initData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        let currentProfile = null;

        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setUserProfile(profile)
            currentProfile = profile;

            // 2. Sistema de PRESENÇA ONLINE
            presenceChannel = supabase.channel('global_presence')
            
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState()
                    const onlineHumans: any[] = []
                    
                    for (const id in state) {
                        // @ts-ignore
                        const userState = state[id][0]
                        if (userState) {
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
                    if (status === 'SUBSCRIBED' && currentProfile) {
                        await presenceChannel.track({
                            id: currentProfile.id,
                            name: currentProfile.full_name,
                            avatar: currentProfile.avatar_url, 
                            online_at: new Date().toISOString(),
                        })
                    }
                })
        }

        await loadPosts()
        await loadStories()
        if (!user) updateOnlineList([]) 
        setLoading(false)
    }

    initData()

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

  // --- LÓGICA AUTOMÁTICA DOS STORIES ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeStory) {
        const currentStory = activeStory.stories[activeStory.index];
        const isVideo = isVideoUrl(currentStory.media_url);

        if (!isVideo) {
            setProgress(0);
            const duration = 5000; 
            const interval = 50; 
            let elapsed = 0;

            timer = setInterval(() => {
                elapsed += interval;
                setProgress((elapsed / duration) * 100);
                if (elapsed >= duration) {
                    handleNextStory();
                }
            }, interval);
        } else {
            setProgress(0); 
        }
    }
    return () => clearInterval(timer);
  }, [activeStory]); 

  const handleNextStory = () => {
      if (!activeStory) return;
      if (activeStory.index < activeStory.stories.length - 1) {
          setActiveStory({ ...activeStory, index: activeStory.index + 1 });
      } else {
          setActiveStory(null);
      }
  };

  const handlePrevStory = () => {
      if (!activeStory) return;
      if (activeStory.index > 0) {
          setActiveStory({ ...activeStory, index: activeStory.index - 1 });
      } else {
          setActiveStory({ ...activeStory, index: 0 });
      }
  };

  async function updateOnlineList(realHumans: any[]) {
      const { data: bots } = await supabase.from('bot_profiles').select('id, name, avatar_url').limit(15)
      const formattedBots = (bots || []).map(b => ({ ...b, is_bot: true }))
      const uniqueHumans = realHumans
          .filter(h => h.id)
          .filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i)
      setOnlineUsers([...formattedBots, ...uniqueHumans])
  }

  // --- CARREGAMENTO DE POSTS (ROLLBACK PARA VERSÃO SEGURA) ---
  async function loadPosts() {
      // Removemos a chamada para 'social_comments' que estava quebrando o feed
      const { data: postsData, error } = await supabase
          .from('social_posts')
          .select(`
            *, 
            profiles ( full_name, avatar_url, role ), 
            bot_profiles ( name, avatar_url )
          `)
          .order('created_at', { ascending: false })
      
      if (!error) setPosts(postsData || [])
  }

  async function loadStories() {
    const { data: allStories, error } = await supabase
      .from('stories')
      .select(`
        *, 
        bot_profiles:bot_profiles!fk_stories_bots ( id, name, avatar_url ), 
        profiles:profiles!fk_stories_profiles ( id, full_name, avatar_url )
      `)
      .order('created_at', { ascending: false })
    
    if (error) return

    const groupedStories = new Map<string, StoryUser>();

    allStories?.forEach((story) => {
        const isBot = !!story.bot_id;
        const id = isBot ? story.bot_id : story.user_id;
        // @ts-ignore
        const name = isBot ? story.bot_profiles?.name : (story.profiles?.full_name || 'Usuário');
        // @ts-ignore
        const avatar = isBot ? story.bot_profiles?.avatar_url : (story.profiles?.avatar_url || '');

        if (id) {
            if (!groupedStories.has(id)) {
                groupedStories.set(id, { id, name, avatar, is_bot: isBot, stories: [] });
            }
            groupedStories.get(id)?.stories.push(story);
        }
    });
    setUsersWithStories(Array.from(groupedStories.values()));
  }

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
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${selectedFile.name.split('.').pop()}`
        const { data } = await supabase.storage.from('community-media').upload(fileName, selectedFile)
        if (data) mediaUrl = supabase.storage.from('community-media').getPublicUrl(fileName).data.publicUrl
      }
      await supabase.from('social_posts').insert({
        user_id: userProfile.id,
        content: newPostContent,
        image_url: mediaUrl,
        likes_count: 0
      })
      setNewPostContent(''); setSelectedFile(null); setPreviewUrl(null); setMediaType(null)
      await loadPosts() 
    } catch (e) { alert("Erro ao postar.") } finally { setIsSubmitting(false) }
  }

  async function handlePostStory(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setIsSubmitting(true)
    try {
      const fileName = `story-${Date.now()}.${file.name.split('.').pop()}`
      await supabase.storage.from('community-media').upload(fileName, file)
      const mediaUrl = supabase.storage.from('community-media').getPublicUrl(fileName).data.publicUrl
      await supabase.from('stories').insert({ user_id: userProfile.id, media_url: mediaUrl })
      await loadStories() 
    } catch (e) { alert("Erro ao postar story.") } finally { setIsSubmitting(false); if(storyInputRef.current) storyInputRef.current.value = '' }
  }

  const handleLike = async (postId: string) => {
    const isLiking = !likedPosts.includes(postId)
    setLikedPosts(prev => isLiking ? [...prev, postId] : prev.filter(id => id !== postId))
    const currentPost = posts.find(p => p.id === postId)
    const newLikes = isLiking ? (currentPost.likes_count || 0) + 1 : Math.max(0, (currentPost.likes_count || 0) - 1)
    await supabase.from('social_posts').update({ likes_count: newLikes }).eq('id', postId)
  }

  const handleCommentClick = (postId: string) => {
      setActiveCommentPostId(activeCommentPostId === postId ? null : postId)
  }

  // --- ENVIAR COMENTÁRIO (TENTA SALVAR, MAS NÃO TRAVA O FEED) ---
  const submitComment = async (postId: string) => {
      if(!commentText.trim()) return
      setSendingComment(true)

      try {
          // Tenta inserir. Se a tabela não existir, vai cair no catch, mas não quebra o site.
          await supabase.from('social_comments').insert({
              post_id: postId,
              user_id: userProfile.id,
              content: commentText
          })

          alert("Comentário enviado!")
          setCommentText("")
          setActiveCommentPostId(null)
      } catch (e) {
          console.error(e)
          alert("Ainda não é possível salvar comentários (Tabela ausente).")
      } finally {
          setSendingComment(false)
      }
  }

  const handleStartChat = (targetId: string, isBot: boolean) => {
    router.push(`/app/chat/direct/${targetId}?type=${isBot ? 'bot' : 'user'}`)
  }

  const isVideoUrl = (url: string) => url && /\.(mp4|webm|ogg|mov)$/i.test(url)

  const SafeAvatar = ({ src, className }: any) => {
      const isValid = src && src.length > 5;
      return isValid ? (
        <img src={src} className={className} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('bg-zinc-800'); }} />
      ) : (
        <div className={`${className} flex items-center justify-center bg-zinc-800 text-zinc-500`}><Users size={14} /></div>
      )
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

      {/* MOBILE ONLINE LIST */}
      <div className="md:hidden pt-3 px-4 pb-3 border-b border-white/5 overflow-x-auto custom-scrollbar flex gap-4 bg-[#000000]">
          {onlineUsers.length > 0 ? onlineUsers.slice(0, 10).map((u) => (
              <div key={u.id} className="flex-shrink-0 relative cursor-pointer group" onClick={() => handleStartChat(u.id, u.is_bot)}>
                  <div className="relative">
                    <SafeAvatar src={u.avatar} className="w-14 h-14 rounded-full border-2 border-zinc-800 object-cover" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#000] rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-[10px] text-center text-zinc-400 mt-1 truncate w-14">{u.name?.split(' ')[0]}</p>
              </div>
          )) : (
             <p className="text-xs text-zinc-600 italic px-2">Ninguém online</p>
          )}
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
                        <div><p className="font-bold text-white">{userProfile?.full_name}</p><p className="text-xs text-zinc-500">Online</p></div>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)}><X size={20}/></button>
                </div>
                <nav className="flex-1 space-y-4">
                    <Link href="/app/profile" className="flex items-center gap-3 text-zinc-300 font-medium"><User size={20}/> Perfil</Link>
                    <Link href="/app/chat" className="flex items-center gap-3 text-zinc-300 font-medium"><MessageCircle size={20}/> Mensagens</Link>
                    <Link href="/app/dashboard" className="flex items-center gap-3 text-zinc-300 font-medium"><LayoutDashboard size={20}/> Dashboard</Link>
                </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto md:px-4 py-4 md:py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:block col-span-1">
             <div className="sticky top-24 space-y-6">
                 <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition cursor-pointer" onClick={() => router.push('/app/profile')}>
                     <SafeAvatar src={userProfile?.avatar_url} className="w-14 h-14 rounded-full border border-white/10 object-cover" />
                     <div><p className="font-bold text-white text-sm">{userProfile?.full_name}</p><p className="text-zinc-500 text-xs">@{userProfile?.full_name?.split(' ')[0].toLowerCase()}</p></div>
                 </div>
                 <nav className="space-y-2 px-2">
                     <Link href="/app/dashboard" className="flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-medium text-sm"><LayoutDashboard size={22}/> Feed Principal</Link>
                     <Link href="/app/chat" className="flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-medium text-sm"><MessageCircle size={22}/> Mensagens</Link>
                     <Link href="/app/saved" className="flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition font-medium text-sm"><BadgeCheck size={22}/> Salvos</Link>
                 </nav>
             </div>
        </aside>

        {/* FEED CENTRAL */}
        <main className="col-span-1 md:col-span-2 space-y-6">
            {/* STORIES */}
            <div className="bg-[#0F0F10] md:bg-transparent md:border-none border-b border-white/10 pb-4 pt-2 md:pt-0">
                 <div className="overflow-x-auto custom-scrollbar flex gap-4 px-4 md:px-0">
                    <div className="flex flex-col items-center gap-1 min-w-[70px] group relative">
                        <div className="relative w-[68px] h-[68px]">
                             <div onClick={() => hasMyStory ? setActiveStory({ user: myUserStory, stories: myUserStory?.stories, index: 0 }) : storyInputRef.current?.click()} className={`w-full h-full rounded-full p-[2px] cursor-pointer transition ${hasMyStory ? 'bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600' : 'border-2 border-zinc-700 border-dashed hover:border-zinc-500'}`}>
                                 <div className="w-full h-full rounded-full border-2 border-black bg-zinc-800 overflow-hidden"><SafeAvatar src={userProfile?.avatar_url} className="w-full h-full object-cover opacity-90" /></div>
                             </div>
                             <div onClick={(e) => { e.stopPropagation(); storyInputRef.current?.click(); }} className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center border-2 border-black cursor-pointer transition z-10">
                                 {issubmitting ? <Loader2 size={12} className="animate-spin text-white"/> : <Plus size={14} className="text-white"/>}
                             </div>
                             <input ref={storyInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handlePostStory} disabled={issubmitting} />
                        </div>
                        <span className="text-xs text-zinc-400">Seu story</span>
                    </div>
                    {usersWithStories.map((u) => {
                         if (u.id === userProfile?.id) return null; 
                         return (
                            <div key={u.id} onClick={() => setActiveStory({ user: u, stories: u.stories, index: 0 })} className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group">
                                <div className="w-[68px] h-[68px] rounded-full p-[2px] bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 transform transition group-hover:scale-105">
                                    <div className="w-full h-full rounded-full border-2 border-black bg-black p-0.5"><SafeAvatar src={u.avatar} className="w-full h-full rounded-full object-cover" /></div>
                                </div>
                                <span className="text-xs text-zinc-300 w-16 truncate text-center">{u.name?.split(' ')[0]}</span>
                            </div>
                         )
                    })}
                 </div>
            </div>

            {/* INPUT POST */}
            <div className="bg-[#121214] border border-white/5 md:rounded-2xl p-4">
                <div className="flex gap-4">
                    <SafeAvatar src={userProfile?.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                        <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full bg-transparent text-zinc-200 placeholder:text-zinc-600 text-sm resize-none focus:outline-none min-h-[60px]" placeholder={`No que você está pensando?`} />
                        {previewUrl && (
                          <div className="relative mt-3 rounded-xl overflow-hidden bg-black border border-white/10 max-h-[300px]">
                             <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); setMediaType(null) }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full z-10 text-white hover:bg-rose-600 transition"><X size={16}/></button>
                             {mediaType === 'video' ? <video src={previewUrl} controls className="w-full h-full object-contain bg-black" /> : <img src={previewUrl} className="w-full h-full object-contain" alt="preview" />}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                            <div className="flex gap-4">
                                <button onClick={() => triggerFileInput('image')} className="text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-full"><ImageIcon size={20}/></button>
                                <button onClick={() => triggerFileInput('video')} className="text-blue-500 hover:bg-blue-500/10 p-2 rounded-full"><Video size={20}/></button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            </div>
                            <button onClick={handleCreatePost} disabled={issubmitting} className="px-6 py-2 rounded-full font-bold text-sm bg-white text-black hover:bg-zinc-200">{issubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Publicar'}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* FEED */}
            <div className="space-y-4">
                {posts.map((post) => (
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={post.id} className="bg-[#121214] border border-white/5 md:rounded-2xl overflow-hidden">
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex gap-3 items-center">
                                <SafeAvatar src={post.bot_profiles?.avatar_url || post.profiles?.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                                <div><p className="font-bold text-white text-sm">{post.bot_profiles?.name || post.profiles?.full_name}</p><p className="text-[11px] text-zinc-500">{new Date(post.created_at).toLocaleDateString()}</p></div>
                            </div>
                        </div>
                        {post.content && <div className="px-4 pb-3 text-zinc-200 text-sm whitespace-pre-wrap">{post.content}</div>}
                        {post.image_url && <div className="w-full bg-black flex justify-center max-h-[600px] overflow-hidden">{isVideoUrl(post.image_url) ? <video src={post.image_url} controls className="w-full max-h-[600px] object-contain" /> : <img src={post.image_url} className="w-full max-h-[600px] object-cover" />}</div>}
                        
                        {/* AÇÕES E LIKES */}
                        <div className="px-4 py-3">
                            <div className="flex gap-4 mb-2">
                                <button onClick={() => handleLike(post.id)}>
                                    <Heart size={24} className={`transition ${likedPosts.includes(post.id) ? 'fill-rose-500 text-rose-500' : 'text-white hover:text-zinc-300'}`} />
                                </button>
                                <button onClick={() => handleCommentClick(post.id)} className="text-white hover:text-zinc-300"><MessageCircle size={24}/></button>
                            </div>
                            <span className="text-sm font-bold text-white block">{post.likes_count || 0} curtidas</span>
                            
                            {/* ÁREA DE COMENTÁRIOS */}
                            <div className="mt-4 space-y-3">
                                {/* Lista de Comentários (SE EXISTIREM NA QUERY) */}
                                {post.social_comments && post.social_comments.length > 0 && (
                                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                        {post.social_comments.map((comment: any) => (
                                            <div key={comment.id} className="flex gap-2">
                                                <SafeAvatar src={comment.profiles?.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                                <div className="bg-zinc-800/50 rounded-xl px-3 py-1.5">
                                                    <p className="text-xs font-bold text-zinc-400">{comment.profiles?.full_name}</p>
                                                    <p className="text-sm text-zinc-200">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* INPUT DE COMENTÁRIO */}
                                {activeCommentPostId === post.id && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-white/10 pt-3">
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder="Adicione um comentário..."
                                                className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                                            />
                                            <button onClick={() => submitComment(post.id)} disabled={sendingComment} className="p-2 bg-rose-600 rounded-full text-white hover:bg-rose-700 disabled:opacity-50">
                                                {sendingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </main>

        {/* ONLINE (DESKTOP) */}
        <aside className="hidden md:block col-span-1">
            <div className="sticky top-24">
                <h3 className="text-zinc-400 font-bold text-sm mb-4">Online Agora</h3>
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-2 space-y-1">
                    {onlineUsers.length > 0 ? onlineUsers.slice(0, 8).map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer" onClick={() => router.push(`/app/chat/direct/${u.id}?type=${u.is_bot ? 'bot' : 'user'}`)}>
                            <div className="flex items-center gap-3">
                                <div className="relative"><SafeAvatar src={u.avatar} className="w-10 h-10 rounded-full object-cover" /><div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121214] rounded-full animate-pulse"></div></div>
                                <span className="text-sm font-bold text-zinc-200">{u.name?.split(' ')[0]}</span>
                            </div>
                        </div>
                    )) : <div className="p-4 text-center text-xs text-zinc-600">Ninguém online</div>}
                </div>
            </div>
        </aside>
      </div>
      
      {/* STORY VIEWER */}
      <AnimatePresence>
        {activeStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black flex flex-col h-[100dvh] w-screen overflow-hidden">
            <div className="absolute inset-0 z-40 flex">
                <div className="w-[30%] h-full" onClick={(e) => { e.stopPropagation(); handlePrevStory(); }}></div>
                <div className="w-[70%] h-full" onClick={(e) => { e.stopPropagation(); handleNextStory(); }}></div>
            </div>
            <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="flex gap-1 mb-4 pointer-events-auto">
                    {activeStory.stories.map((_:any, i:number) => (
                        <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <motion.div initial={{ width: i < activeStory.index ? '100%' : '0%' }} animate={{ width: i === activeStory.index ? `${progress}%` : (i < activeStory.index ? '100%' : '0%') }} transition={{ duration: i === activeStory.index ? 0 : 0.3 }} className="h-full bg-white shadow-lg" />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <SafeAvatar src={activeStory.user.avatar || activeStory.stories[activeStory.index].bot_profiles?.avatar_url} className="w-10 h-10 rounded-full border border-white/20 shadow-lg" />
                        <div><p className="text-white font-bold text-sm shadow-black drop-shadow-md">{activeStory.user.name}</p></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveStory(null); }} className="p-2 bg-white/10 rounded-full backdrop-blur-md text-white hover:bg-white/20 active:scale-95 transition"><X size={24}/></button>
                </div>
            </div>
            <div className="flex-1 relative flex items-center justify-center bg-black">
                <motion.div key={activeStory.stories[activeStory.index].id} initial={{ opacity: 0.8 }} animate={{ opacity: 1 }} className="relative w-full h-full flex items-center justify-center">
                    {isVideoUrl(activeStory.stories[activeStory.index].media_url) ? 
                         <video src={activeStory.stories[activeStory.index].media_url} autoPlay playsInline className="w-full h-full max-h-[100dvh] object-contain" onEnded={handleNextStory} /> : 
                         <img src={activeStory.stories[activeStory.index].media_url} className="w-full h-full max-h-[100dvh] object-contain" alt="" />
                    }
                </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}