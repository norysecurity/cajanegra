'use client'

import { useState } from 'react'
import { Camera, Mail, User, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/portal-gestor-x9z/actions'
import { useRouter } from 'next/navigation'

export default function ProfileForm({ user, profile }: any) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(profile?.avatar_url || null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      if (imageFile) {
        const fileName = `${user.id}-${Date.now()}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, imageFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        formData.set('avatar_url', publicUrl)
      }

      const result = await updateProfile(formData)
      
      if (result?.error) throw new Error(result.error)
      
      router.refresh()
      alert("Perfil atualizado com sucesso!")
    } catch (error: any) {
      alert('Erro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4 pb-6 border-b border-white/5">
         <div className="relative group w-24 h-24 md:w-32 md:h-32">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-zinc-900 bg-zinc-800 ring-1 ring-white/10">
               {preview ? (
                 <img src={preview} className="w-full h-full object-cover" alt="Avatar" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={40} /></div>
               )}
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-sm cursor-pointer">
                  <Camera size={24} className="text-white" />
               </div>
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
         </div>
         <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] italic">Alterar Foto de Perfil</p>
      </div>

      <div className="space-y-4">
         <div className="space-y-2 opacity-50">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
               <Mail size={12} /> E-mail de Acesso
            </label>
            <input disabled value={user.email} className="w-full bg-zinc-900/30 border border-white/5 rounded-2xl px-5 py-4 text-xs text-zinc-500" />
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

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-white hover:bg-rose-600 text-black hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
        {loading ? 'PROCESSANDO...' : 'SALVAR PERFIL'}
      </button>
    </form>
  )
}
