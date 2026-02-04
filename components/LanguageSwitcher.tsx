'use client'

import { useState, useEffect } from 'react'

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState('pt')

  // Ao carregar, verifica qual idioma está ativo no cookie do Google
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const langCookie = cookies.find(c => c.trim().startsWith('googtrans='))
    if (langCookie) {
      const langCode = langCookie.split('/').pop()
      if (langCode) setCurrentLang(langCode)
    }
  }, [])

  // Função que troca o idioma
  const changeLanguage = (lang: string) => {
    // Define o cookie que o Google Translate lê
    document.cookie = `googtrans=/pt/${lang}; path=/; domain=${window.location.hostname}`
    document.cookie = `googtrans=/pt/${lang}; path=/;` // Fallback para localhost

    setCurrentLang(lang)
    window.location.reload() // Recarrega para aplicar a tradução
  }

  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-lg">
      <button
        onClick={() => changeLanguage('pt')}
        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
          currentLang === 'pt' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
        }`}
      >
        🇧🇷 PT
      </button>
      
      <button
        onClick={() => changeLanguage('es')}
        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
          currentLang === 'es' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-zinc-500 hover:text-white'
        }`}
      >
        🇪🇸 ES
      </button>

      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
          currentLang === 'en' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-zinc-500 hover:text-white'
        }`}
      >
        🇺🇸 EN
      </button>
    </div>
  )
}