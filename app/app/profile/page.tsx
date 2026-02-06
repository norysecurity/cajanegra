'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Camera, Edit2, Shield, User, MapPin, 
  Calendar, Award, Zap, ChevronLeft, LogOut, Lock 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import ProfileForm from './ProfileForm'
import { useUI } from '@/components/providers/GlobalUIProvider' // <--- 1. IMPORTAÇÃO

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const supabase = createClient()
  const { showToast } = useUI() // <--- 2. HOOK

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      // Perfil
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      
      setProfile(data || {
        full_name: user.email?.split('@')[0],
        avatar_url: null,
        cover_url: null, // Garante que pega a capa
        cover_position: 50, // Garante posição padrão
        email: user.email,
        role: 'student'
      })

      // Assinatura (Premium)
      const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')
      
      setIsPremium((count || 0) > 0)
      setLoading(false)
    }
    getData()
  }, [])

  // Ação do botão da câmera (Visualização)
  const handlePhotoClick = () => {
      showToast('Para alterar a foto ou capa, clique em "Editar Perfil".', 'info')
  }

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-zinc-500 animate-pulse">Carregando...</div>

  // MODO EDIÇÃO
  if (isEditing) {
    return (
        <div className="min-h-screen bg-[#09090B] p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-2xl">
                <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition">
                    <ChevronLeft size={20} /> Voltar ao Perfil
                </button>
                <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Editar Informações</h2>
                    <ProfileForm user={user} profile={profile} /> 
                </div>
            </div>
        </div>
    )
  }

  // MODO VISUALIZAÇÃO
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 pb-32">
      
      <div className="max-w-5xl mx-auto md:px-8">
        
        {/* CAPA + CABEÇALHO */}
        <div className="relative mb-24">
            
            {/* 3. CAPA DINÂMICA COM POSIÇÃO */}
            <div className={`h-48 md:h-64 md:rounded-b-3xl relative overflow-hidden bg-zinc-900 border-b border-white/5`}>
                {profile?.cover_url ? (
                    <img 
                        src={profile.cover_url} 
                        className="w-full h-full object-cover"
                        // AQUI ESTÁ A MÁGICA: Aplica a posição Y salva no banco (0-100%)
                        style={{ objectPosition: `center ${profile.cover_position || 50}%` }}
                        alt="Capa do perfil"
                    />
                ) : (
                    // Fallback se não tiver capa (Gradiente original)
                    <div className={`absolute inset-0 ${isPremium ? 'bg-gradient-to-r from-rose-900 via-purple-900 to-[#0F0F10]' : 'bg-gradient-to-b from-zinc-800 to-[#0F0F10]'}`}>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>
                )}

                {isPremium && <div className="absolute top-4 right-4 bg-rose-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-lg border border-white/10 flex items-center gap-1 z-10"><Zap size={10} fill="currentColor"/> Membro Elite</div>}
            </div>

            {/* Avatar e Infos */}
            <div className="absolute -bottom-16 left-6 md:left-10 flex items-end gap-6">
                <div className="relative group">
                    <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-[#09090B] bg-[#18181B] overflow-hidden ${isPremium ? 'ring-2 ring-rose-500 ring-offset-4 ring-offset-[#09090B]' : ''}`}>
                        <img 
                            src={profile?.avatar_url || "https://i.pravatar.cc/150?u=me"} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Botão de Trocar Foto (Com Toast) */}
                    <div 
                        onClick={handlePhotoClick}
                        className="absolute bottom-2 right-2 bg-zinc-900 text-white p-2 rounded-full border border-white/10 shadow-lg cursor-pointer hover:bg-rose-600 transition"
                    >
                        <Camera size={16} />
                    </div>
                </div>
                
                <div className="pb-2">
                    <h1 className="text-2xl md:text-4xl font-black text-white flex items-center gap-2 italic tracking-tight">
                        {profile?.full_name}
                        {profile?.role === 'admin' && <Shield size={24} className="text-rose-500 fill-rose-500/20" />}
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base font-medium flex items-center gap-2">
                        {isPremium ? <span className="text-rose-400 flex items-center gap-1"><Zap size={14} fill="currentColor"/> Assinante Ativo</span> : "Plano Gratuito"}
                    </p>
                </div>
            </div>

            {/* Botão Editar (Desktop) */}
            <div className="absolute -bottom-12 right-6 hidden md:flex gap-3">
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition shadow-lg text-sm uppercase tracking-wide">
                    <Edit2 size={16} /> Editar Perfil
                </button>
            </div>
        </div>

        {/* Botão Editar (Mobile) */}
        <div className="px-6 mb-8 md:hidden">
             <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition border border-white/5">
                <Edit2 size={16} /> Editar Perfil
            </button>
        </div>

        {/* GRID DE CONTEÚDO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
            
            {/* Coluna Esquerda: Detalhes */}
            <div className="bg-[#0F0F10] border border-white/5 rounded-[24px] p-6 space-y-6 h-fit">
                <div>
                    <h3 className="text-white font-bold mb-4 text-lg flex items-center gap-2"><User size={18}/> Sobre</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm p-3 bg-white/5 rounded-xl border border-white/5">
                            <User size={18} className="text-rose-600" />
                            <span className="truncate">{profile?.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-zinc-400 text-sm p-3 bg-white/5 rounded-xl border border-white/5">
                            <MapPin size={18} className="text-rose-600" />
                            <span>Brasil</span>
                        </div>

                        <div className="flex items-center gap-3 text-zinc-400 text-sm p-3 bg-white/5 rounded-xl border border-white/5">
                            <Calendar size={18} className="text-rose-600" />
                            <span>Membro desde 2024</span>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                     <SignOutButton />
                </div>
            </div>

            {/* Coluna Direita: Gamification */}
            <div className="md:col-span-2 space-y-6">
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0F0F10] border border-white/5 rounded-[24px] p-6 flex flex-col justify-between hover:border-white/10 transition group cursor-default">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition border border-emerald-500/20">
                            <Award size={24} />
                        </div>
                        <div>
                            <span className="text-3xl md:text-4xl font-black text-white block tracking-tighter">0</span>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Certificados</span>
                        </div>
                    </div>
                    <div className="bg-[#0F0F10] border border-white/5 rounded-[24px] p-6 flex flex-col justify-between hover:border-white/10 transition group cursor-default">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition border border-blue-500/20">
                            <Zap size={24} />
                        </div>
                        <div>
                            <span className="text-3xl md:text-4xl font-black text-white block tracking-tighter">0%</span>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Conclusão</span>
                        </div>
                    </div>
                </div>

                {/* Jornada / Progresso */}
                <div className="bg-[#0F0F10] border border-white/5 rounded-[24px] p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-white font-bold text-lg">Sua Jornada</h3>
                        <span className="text-xs text-emerald-400 uppercase font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Nível Iniciante</span>
                    </div>
                    
                    <div className="relative px-2">
                        {/* Linha */}
                        <div className="absolute top-6 left-0 right-0 h-1 bg-zinc-800 -z-0 rounded-full"></div>
                        
                        <div className="flex justify-between relative z-10">
                            {[1,2,3,4,5].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-3 group">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-[#0F0F10] transition-all shadow-lg ${i === 1 ? 'bg-rose-600 text-white scale-110' : 'bg-zinc-800 text-zinc-600'}`}>
                                        {i === 1 ? <Zap size={20} fill="currentColor" /> : <Lock size={16} />}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${i === 1 ? 'text-white' : 'text-zinc-700'}`}>Fase {i}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>

      </div>

    </div>
  )
}