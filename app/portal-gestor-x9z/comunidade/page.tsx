'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, Calendar, Send, Plus, Trash2, 
  Clock, Image as ImageIcon, Bot, CheckCircle2,
  User, FileText, Sparkles, MessageSquare, X, Rocket, History,
  Upload, Loader2, Zap
} from 'lucide-react'

export default function CommunityManager() {
  const supabase = createClient()
  
  // Estados Gerais
  const [tab, setTab] = useState<'bots' | 'scheduler' | 'stories' | 'inbox' | 'history'>('bots')
  const [uploading, setUploading] = useState(false)

  // Dados
  const [bots, setBots] = useState<any[]>([])
  const [scheduled, setScheduled] = useState<any[]>([])
  const [postHistory, setPostHistory] = useState<any[]>([]) 
  const [inboxMessages, setInboxMessages] = useState<any[]>([])
  
  // Chat Admin
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [replyText, setReplyText] = useState('')

  // Novo Bot
  const [botName, setBotName] = useState('')
  const [botAvatar, setBotAvatar] = useState('')
  const [botBio, setBotBio] = useState('')

  // --- ESTADOS DE POSTAGEM (FEED) ---
  const [postContent, setPostContent] = useState('')
  const [postFile, setPostFile] = useState<File | null>(null) // Arquivo real
  const [postPreview, setPostPreview] = useState<string | null>(null) // Preview da imagem
  const [selectedBot, setSelectedBot] = useState('') 
  const [selectedBots, setSelectedBots] = useState<string[]>([]) 
  const [postDate, setPostDate] = useState('')
  const [isMassPost, setIsMassPost] = useState(false) 

  // --- ESTADOS DE STORIES ---
  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [storyPreview, setStoryPreview] = useState<string | null>(null)
  const [selectedStoryBot, setSelectedStoryBot] = useState('')

  useEffect(() => {
    refreshAll()

    // Realtime
    const channel = supabase
      .channel('admin_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_messages' }, () => fetchInbox())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => fetchHistory())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function refreshAll() {
      await Promise.all([fetchBots(), fetchScheduled(), fetchInbox(), fetchHistory()])
  }

  // --- FETCHERS ---
  async function fetchBots() {
    const { data } = await supabase.from('bot_profiles').select('*').order('created_at', { ascending: false })
    setBots(data || [])
  }
  async function fetchScheduled() {
    const { data } = await supabase.from('scheduled_posts').select('*, bot_profiles(name, avatar_url)').order('post_at', { ascending: true })
    setScheduled(data || [])
  }
  async function fetchHistory() {
    const { data } = await supabase.from('social_posts').select('*, bot_profiles(name, avatar_url)').not('bot_id', 'is', null).order('created_at', { ascending: false })
    setPostHistory(data || [])
  }
  async function fetchInbox() {
    const { data } = await supabase.from('bot_messages').select(`*, profiles:user_id (full_name, avatar_url), bot_profiles:bot_id (name, avatar_url)`).order('created_at', { ascending: false })
    setInboxMessages(data || [])
  }

  // --- FUNÇÃO DE UPLOAD (SUPABASE STORAGE) ---
  async function uploadMedia(file: File) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      // Certifique-se de ter criado o bucket 'community-media' no Supabase
      const { error: uploadError } = await supabase.storage
          .from('community-media') 
          .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('community-media').getPublicUrl(filePath)
      return data.publicUrl
  }

  // --- HANDLERS DE ARQUIVO ---
  const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          setPostFile(file)
          setPostPreview(URL.createObjectURL(file))
      }
  }

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0]
          setStoryFile(file)
          setStoryPreview(URL.createObjectURL(file))
      }
  }

  // --- AÇÕES DE POSTAGEM (FEED) ---
  async function handlePostAction(type: 'now' | 'schedule') {
    if (!postContent && !postFile) return alert("Escreva algo ou adicione uma mídia.")
    if (!isMassPost && !selectedBot) return alert("Selecione um bot.")
    if (isMassPost && selectedBots.length === 0) return alert("Selecione os bots.")
    if (type === 'schedule' && !postDate) return alert("Selecione uma data.")

    setUploading(true)

    try {
        // 1. Upload da Imagem (se houver)
        let mediaUrl = ''
        if (postFile) {
            mediaUrl = await uploadMedia(postFile)
        }

        const targets = isMassPost ? selectedBots : [selectedBot]
        
        if (type === 'schedule') {
            const inserts = targets.map(botId => ({
                bot_id: botId, content: postContent, image_url: mediaUrl,
                post_at: new Date(postDate).toISOString(), status: 'pending'
            }))
            await supabase.from('scheduled_posts').insert(inserts)
            alert("Agendado com sucesso!")
        } else {
            const inserts = targets.map(botId => ({
                bot_id: botId, user_id: null, content: postContent, image_url: mediaUrl,
                likes_count: Math.floor(Math.random() * 50)
            }))
            await supabase.from('social_posts').insert(inserts)
            alert("Postado no Feed!")
        }

        // Limpar
        setPostContent(''); setPostFile(null); setPostPreview(null); setPostDate(''); fetchHistory(); fetchScheduled();

    } catch (error: any) {
        alert("Erro: " + error.message)
    } finally {
        setUploading(false)
    }
  }

  // --- AÇÃO DE POSTAR STORIES ---
  async function postStory() {
      if (!selectedStoryBot) return alert("Selecione um bot para o story.")
      if (!storyFile) return alert("Selecione uma imagem ou vídeo para o story.")

      setUploading(true)
      try {
          const mediaUrl = await uploadMedia(storyFile)
          
          await supabase.from('stories').insert({
              bot_id: selectedStoryBot,
              media_url: mediaUrl
          })

          alert("Story publicado!")
          setStoryFile(null); setStoryPreview(null);
      } catch (error: any) {
          alert("Erro no story: " + error.message)
      } finally {
          setUploading(false)
      }
  }

  // --- AÇÕES GERAIS ---
  async function deletePostHistory(id: string) {
      if(!confirm("Excluir?")) return
      await supabase.from('social_posts').delete().eq('id', id)
      fetchHistory()
  }
  
  // ... (Outras funções de Bot e Chat mantidas) ...
  async function replyAsBot() {
    if (!replyText || !selectedChat) return
    const { error } = await supabase.from('bot_messages').insert({
        user_id: selectedChat.user_id, bot_id: selectedChat.bot_id, content: replyText, is_from_bot: true, read: true
    })
    if (!error) { setReplyText(''); fetchInbox() }
  }
  async function createBot() {
    if (!botName) return alert("Nome obrigatório")
    const { error } = await supabase.from('bot_profiles').insert({
        name: botName, avatar_url: botAvatar || `https://i.pravatar.cc/150?u=${botName}`, bio: botBio,
    })
    if (!error) { setBotName(''); setBotAvatar(''); setBotBio(''); fetchBots() }
  }
  async function deleteBot(id: string) {
      if(!confirm("Excluir bot?")) return; await supabase.from('bot_profiles').delete().eq('id', id); fetchBots();
  }
  const toggleBotSelection = (botId: string) => {
      if (isMassPost) {
          if (selectedBots.includes(botId)) setSelectedBots(prev => prev.filter(id => id !== botId))
          else setSelectedBots(prev => [...prev, botId])
      } else setSelectedBot(botId)
  }
  async function forcePublishSchedule(scheduledPost: any) {
      if(!confirm("Publicar agora?")) return
      await supabase.from('social_posts').insert({
          bot_id: scheduledPost.bot_id, content: scheduledPost.content, image_url: scheduledPost.image_url, likes_count: 0
      })
      await supabase.from('scheduled_posts').delete().eq('id', scheduledPost.id)
      fetchScheduled(); fetchHistory();
  }
  async function deleteScheduled(id: string) { await supabase.from('scheduled_posts').delete().eq('id', id); fetchScheduled() }

  // Lógica Inbox
  const conversations = inboxMessages.reduce((acc: any, msg) => {
      const key = `${msg.user_id}-${msg.bot_id}`
      if (!acc[key]) {
          acc[key] = {
              user_id: msg.user_id, bot_id: msg.bot_id,
              user_name: msg.profiles?.full_name || 'Usuário', user_avatar: msg.profiles?.avatar_url,
              bot_name: msg.bot_profiles?.name || 'Bot', history: []
          }
      }
      acc[key].history.push(msg)
      return acc
  }, {})
  const conversationList = Object.values(conversations)

  return (
    <div className="min-h-screen bg-[#09090B] w-full text-zinc-100">
        <div className="p-8 max-w-7xl mx-auto">
      
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 text-white">
                <Users className="text-rose-600" /> GESTÃO DE COMUNIDADE
            </h1>
            <button onClick={() => setTab('inbox')} className="bg-zinc-900 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 hover:border-rose-500/50 transition">
                <MessageSquare size={16} className="text-white"/>
                <span className="text-xs font-bold text-zinc-300">{inboxMessages.filter(m => !m.is_from_bot && !m.read).length} Novas Msg</span>
            </button>
          </div>

          {/* ABAS */}
          <div className="flex gap-4 mb-8 border-b border-white/10 overflow-x-auto">
            {[
                { id: 'bots', label: 'Personagens', icon: Users },
                { id: 'scheduler', label: 'Postar (Feed)', icon: Calendar },
                { id: 'stories', label: 'Postar Stories', icon: Zap }, // NOVA ABA
                { id: 'history', label: 'Histórico', icon: History },
                { id: 'inbox', label: 'Atendimento', icon: MessageSquare },
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setTab(item.id as any)} 
                    className={`flex items-center gap-2 pb-4 px-4 font-bold text-xs uppercase tracking-widest transition border-b-2 whitespace-nowrap ${tab === item.id ? 'text-rose-500 border-rose-500' : 'text-zinc-500 border-transparent hover:text-white'}`}
                >
                    <item.icon size={16}/> {item.label}
                </button>
            ))}
          </div>

          {/* === ABA: STORIES (NOVA) === */}
          {tab === 'stories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#121214] p-8 rounded-3xl border border-white/10">
                      <h2 className="text-lg font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-white">
                          <Zap size={20} className="text-yellow-500"/> Novo Story
                      </h2>
                      
                      <div className="space-y-6">
                          {/* Seleção Bot */}
                          <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase mb-3 block">Quem vai postar?</label>
                              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                  {bots.map(bot => (
                                      <button key={bot.id} onClick={() => setSelectedStoryBot(bot.id)} className={`flex items-center gap-2 p-1.5 pr-4 rounded-full border transition flex-shrink-0 ${selectedStoryBot === bot.id ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-zinc-900/50'}`}>
                                          <img src={bot.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                                          <span className={`text-xs font-bold whitespace-nowrap ${selectedStoryBot === bot.id ? 'text-white' : 'text-zinc-400'}`}>{bot.name}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Upload Story */}
                          <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center relative hover:border-yellow-500/50 transition bg-zinc-900/30">
                              {storyPreview ? (
                                  <div className="relative w-full h-64">
                                      <img src={storyPreview} className="w-full h-full object-contain rounded-lg" />
                                      <button onClick={() => { setStoryFile(null); setStoryPreview(null) }} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-red-500 transition"><X size={16}/></button>
                                  </div>
                              ) : (
                                  <>
                                      <Upload size={32} className="text-zinc-600 mb-2"/>
                                      <p className="text-xs text-zinc-500 font-medium">Clique para selecionar imagem/vídeo</p>
                                      <input type="file" accept="image/*,video/*" onChange={handleStoryFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                  </>
                              )}
                          </div>

                          <button onClick={postStory} disabled={uploading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50">
                              {uploading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Publicar Story
                          </button>
                      </div>
                  </div>

                  <div className="bg-[#121214] p-8 rounded-3xl border border-white/10 flex items-center justify-center text-zinc-600">
                      <div className="text-center">
                          <Bot size={48} className="mx-auto mb-4 opacity-20"/>
                          <p className="text-sm">Preview do Story aparecerá no App.</p>
                      </div>
                  </div>
              </div>
          )}

          {/* === ABA: SCHEDULER (COM UPLOAD) === */}
          {tab === 'scheduler' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor */}
                <div className="lg:col-span-2 bg-[#121214] p-8 rounded-3xl border border-white/10">
                    <h2 className="text-lg font-black uppercase tracking-wider text-white mb-6">Criar Post Feed</h2>
                    
                    <div className="space-y-6">
                        {/* Seletor Bots */}
                        <div>
                            <button onClick={() => setIsMassPost(!isMassPost)} className={`text-[10px] font-bold px-3 py-2 rounded-lg border mb-3 transition flex items-center gap-2 ${isMassPost ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-zinc-800 text-zinc-400 border-white/10'}`}>
                                {isMassPost ? <CheckCircle2 size={14}/> : <div className="w-3.5 h-3.5 rounded-full border border-current"></div>} Disparo em Massa
                            </button>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {bots.map(bot => {
                                    const isSelected = isMassPost ? selectedBots.includes(bot.id) : selectedBot === bot.id
                                    return (
                                        <button key={bot.id} onClick={() => toggleBotSelection(bot.id)} className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border flex-shrink-0 transition ${isSelected ? 'border-rose-500 bg-rose-500/10' : 'border-white/10'}`}>
                                            <img src={bot.avatar_url} className="w-6 h-6 rounded-full object-cover"/><span className="text-xs font-bold text-white">{bot.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <textarea value={postContent} onChange={e => setPostContent(e.target.value)} className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-rose-500 transition outline-none" placeholder="Legenda do post..." />
                        
                        {/* UPLOAD IMAGEM FEED */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl cursor-pointer hover:border-white/30 transition group">
                                <ImageIcon size={18} className="text-zinc-500 group-hover:text-white"/>
                                <span className="text-xs font-bold text-zinc-400 group-hover:text-white">Anexar Mídia</span>
                                <input type="file" accept="image/*" onChange={handlePostFileChange} className="hidden" />
                            </label>
                            {postPreview && (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20">
                                    <img src={postPreview} className="w-full h-full object-cover"/>
                                    <button onClick={() => { setPostFile(null); setPostPreview(null) }} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition"><X size={12}/></button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-end gap-3 pt-4 border-t border-white/5">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Agendar (Opcional)</label>
                                <input type="datetime-local" value={postDate} onChange={e => setPostDate(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition"/>
                            </div>
                            {postDate ? 
                                <button onClick={() => handlePostAction('schedule')} disabled={uploading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase flex items-center gap-2">{uploading ? <Loader2 className="animate-spin" size={16}/> : <Clock size={16}/>} Agendar</button> : 
                                <button onClick={() => handlePostAction('now')} disabled={uploading} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase flex items-center gap-2">{uploading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Postar Agora</button>
                            }
                        </div>
                    </div>
                </div>

                {/* Fila */}
                <div className="bg-[#121214] p-8 rounded-3xl border border-white/10">
                    <h2 className="text-lg font-black uppercase tracking-wider mb-6 text-white">Agendados</h2>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {scheduled.map(post => (
                            <div key={post.id} className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2"><img src={post.bot_profiles?.avatar_url} className="w-5 h-5 rounded-full"/><span className="text-[10px] font-bold text-zinc-300">{post.bot_profiles?.name}</span></div>
                                    <div className="flex gap-1">
                                        <button onClick={() => forcePublishSchedule(post)} className="text-emerald-500 hover:bg-emerald-500/10 p-1.5 rounded"><Rocket size={14}/></button>
                                        <button onClick={() => deleteScheduled(post.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-1">{post.content}</p>
                                <div className="text-[10px] text-blue-400 mt-2">{new Date(post.post_at).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}

          {/* --- ABA: HISTÓRICO (MANTIDA) --- */}
          {tab === 'history' && (
              <div className="bg-[#121214] p-8 rounded-3xl border border-white/10">
                  <h2 className="text-lg font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-white"><History size={20} className="text-blue-500"/> Histórico</h2>
                  <div className="space-y-4">
                      {postHistory.map(post => (
                          <div key={post.id} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex gap-4 items-start group">
                              <div className="w-16 h-16 bg-black/40 rounded-lg flex-shrink-0 overflow-hidden">
                                  {post.image_url ? <img src={post.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={20} className="text-zinc-700"/></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="text-sm font-bold text-white">{post.bot_profiles?.name}</span>
                                      <button onClick={() => deletePostHistory(post.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={16}/></button>
                                  </div>
                                  <p className="text-xs text-zinc-400 line-clamp-2">{post.content}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* --- ABA: INBOX (MANTIDA) --- */}
          {tab === 'inbox' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                  <div className="md:col-span-1 bg-[#121214] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-white/5 bg-zinc-900"><h3 className="font-bold text-sm text-white">Conversas</h3></div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {conversationList.map((chat: any, i) => (
                              <div key={i} onClick={() => setSelectedChat(chat)} className={`p-3 rounded-xl cursor-pointer transition flex items-center gap-3 ${selectedChat === chat ? 'bg-rose-500/10 border border-rose-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                  <img src={chat.user_avatar} className="w-10 h-10 rounded-full bg-zinc-800" />
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-white truncate">{chat.user_name}</p>
                                      <p className="text-xs text-zinc-500 truncate">com <span className="text-rose-400">{chat.bot_name}</span></p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="md:col-span-2 bg-[#121214] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                      {selectedChat ? (
                          <>
                            <div className="p-4 border-b border-white/5 bg-zinc-900 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <img src={selectedChat.user_avatar} className="w-8 h-8 rounded-full" />
                                    <div><p className="font-bold text-sm text-white">{selectedChat.user_name}</p><p className="text-xs text-zinc-500">Bot: <strong className="text-rose-400">{selectedChat.bot_name}</strong></p></div>
                                </div>
                                <button onClick={() => setSelectedChat(null)}><X size={18} className="text-zinc-500 hover:text-white"/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20 custom-scrollbar flex flex-col-reverse">
                                {selectedChat.history.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((msg: any) => (
                                    <div key={msg.id} className={`flex ${msg.is_from_bot ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${msg.is_from_bot ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                                            <p>{msg.content}</p>
                                            <span className="text-[9px] opacity-50 block text-right mt-1">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-zinc-900 border-t border-white/5 flex gap-2">
                                <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && replyAsBot()} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 text-sm text-white outline-none focus:border-rose-500 transition" placeholder="Responder..." />
                                <button onClick={replyAsBot} className="bg-rose-600 hover:bg-rose-500 text-white p-2.5 rounded-lg"><Send size={18}/></button>
                            </div>
                          </>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600"><MessageSquare size={48} className="mb-4 opacity-20"/><p className="text-sm">Selecione uma conversa.</p></div>
                      )}
                  </div>
              </div>
          )}

          {/* --- ABA: BOTS (MANTIDA) --- */}
          {tab === 'bots' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Form Bot */}
                <div className="md:col-span-5 bg-[#121214] p-8 rounded-3xl border border-white/10 h-fit">
                    <h2 className="text-lg font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-white"><Plus size={18}/> Novo Bot</h2>
                    <div className="space-y-4">
                        <input value={botName} onChange={e => setBotName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white text-sm" placeholder="Nome" />
                        <textarea value={botBio} onChange={e => setBotBio(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white text-sm" placeholder="Bio" />
                        <input value={botAvatar} onChange={e => setBotAvatar(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white text-sm" placeholder="URL Avatar" />
                        <button onClick={createBot} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm uppercase">Criar</button>
                    </div>
                </div>
                {/* Lista Bots */}
                <div className="md:col-span-7 bg-[#121214] p-8 rounded-3xl border border-white/10 min-h-[400px]">
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {bots.map(bot => (
                            <div key={bot.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3"><img src={bot.avatar_url} className="w-10 h-10 rounded-full" /><p className="font-bold text-sm">{bot.name}</p></div>
                                <button onClick={() => deleteBot(bot.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>
    </div>
  )
}