'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, Trash2, Edit2, ChevronRight, 
  Video, FileText, Lock, Unlock, 
  Settings, LayoutDashboard, 
  Image as ImageIcon, Upload, Loader2, Save, Link as LinkIcon,
  Bot, BrainCircuit, MessageSquare, Rocket, 
  Key, DollarSign, CreditCard, Tag, Megaphone
} from 'lucide-react'
import { 
  createProduct, deleteProduct, addModule, deleteModule, addLesson, 
  deleteLesson, toggleProductLock, updateSiteConfig 
} from './actions'
import EditorModal from './EditorModal'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Tipos
type BannerConfig = {
  id: number; image: string; title: string; subtitle: string; link: string
}

type AIConfig = {
  salesLink: string
  // Novos campos para sugestões de venda da IA
  salesLink1: string
  salesLink2: string
  salesLink3: string
  salesLink4: string
  
  systemPrompt: string
  modalTitle: string
  modalDescription: string
  buttonText: string
  feature1: string
  feature2: string
  feature3: string
  accessMode: 'paid' | 'free' | 'off'
  aiProductId: string 
  hotmartId: string 
  modalImageUrl?: string 
}

export default function AdminClient({ products }: { products: any[] }) {
  const [activeTab, setActiveTab] = useState<'courses' | 'settings' | 'ai'>('courses')
  const [expandedProduct, setExpandedProduct] = useState<string | null>(products?.[0]?.id || null)
  const [editingItem, setEditingItem] = useState<{ item: any, type: 'product' | 'lesson' } | null>(null)
  
  // Estado local para garantir que a interface atualize o bloqueio sem precisar de refresh manual
  const [localProducts, setLocalProducts] = useState(products)

  useEffect(() => {
    setLocalProducts(products)
  }, [products])

  // Estados Banners
  const [banners, setBanners] = useState<BannerConfig[]>([
    { id: 0, image: '', title: '', subtitle: '', link: '' },
    { id: 1, image: '', title: '', subtitle: '', link: '' },
    { id: 2, image: '', title: '', subtitle: '', link: '' }
  ])

  // Estados I.A.
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    salesLink: '', 
    salesLink1: '', salesLink2: '', salesLink3: '', salesLink4: '',
    systemPrompt: '', modalTitle: '', modalDescription: '',
    buttonText: '', feature1: '', feature2: '', feature3: '',
    accessMode: 'paid',
    aiProductId: '', 
    hotmartId: '', 
    modalImageUrl: '' 
  })

  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadingAIImage, setUploadingAIImage] = useState(false) 
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      const { data: bannerData } = await supabase.from('site_config').select('value').eq('key', 'home_banners').single()
      if (bannerData?.value) {
        try {
            const parsed = typeof bannerData.value === 'string' ? JSON.parse(bannerData.value) : bannerData.value
            if (Array.isArray(parsed)) setBanners(parsed)
        } catch(e) {}
      }

      const { data: aiData } = await supabase.from('site_config').select('value').eq('key', 'ai_config').single()
      if (aiData?.value) {
        try { 
            const parsed = typeof aiData.value === 'string' ? JSON.parse(aiData.value) : aiData.value
            setAiConfig(prev => ({ ...prev, ...parsed }))
        } catch(e) {}
      }
    }
    if (activeTab !== 'courses') fetchData()
  }, [activeTab])

  // FUNÇÃO DE BLOQUEIO ATUALIZADA
  const handleToggleLock = async (id: string, currentStatus: boolean) => {
    // 1. Atualiza na hora na tela para o usuário sentir que funcionou
    setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, is_locked_by_default: !currentStatus } : p))
    
    try {
      // 2. Envia para o banco de dados
      await toggleProductLock(id, currentStatus)
      router.refresh() // Sincroniza os dados do servidor
    } catch (e: any) {
      // 3. Se der erro, volta o estado anterior
      setLocalProducts(products)
      alert("Erro ao alterar status: " + e.message)
    }
  }

  const handleBannerUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setUploadingIndex(index)
      const fileExt = file.name.split('.').pop()
      const fileName = `banner-${index}-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('site-assets').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName)
      const newBanners = [...banners]; newBanners[index].image = data.publicUrl; setBanners(newBanners)
    } catch (e: any) { alert(e.message) } finally { setUploadingIndex(null) }
  }

  const handleAIModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setUploadingAIImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `ai-modal-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('site-assets').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName)
      setAiConfig(prev => ({ ...prev, modalImageUrl: data.publicUrl }))
    } catch (e: any) { alert(e.message) } finally { setUploadingAIImage(false) }
  }

  const updateBannerField = (index: number, field: keyof BannerConfig, value: string) => {
    const newB = [...banners];
    (newB[index] as any)[field] = value;
    setBanners(newB)
  }

  const saveSettings = async (key: 'home_banners' | 'ai_config', dataValue: any) => {
    setSaving(true)
    try {
      await updateSiteConfig(key, dataValue)
      alert('Configurações salvas com sucesso!')
      router.refresh()
    } catch (e: any) { 
      alert('Erro ao salvar: ' + e.message) 
    } finally { 
      setSaving(false) 
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-[#09090B] rounded-3xl border border-white/5 overflow-hidden shadow-2xl notranslate" translate="no">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0c0c0e] border-r border-white/5 flex flex-col p-4">
        <div className="px-4 mb-8 pt-4">
            <h1 className="text-xl font-black italic tracking-tighter text-white">ADMIN<span className="text-rose-600">.</span></h1>
        </div>
        <nav className="space-y-1 flex-1">
            <button onClick={() => setActiveTab('courses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'courses' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
                <LayoutDashboard size={18} /> Cursos
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'settings' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
                <Settings size={18} /> Banners da Home
            </button>
            <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'ai' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
                <BrainCircuit size={18} /> I.A. & Vendas
            </button>

            <Link 
              href="/portal-gestor-x9z/notifications" 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase text-zinc-500 hover:text-white hover:bg-white/5 transition-all mt-4 border-t border-white/5 pt-6"
            >
                <Megaphone size={18} className="text-rose-500" /> Disparar Notificações
            </Link>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
        
        {/* === ABA CURSOS === */}
        {activeTab === 'courses' && (
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Gerenciar Cursos</h2>
                    <button onClick={() => setEditingItem({ item: {}, type: 'product' })} className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition hover:scale-105 shadow-lg"><Plus size={16}/> Novo Curso</button>
                </div>
                
                <div className="grid gap-6">
                  {localProducts?.map(product => (
                    <div key={product.id} className={`bg-[#121214] border rounded-2xl overflow-hidden transition-all duration-300 ${expandedProduct === product.id ? 'border-white/20 shadow-2xl' : 'border-white/5 hover:border-white/10'}`}>
                      <div className="p-4 flex items-center justify-between cursor-pointer bg-white/[0.02]" onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden relative">
                             {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-zinc-700" size={20}/></div>}
                           </div>
                           <div>
                             <h3 className="font-bold text-zinc-200">{product.title}</h3>
                             <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{product.modules?.length || 0} MÓDULOS</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setEditingItem({ item: product, type: 'product' })
                            }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                            title="Editar curso"
                            >
                            <Edit2 size={16} />
                            </button>
                            
                            {/* BOTÃO DE BLOQUEIO COM A NOVA FUNÇÃO handleToggleLock */}
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleToggleLock(product.id, product.is_locked_by_default);
                                }} 
                                className={`p-2 rounded-lg transition ${product.is_locked_by_default ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}
                                title={product.is_locked_by_default ? "Curso Bloqueado" : "Curso Aberto"}
                            >
                                {product.is_locked_by_default ? <Lock size={16}/> : <Unlock size={16}/>}
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir curso?')) deleteProduct(product.id) }} className="p-2 hover:bg-red-950/30 hover:text-red-500 rounded-lg text-zinc-600 transition"><Trash2 size={16}/></button>
                            <ChevronRight size={18} className={`text-zinc-600 transition-transform duration-300 ${expandedProduct === product.id ? 'rotate-90' : ''}`}/>
                        </div>
                      </div>
                      
                      {expandedProduct === product.id && (
                        <div className="border-t border-white/5 p-4 bg-black/20">
                           <div className="flex justify-between items-center mb-4 px-2">
                             <h4 className="text-xs font-black uppercase text-zinc-500 tracking-widest">Módulos do Curso</h4>
                             <button onClick={() => addModule(product.id, `Módulo ${(product.modules?.length || 0) + 1}`)} className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-400 flex items-center gap-1 transition"><Plus size={12}/> Adicionar Módulo</button>
                           </div>
                           <div className="space-y-3">
                             {product?.modules?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())?.map((module: any) => (
                               <div key={module.id} className="bg-[#18181b] border border-white/5 rounded-xl p-4">
                                  <div className="flex justify-between items-center mb-3">
                                     <h5 className="text-sm font-bold text-zinc-300">{module.title}</h5>
                                     <div className="flex items-center gap-2">
                                        <button onClick={() => setEditingItem({ item: { lesson: {}, moduleId: module.id }, type: 'lesson' })} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-zinc-400 hover:text-white transition">+ Aula</button>
                                        <button onClick={() => { if(confirm('Excluir módulo?')) deleteModule(module.id) }} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                     </div>
                                  </div>
                                  <div className="space-y-1">
                                     {module.lessons?.sort((a:any, b:any) => a.position - b.position).map((lesson: any) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-white/5 border border-transparent hover:border-white/5 group transition cursor-pointer" onClick={() => setEditingItem({ item: lesson, type: 'lesson' })}>
                                           <div className="flex items-center gap-3">
                                              {lesson.type === 'video' ? <Video size={14} className="text-rose-500"/> : <FileText size={14} className="text-blue-500"/>}
                                              <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition">{lesson.title}</span>
                                           </div>
                                           <Edit2 size={12} className="text-zinc-700 group-hover:text-white opacity-0 group-hover:opacity-100 transition"/>
                                        </div>
                                     ))}
                                     {(!module.lessons || module.lessons.length === 0) && <p className="text-[10px] text-zinc-700 italic text-center py-2">Nenhuma aula neste módulo.</p>}
                                  </div>
                               </div>
                             ))}
                             {(!product.modules || product.modules.length === 0) && <p className="text-xs text-zinc-600 text-center py-4 border border-dashed border-white/10 rounded-xl">Sem módulos cadastrados.</p>}
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            </div>
        )}

        {/* === ABA CONFIGURAÇÕES (BANNERS) === */}
        {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Banners da Home</h2>
                    <button onClick={() => saveSettings('home_banners', banners)} disabled={saving} className="bg-white hover:bg-zinc-200 text-black px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition hover:scale-105 shadow-lg shadow-white/10">
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Salvar Alterações
                    </button>
                </div>
                <div className="space-y-8">
                   {banners.map((banner, index) => (
                      <div key={index} className="bg-[#121214] border border-white/5 rounded-2xl p-6 relative group hover:border-white/10 transition-all">
                         <div className="absolute -left-3 -top-3 w-8 h-8 bg-zinc-800 rounded-full border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-lg">{index + 1}</div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                               <div className="aspect-video bg-black/40 rounded-xl border border-white/5 overflow-hidden relative group/img">
                                  {banner.image ? <img src={banner.image} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon size={32}/></div>}
                                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition cursor-pointer">
                                     {uploadingIndex === index ? <Loader2 className="animate-spin text-white"/> : <Upload className="text-white mb-2"/>}
                                     <span className="text-[10px] font-bold text-white uppercase tracking-wider">Alterar Capa</span>
                                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerUpload(index, e)} />
                                  </label>
                               </div>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                               <input value={banner.title} onChange={(e) => updateBannerField(index, 'title', e.target.value)} placeholder="Título do Banner" className="w-full bg-transparent border-b border-white/10 py-2 text-lg font-bold text-white placeholder:text-zinc-700 outline-none focus:border-rose-500 transition"/>
                               <input value={banner.subtitle} onChange={(e) => updateBannerField(index, 'subtitle', e.target.value)} placeholder="Subtítulo ou Descrição curta" className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-zinc-400 placeholder:text-zinc-700 outline-none focus:border-rose-500 transition"/>
                               <div className="flex items-center gap-3">
                                  <LinkIcon size={16} className="text-zinc-600"/>
                                  <input value={banner.link} onChange={(e) => updateBannerField(index, 'link', e.target.value)} placeholder="Link de destino (https://...)" className="flex-1 bg-transparent border-b border-white/10 py-2 text-xs text-rose-400 placeholder:text-zinc-700 outline-none focus:border-rose-500 transition"/>
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
            </div>
        )}

        {/* === ABA I.A. & VENDAS === */}
        {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#09090B]/80 backdrop-blur-xl py-4 z-20 border-b border-white/5">
                    <div>
                        <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3"><Bot className="text-rose-600"/> Configuração I.A.</h2>
                        <p className="text-xs text-zinc-500">Gerencie a venda e a personalidade do seu robô.</p>
                    </div>
                    <button onClick={() => saveSettings('ai_config', aiConfig)} disabled={saving} className="bg-green-500 hover:bg-green-400 text-black px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition hover:scale-105 shadow-lg shadow-green-900/20">
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Salvar Tudo
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2"><Key size={16} className="text-purple-500"/> Modo de Acesso</h3>
                            <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-xl">
                                {['paid', 'free', 'off'].map((mode) => (
                                    <button 
                                        key={mode} 
                                        onClick={() => setAiConfig({...aiConfig, accessMode: mode as any})}
                                        className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${aiConfig.accessMode === mode ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-300'}`}
                                    >
                                        {mode === 'paid' ? 'Pago (Venda)' : mode === 'free' ? 'Gratuito' : 'Desativado'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10"><Tag size={80}/></div>
                             <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={16} className="text-green-500"/> Venda & Hotmart</h3>
                             <div className="space-y-5 relative z-10">
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide ml-1">Produto Interno (Liberação)</label>
                                     <select 
                                        value={aiConfig.aiProductId} 
                                        onChange={(e) => setAiConfig({...aiConfig, aiProductId: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 outline-none appearance-none cursor-pointer hover:bg-black/60 transition"
                                     >
                                        <option value="">Selecione qual "Curso" representa a I.A...</option>
                                        {products?.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                     </select>
                                 </div>
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wide ml-1 flex items-center gap-1"><CreditCard size={12}/> ID do Produto na Hotmart</label>
                                     <input 
                                        value={aiConfig.hotmartId || ''} 
                                        onChange={(e) => setAiConfig({...aiConfig, hotmartId: e.target.value})}
                                        className="w-full bg-rose-950/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-200 focus:border-rose-500 outline-none transition font-mono placeholder:text-rose-900/50" 
                                        placeholder="Ex: 7131963" 
                                     />
                                 </div>
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide ml-1">Link de Acesso I.A. (Checkout)</label>
                                     <input 
                                        value={aiConfig.salesLink} 
                                        onChange={(e) => setAiConfig({...aiConfig, salesLink: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-blue-400 focus:border-blue-500 outline-none transition" 
                                        placeholder="https://pay.hotmart.com/..." 
                                     />
                                 </div>
                             </div>
                        </div>

                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2"><Rocket size={16} className="text-orange-500"/> Sugestões de Venda da I.A.</h3>
                            <div className="space-y-3">
                                {['salesLink1', 'salesLink2', 'salesLink3', 'salesLink4'].map((linkKey, i) => (
                                    <div key={linkKey} className="space-y-1">
                                        <label className="text-[9px] font-bold text-zinc-600 uppercase ml-1">Link Sugestão {i + 1}</label>
                                        <input 
                                            value={(aiConfig as any)[linkKey] || ''} 
                                            onChange={(e) => setAiConfig({...aiConfig, [linkKey]: e.target.value})}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-orange-200 focus:border-orange-500 outline-none transition" 
                                            placeholder="https://..." 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 h-auto">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-yellow-500"/> Personalidade (Prompt)</h3>
                            <textarea 
                                value={aiConfig.systemPrompt} 
                                onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
                                className="w-full h-40 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:border-yellow-500 outline-none transition resize-none custom-scrollbar leading-relaxed" 
                                placeholder="Ex: Você é um especialista em marketing digital..." 
                            />
                        </div>
                    </div>

                    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 relative">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2"><ImageIcon size={16} className="text-pink-500"/> Aparência do Pop-up</h3>
                        <div className="aspect-video bg-black/40 rounded-2xl border border-white/5 mb-6 relative group overflow-hidden">
                            {aiConfig.modalImageUrl ? <img src={aiConfig.modalImageUrl} className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-zinc-700"><ImageIcon size={32}/><span className="text-[10px] uppercase font-bold">Sem Capa</span></div>}
                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                {uploadingAIImage ? <Loader2 className="animate-spin text-white"/> : <Upload className="text-white mb-2"/>}
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Alterar Imagem</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleAIModalImageUpload} />
                            </label>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide ml-1">Título Principal</label>
                                <input value={aiConfig.modalTitle} onChange={(e) => setAiConfig({...aiConfig, modalTitle: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-500 outline-none transition font-bold" placeholder="Ex: I.A. Premium" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide ml-1">Descrição Curta</label>
                                <textarea rows={2} value={aiConfig.modalDescription} onChange={(e) => setAiConfig({...aiConfig, modalDescription: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:border-pink-500 outline-none transition resize-none" placeholder="Ex: Desbloqueie o potencial máximo..." />
                            </div>
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                {[1, 2, 3].map(i => (
                                    <input key={i} value={(aiConfig as any)[`feature${i}`]} onChange={(e) => setAiConfig({...aiConfig, [`feature${i}`]: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-400 focus:border-green-500 outline-none" placeholder={`Benefício ${i}`} />
                                ))}
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide ml-1 mb-2 block">Texto do Botão</label>
                                <input value={aiConfig.buttonText} onChange={(e) => setAiConfig({...aiConfig, buttonText: e.target.value})} className="w-full bg-rose-600/10 border border-rose-600/30 rounded-xl px-4 py-3 text-sm text-rose-500 focus:border-rose-500 outline-none transition font-black text-center uppercase" placeholder="Ex: QUERO DESBLOQUEAR AGORA" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
      
      {editingItem && (
        <EditorModal 
            item={editingItem.item} 
            type={editingItem.type} 
            onClose={() => setEditingItem(null)} 
        />
      )}
    </div>
  )
}