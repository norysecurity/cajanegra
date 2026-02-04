'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import YouTube from 'react-youtube'
import { 
  Play, ChevronLeft, ThumbsUp, Send, Heart, CheckCircle2, Circle, 
  FileText, Trash2, Download, Plus, Info, Share2, Loader2, Maximize2 
} from 'lucide-react'
import { toggleLike, postComment, toggleCommentLike, toggleLessonCompletion, deleteComment, saveVideoTime } from '@/app/portal-gestor-x9z/actions'

// Função para pegar o ID do YouTube limpo
const getYouTubeID = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Formatar link do Drive para Embed (Preview mode)
const formatPdfUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        return url.replace(/\/view.*/, '/preview').replace(/\/edit.*/, '/preview');
    }
    return url;
}

export default function ViewContentClient({ 
  lesson, moduleLessons, product, moduleTitle,
  initialComments, userId, completedLessonIds, initialInteraction, lastTime
}: any) {
  const router = useRouter()

  // --- ESTADOS ---
  const [comments, setComments] = useState(initialComments || [])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  
  const [isCurrentCompleted, setIsCurrentCompleted] = useState(completedLessonIds.includes(lesson.id))
  const [userLiked, setUserLiked] = useState(initialInteraction?.is_liked === true)
  const [mobileTab, setMobileTab] = useState<'episodes' | 'more'>('episodes')
  
  const [player, setPlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // --- CORREÇÃO VITAL: SINCRONIZAÇÃO COM O SERVIDOR ---
  useEffect(() => {
    setComments(initialComments || [])
  }, [initialComments])

  useEffect(() => {
    setUserLiked(initialInteraction?.is_liked === true)
  }, [initialInteraction])

  const lessonsCompletedCount = moduleLessons.filter((l: any) => 
    completedLessonIds.includes(l.id) || (l.id === lesson.id && isCurrentCompleted)
  ).length
  const progressPercent = moduleLessons.length > 0 ? Math.round((lessonsCompletedCount / moduleLessons.length) * 100) : 0

  const coverImage = product?.image_url || "https://via.placeholder.com/300x160?text=Capa"
  const videoId = getYouTubeID(lesson.video_url) || undefined
  const pdfUrl = lesson.type === 'pdf' ? formatPdfUrl(lesson.video_url) : null

  // Salvar tempo periodicamente
  useEffect(() => {
    let interval: any;
    if (isPlaying && player && lesson.type === 'video') {
        interval = setInterval(async () => {
           const currentTime = await player.getCurrentTime();
           saveVideoTime(lesson.id, currentTime)
        }, 15000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, player, lesson.id, lesson.type])

  const opts: any = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      fs: 1,
      playsinline: 1,
    },
  }

  const onReady = (event: any) => {
    setPlayer(event.target)
    setIsReady(true)
    if (lastTime > 0 && !isCurrentCompleted) {
        event.target.seekTo(lastTime)
    }
  }

  const onStateChange = (event: any) => {
    if (event.data === 1) setIsPlaying(true)
    if (event.data === 2) setIsPlaying(false)
  }

  const onEnd = async () => {
    setIsPlaying(false)
    if (!isCurrentCompleted) {
        setIsCurrentCompleted(true)
        await toggleLessonCompletion(lesson.id, true)
        router.refresh()
    }
  }

  const handlePlayButton = () => {
    if (player) {
        player.playVideo()
        setIsPlaying(true)
    }
  }

  const handleToggleComplete = async () => {
    const ns = !isCurrentCompleted
    setIsCurrentCompleted(ns)
    await toggleLessonCompletion(lesson.id, ns)
    router.refresh()
  }

  const handleSendComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const tempComment = { 
      id: Math.random(), content: newComment, user_id: userId, 
      profiles: { email: 'Você...', full_name: 'Você' }, 
      parent_id: parentId, 
      is_liked_by_user: false, likes_count: 0,
      created_at: new Date().toISOString()
    }
    setComments([tempComment, ...comments])
    setNewComment(''); setReplyingTo(null)
    await postComment(lesson.id, newComment, parentId)
    router.refresh()
  }

  const handleToggleLikeComment = async (commentId: string) => {
    setComments((prev: any) => prev.map((c: any) => {
      if (c.id === commentId) {
        const isNowLiked = !c.is_liked_by_user
        return { ...c, is_liked_by_user: isNowLiked, likes_count: isNowLiked ? c.likes_count + 1 : c.likes_count - 1 }
      }
      return c
    }))
    await toggleCommentLike(commentId, lesson.id)
    router.refresh()
  }
  
  const handleLikeLesson = async () => {
      const newState = !userLiked
      setUserLiked(newState)
      await toggleLike(lesson.id, newState)
      router.refresh()
  }

  return (
    /* CORREÇÃO: notranslate e translate="no" para evitar o erro de insertBefore */
    <div className="min-h-screen bg-[#000] text-zinc-100 font-sans flex flex-col md:flex-row h-auto md:h-screen overflow-hidden relative notranslate" translate="no">
      
      <main className="flex-1 flex flex-col md:overflow-y-auto custom-scrollbar bg-[#000] relative order-1 md:order-none pb-20 md:pb-0">
        
        <header className="absolute top-0 left-0 right-0 z-50 h-16 px-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <Link href="/app" className="w-10 h-10 flex items-center justify-center pointer-events-auto text-white hover:bg-white/10 rounded-full transition">
              <ChevronLeft size={28} />
          </Link>
          <div className="flex gap-4 pointer-events-auto text-white">
              <button className="hover:text-rose-500 transition"><Share2 size={24} /></button>
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold shadow-lg shadow-red-600/20">D</div>
          </div>
        </header>

        <div className={`w-full bg-zinc-900 shadow-2xl md:relative sticky top-0 z-40 group overflow-hidden ${lesson.type === 'pdf' ? 'h-[85vh] md:h-full' : 'aspect-video'}`}>
           
           {lesson.type === 'pdf' ? (
             <div className="w-full h-full flex flex-col relative pt-16 bg-[#1a1a1a]">
                <iframe 
                    src={pdfUrl || ''} 
                    className="w-full h-full border-none bg-white" 
                    title="Leitor PDF" 
                />
                <a href={lesson.video_url} target="_blank" className="absolute bottom-4 right-4 bg-zinc-800/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-zinc-700 transition z-50 shadow-lg border border-white/10">
                    <Maximize2 size={14} /> Abrir Externo
                </a>
             </div>

           ) : lesson.type === 'script' ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border-b border-white/10 p-8 text-center pt-20">
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    <FileText size={32} className="text-zinc-500"/>
                </div>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Material de Leitura</p>
                <h2 className="text-white text-xl font-bold mt-2 max-w-md">{lesson.title}</h2>
             </div>

           ) : (
             <>
                {!isPlaying && (
                  <div 
                    onClick={handlePlayButton}
                    className="absolute inset-0 z-20 bg-black flex items-center justify-center cursor-pointer pt-16"
                  >
                      <img src={coverImage} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative z-30 flex flex-col items-center gap-3 animate-in zoom-in duration-300 group-hover:scale-105 transition">
                          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition duration-300 shadow-xl">
                            <Play size={32} fill="white" className="ml-1 text-white" />
                          </div>
                          <p className="text-white font-bold text-xs uppercase tracking-widest drop-shadow-md">Toque para Assistir</p>
                      </div>
                  </div>
                )}
                <div className="w-full h-full pt-16 md:pt-0 bg-black">
                    <YouTube 
                        videoId={videoId} 
                        opts={opts} 
                        onReady={onReady}
                        onStateChange={onStateChange}
                        onEnd={onEnd} 
                        className="w-full h-full"
                        iframeClassName="w-full h-full"
                    />
                </div>
             </>
           )}
        </div>

        <div className="px-4 py-4 md:px-8 md:py-6 bg-[#000] relative z-20">
            <div className="flex justify-between items-start gap-4">
               <h1 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">{lesson.title}</h1>
               <div className="hidden md:flex gap-2">
                   <button onClick={handleLikeLesson} className={`p-2 rounded-full border ${userLiked ? 'bg-red-600 border-red-600 text-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}>
                       <ThumbsUp size={18} />
                   </button>
               </div>
            </div>
            
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium mb-4">
               <span className="text-green-400 font-bold bg-green-400/10 px-1.5 py-0.5 rounded">98% Relevante</span>
               <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 uppercase font-bold">{lesson.type === 'pdf' ? 'E-book' : 'HD'}</span>
               <span>{moduleLessons.length} Aulas neste módulo</span>
            </div>

            <div className="flex flex-col gap-3 md:hidden mb-6">
               {lesson.type === 'video' ? (
                   /* CORREÇÃO: Spans isolados para ícone e texto para evitar erro de hidratação e tradução */
                   <button 
                     onClick={handlePlayButton}
                     className={`w-full py-3 rounded-[4px] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 ${isCurrentCompleted ? 'bg-zinc-800 text-white' : 'bg-white text-black'}`}
                   >
                       <span className="flex items-center justify-center w-5 h-5">
                        {isPlaying ? <Loader2 size={20} className="animate-spin" /> : (isCurrentCompleted ? <CheckCircle2 size={20} /> : <Play size={20} fill="black" />)}
                       </span>
                       <span>
                        {isPlaying ? 'Reproduzindo...' : (isCurrentCompleted ? 'Assistir Novamente' : 'Assistir')}
                       </span>
                   </button>
               ) : (
                   <button 
                     onClick={handleToggleComplete}
                     className={`w-full py-3 rounded-[4px] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 ${isCurrentCompleted ? 'bg-zinc-800 text-emerald-400 border border-emerald-900' : 'bg-white text-black'}`}
                   >
                       <span className="flex items-center justify-center w-5 h-5">
                        {isCurrentCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                       </span>
                       <span>
                        {isCurrentCompleted ? 'Leitura Concluída' : 'Marcar como Lido'}
                       </span>
                   </button>
               )}
               <button className="w-full bg-zinc-900 border border-white/10 text-white py-3 rounded-[4px] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 hover:bg-zinc-800">
                  <Download size={20} /> Baixar Material
               </button>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3 mb-2 hover:line-clamp-none transition-all cursor-pointer">
               {lesson.content || "Sem descrição disponível para esta aula."}
            </p>
            
            <div className="flex justify-start gap-8 mt-6 md:hidden border-b border-white/10 pb-4">
               <div className="flex flex-col items-center gap-1 cursor-pointer group">
                   <Plus size={20} className="text-white group-hover:text-red-500 transition" />
                   <span className="text-[10px] text-zinc-400">Minha lista</span>
               </div>
               <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleLikeLesson}>
                   <ThumbsUp size={20} className={userLiked ? "text-red-500 fill-red-500" : "text-white group-hover:text-red-500"} />
                   <span className="text-[10px] text-zinc-400">Classificar</span>
               </div>
               <div className="flex flex-col items-center gap-1 cursor-pointer group">
                   <Share2 size={20} className="text-white group-hover:text-red-500 transition" />
                   <span className="text-[10px] text-zinc-400">Compartilhar</span>
               </div>
            </div>
        </div>

        {/* ... Restante do código (MobileTab, Comentários, Aside) permanece IGUAL ao original ... */}
        <div className="border-b border-white/10 md:hidden sticky top-0 bg-black z-30">
            <div className="flex gap-6 px-4">
               <button onClick={() => setMobileTab('episodes')} className={`py-3 text-sm font-bold border-b-2 transition ${mobileTab === 'episodes' ? 'border-red-600 text-white' : 'border-transparent text-zinc-500'}`}>
                  Aulas
               </button>
               <button onClick={() => setMobileTab('more')} className={`py-3 text-sm font-bold border-b-2 transition ${mobileTab === 'more' ? 'border-red-600 text-white' : 'border-transparent text-zinc-500'}`}>
                  Comentários
               </button>
            </div>
        </div>

        <div className={`${mobileTab === 'episodes' ? 'block' : 'hidden'} md:hidden px-4 py-4 space-y-4`}>
            <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-[4px] mb-4 border border-white/5">
               <span className="font-bold text-sm text-zinc-300">{moduleTitle}</span>
               <Info size={16} className="text-zinc-500" />
            </div>

            {moduleLessons.map((item: any, index: number) => {
               const isActive = item.id === lesson.id;
               const isItemCompleted = completedLessonIds.includes(item.id) || (isActive && isCurrentCompleted);
               
               return (
                  <Link key={item.id} href={`/app/view/${item.id}`} className="flex gap-4 items-center group">
                     <div className="relative w-32 aspect-video bg-zinc-800 rounded-[4px] overflow-hidden flex-shrink-0 border border-white/5">
                        <img src={coverImage} className="w-full h-full object-cover opacity-60" alt={item.title} />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${isActive ? 'bg-red-600 border-red-600' : 'bg-black/50 border-white'}`}>
                              {item.type === 'pdf' ? <FileText size={12} className="text-white"/> : <Play size={12} fill="white" className="text-white ml-0.5" />}
                           </div>
                        </div>
                        {isItemCompleted && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600" />}
                     </div>

                     <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-zinc-400'}`}>{index + 1}. {item.title}</h4>
                        <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1 uppercase font-bold">{item.type === 'video' ? 'Vídeo' : 'Material'}</p>
                     </div>
                  </Link>
               )
            })}
        </div>

        <div className={`${mobileTab === 'more' ? 'block' : 'hidden'} md:block px-4 md:px-8 py-6 pb-24`}>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">Comentários <span className="text-zinc-500 text-sm font-normal">({comments.length})</span></h3>
            
            <form onSubmit={(e) => handleSendComment(e)} className="flex gap-3 mb-8">
               <input 
                  value={newComment} onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Adicione um comentário..." 
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-[4px] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-red-600 transition" 
               />
               <button type="submit" className="text-zinc-400 hover:text-white p-2 rounded hover:bg-white/10 transition"><Send size={24} /></button>
            </form>

            <div className="space-y-6">
               {comments.filter((c:any) => !c.parent_id).map((c: any) => (
                  <div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                     <div className="w-8 h-8 rounded-[4px] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-bold text-xs uppercase shadow-lg">{c.profiles?.full_name?.[0] || c.profiles?.email?.[0] || '?'}</div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <span className="text-xs font-bold text-zinc-300">{c.profiles?.full_name || 'Usuário'}</span>
                           {c.user_id === userId && <button onClick={() => deleteComment(c.id, lesson.id)}><Trash2 size={12} className="text-zinc-600 hover:text-red-500 transition" /></button>}
                        </div>
                        <p className="text-sm text-zinc-400 mt-1 mb-2 leading-relaxed">{c.content}</p>
                        <div className="flex gap-4 text-xs font-bold text-zinc-500">
                           <button onClick={() => handleToggleLikeComment(c.id)} className={`flex items-center gap-1 transition ${c.is_liked_by_user ? 'text-red-600' : 'hover:text-white'}`}>
                              <Heart size={14} fill={c.is_liked_by_user ? "currentColor" : "none"} /> {c.likes_count > 0 ? c.likes_count : ''}
                           </button>
                           <button onClick={() => setReplyingTo(c.id)} className="hover:text-white transition">Responder</button>
                        </div>
                        
                        {replyingTo === c.id && (
                           <form onSubmit={(e) => handleSendComment(e, c.id)} className="mt-3 flex gap-2 animate-in fade-in">
                              <input autoFocus value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-zinc-900 border-b border-red-600 py-2 px-2 text-sm outline-none text-white" placeholder="Sua resposta..." />
                              <button type="submit" className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-[2px]">ENVIAR</button>
                           </form>
                        )}

                        {comments.filter((r:any) => r.parent_id === c.id).map((reply: any) => (
                           <div key={reply.id} className="flex gap-2 mt-4 ml-2 border-l-2 border-zinc-800 pl-3">
                              <div className="flex-1">
                                 <span className="text-[10px] font-bold text-zinc-500">{reply.profiles?.full_name || 'Usuário'}</span>
                                 <p className="text-xs text-zinc-400 mt-0.5">{reply.content}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
        </div>
      </main>

      <aside className="hidden md:block w-[400px] border-l border-zinc-800 bg-[#000] overflow-y-auto custom-scrollbar p-6">
         <div className="p-6 border border-white/5 bg-zinc-900/50 rounded-xl sticky top-0 z-10 mb-6 backdrop-blur-md">
            <div className="flex justify-between items-end mb-3">
               <p className="text-[10px] uppercase text-zinc-500 tracking-[0.2em] font-bold">Progresso do Módulo</p>
               <span className="text-[10px] font-bold text-red-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-red-600 transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: `${progressPercent}%` }} />
            </div>
         </div>
         
         <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold text-white">Aulas</h2>
             <span className="text-xs font-bold text-zinc-500">{moduleLessons.length} episódios</span>
         </div>

         <div className="space-y-3">
            {moduleLessons.map((item: any, index: number) => {
               const isActive = item.id === lesson.id;
               const isItemCompleted = completedLessonIds.includes(item.id) || (isActive && isCurrentCompleted);
               return (
                  <Link key={item.id} href={`/app/view/${item.id}`} className={`flex gap-3 p-3 rounded-[8px] transition border ${isActive ? 'bg-zinc-900 border-white/10' : 'border-transparent hover:bg-zinc-900/50 hover:border-white/5'}`}>
                     <div className="relative w-28 aspect-video bg-zinc-800 rounded-[4px] overflow-hidden flex-shrink-0 border border-white/5">
                        <img src={coverImage} className="w-full h-full object-cover opacity-70" alt={item.title} />
                        {isItemCompleted && <div className="absolute bottom-0 h-1 bg-red-600 w-full shadow-[0_0_10px_rgba(220,38,38,0.8)]" />}
                        {isActive && !isItemCompleted && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"/></div>}
                     </div>
                     <div className="flex-1">
                        <h4 className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{index + 1}. {item.title}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-500 uppercase font-bold border border-white/5">{item.type}</span>
                            {isItemCompleted && <CheckCircle2 size={10} className="text-green-500"/>}
                        </div>
                     </div>
                  </Link>
               )
            })}
         </div>
      </aside>

    </div>
  )
}