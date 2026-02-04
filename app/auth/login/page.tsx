'use client'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, Suspense } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'info'|'error'|'success'} | null>(null)
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailHotmart = searchParams.get('email') || searchParams.get('buyer_email') || searchParams.get('off_email')
    if (emailHotmart) {
      setEmail(emailHotmart)
      setMessage({ text: '¡Correo identificado! Confirma para entrar.', type: 'success' })
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    const emailTrim = email.trim().toLowerCase()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

    try {
      // 1. TENTATIVA PRINCIPAL: Login via Link Mágico (OTP)
      // Se o utilizador não existir, o Supabase tenta criá-lo automaticamente
      const { error } = await supabase.auth.signInWithOtp({
        email: emailTrim,
        options: { 
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      })

      if (error) {
        // 2. PLANO B: Se o erro for restrição de cadastro, forçamos o SignUp com senha aleatória
        if (error.message?.toLowerCase().includes("sign up") || error.message?.toLowerCase().includes("not found")) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: emailTrim,
            password: Math.random().toString(36).slice(-12) + "Aa1!", // Senha complexa aleatória para o TS
            options: { emailRedirectTo: `${siteUrl}/auth/callback` },
          })
          
          if (signUpError) throw signUpError
          setMessage({ text: '¡Cuenta creada! Revisa tu correo.', type: 'success' })
          return
        }
        throw error
      }

      setMessage({ text: '¡Enlace enviado! Revisa tu correo.', type: 'success' })
    } catch (error: any) {
      setMessage({ text: 'Error: ' + error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-sm">
      <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm" />

        <div className="text-center space-y-2">
          <div className="relative mx-auto w-48 h-48 flex items-center justify-center -mb-4">
              <div className="absolute inset-10 bg-rose-900/20 rounded-full blur-3xl z-0" />
              <div 
                 className="relative w-full h-full z-10"
                 style={{
                   maskImage: 'radial-gradient(circle, black 40%, transparent 95%)',
                   WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 95%)'
                 }}
              >
                <Image 
                  src="/logo.png" 
                  alt="CAJA NEGRA Logo" 
                  fill
                  className="object-contain scale-90 drop-shadow-2xl"
                  priority
                />
              </div>
          </div>
          
          <div className="space-y-2 relative z-20">
            <h1 className="text-xl font-bold text-white tracking-tight uppercase italic">Bienvenido a Caja Negra</h1>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                {message?.type === 'success' ? 'Link enviado com sucesso' : 'Acede ou cria a tua conta agora'}
            </p>
          </div>
        </div>
        
        {message && (
          <div className={`mt-6 p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-tighter border animate-in fade-in slide-in-from-bottom-2 relative z-20
            ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/10' : 
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 
              'bg-blue-500/10 text-blue-400 border-blue-500/10'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-4 relative z-20">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
            <input
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-800 outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all font-medium"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-black border border-rose-600/30 text-rose-500 hover:text-rose-400 hover:bg-zinc-900/80 hover:border-rose-500/50 font-black py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2 shadow-lg shadow-rose-900/30 text-[11px] tracking-[0.2em] uppercase italic"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
              <>
                {message?.type === 'success' ? 'Verifica o E-mail' : 'Entrar na Plataforma'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center">
          <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.3em]">
              Ambiente Seguro • CAJA NEGRA
          </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030303] overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-rose-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <Suspense fallback={<div className="text-rose-500 text-[10px] font-black tracking-widest uppercase animate-pulse">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}