'use client'

import { useState, useRef } from 'react'
import { Camera, Mail, User, Save, Loader2, Image as ImageIcon, Move } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/portal-gestor-x9z/actions'
import { useRouter } from 'next/navigation'
import { useUI } from '@/components/providers/GlobalUIProvider'

export default function ProfileForm({ user, profile }: any) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useUI()

  // --- ESTADOS ---
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [coverPreview, setCoverPreview] = useState(profile?.cover_url || null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  
  // Estado da Posição da Capa (0 a 100%)
  const [coverPosition, setCoverPosition] = useState<number>(profile?.cover_position || 50)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  
  // Refs para calcular o movimento
  const coverRef = useRef<HTMLDivElement>(null)

  // --- HANDLERS DE ARQUIVO ---
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
      setCoverPosition(50) // Reseta para o centro ao trocar imagem
    }
  }

  // --- LÓGICA DE ARRASTAR (DRAG) ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setStartY(clientY)
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    
    // Previne comportamento padrão de arrastar imagem do navegador
    if ('preventDefault' in e) e.preventDefault()

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaY = clientY - startY
    const containerHeight = coverRef.current?.offsetHeight || 1
    
    // Sensibilidade do movimento
    const movementPercent = (deltaY / containerHeight) * 100 * -0.5 

    setCoverPosition(prev => {
        const newPos = prev + movementPercent
        // Limita entre 0% (topo) e 100% (fundo)
        return Math.min(Math.max(newPos, 0), 100)
    })
    
    setStartY(clientY)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      // Envia a posição da capa calculada
      formData.set('cover_position', Math.round(coverPosition).toString())

      // 1. Upload Avatar
      if (avatarFile) {
        const fileName = `avatar-${user.id}-${Date.now()}`
        const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
        if (error) throw error
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        formData.set('avatar_url', data.publicUrl)
      }

      // 2. Upload Capa
      if (coverFile) {
        const fileName = `cover-${user.id}-${Date.now()}`
        const { error } = await supabase.storage.from('avatars').upload(fileName, coverFile)
        if (error) throw error
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        formData.set('cover_url', data.publicUrl)
      }

      const result = await updateProfile(formData)
      if (result?.error) throw new Error(result.error)
      
      router.refresh()
      showToast("Perfil atualizado com sucesso!", "success")
      
    } catch (error: any) {
      showToast('Erro: ' + error.message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* --- ÁREA VISUAL (CAPA + AVATAR) --- */}
      <div className="relative mb-16 select-none">
        
        {/* Container da Capa */}
        <div 
            ref={coverRef}
            className={`group relative w-full h-40 md:h-52 bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
        >
            {coverPreview ? (
                <img 
                    src={coverPreview} 
                    className="w-full h-full object-cover transition-none pointer-events-none" 
                    style={{ objectPosition: `center ${coverPosition}%` }} // A MÁGICA ACONTECE AQUI
                    alt="Capa" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            )}
            
            {/* Aviso de Arrastar (Só aparece se tiver imagem) */}
            {coverPreview && (
                <div className={`absolute top-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase text-white flex items-center gap-2 border border-white/10 transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                    <Move size={12} /> Arraste para ajustar
                </div>
            )}

            {/* Input da Capa (Botão visível apenas no hover se não estiver arrastando) */}
            <div className={`absolute bottom-3 right-3 transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                 <label className="bg-black/60 hover:bg-rose-600 backdrop-blur-md p-2 rounded-full text-white border border-white/10 cursor-pointer flex transition-colors shadow-lg">
                    <ImageIcon size={18} />
                    <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                 </label>
            </div>
        </div>

        {/* Input do Avatar (Sobreposto) */}
        <div className="absolute -bottom-12 left-6 md:left-10 pointer-events-auto">
            <div className="relative group w-24 h-24 md:w-32 md:h-32">
                <div className="w-full h-full rounded-full overflow-hidden border-[4px] border-[#121214] bg-zinc-800 ring-1 ring-white/10 shadow-2xl">
                    {avatarPreview ? (
                        <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={32} /></div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-sm cursor-pointer">
                        <Camera size={24} className="text-white" />
                    </div>
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 rounded-full" />
            </div>
        </div>
      </div>

      {/* --- CAMPOS DE TEXTO --- */}
      <div className="space-y-5 pt-4">
         <div className="space-y-2 opacity-50 cursor-not-allowed">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
               <Mail size={12} /> E-mail de Acesso
            </label>
            <input disabled value={user.email} className="w-full bg-zinc-900/30 border border-white/5 rounded-2xl px-5 py-4 text-xs text-zinc-500 cursor-not-allowed" />
         </div>

         <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-300 tracking-widest flex items-center gap-2">
               <User size={12} /> Nome Completo
            </label>
            <input 
               name="full_name"
               defaultValue={profile?.full_name || ''}
               className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-rose-500/50 transition" 
            />
         </div>
      </div>

      {/* --- BOTÃO SALVAR --- */}
      <div className="pt-4 border-t border-white/5">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white hover:bg-rose-600 text-black hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          >
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
            {loading ? 'SALVANDO ALTERAÇÕES...' : 'SALVAR PERFIL'}
          </button>
      </div>
    </form>
  )
}