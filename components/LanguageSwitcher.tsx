'use client'

import { useEffect, useState, useRef } from 'react'
import { Languages, Check, ChevronDown, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LanguageSwitcher({ isMobile = false }: { isMobile?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('pt')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 1. Inicializa o Google Translate
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'pt',
          includedLanguages: 'en,es,pt',
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      )
    }

    // 2. Carrega o Script
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    // 3. CSS "Inteligente" - Esconde visualmente mas mantém funcional
    const style = document.createElement('style')
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate { display: none !important; } 
      body { top: 0px !important; position: static !important; } 
      
      /* AQUI ESTÁ O TRUQUE: Não use display:none no container, senão o JS falha */
      #google_translate_element { 
        width: 0px; 
        height: 0px; 
        overflow: hidden; 
        position: absolute; 
        left: -9999px;
        visibility: hidden;
      }
      
      .goog-te-gadget { display: none !important; }
      .goog-tooltip { display: none !important; }
      .goog-tooltip:hover { display: none !important; }
      .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      .VIpgJd-Zvi9fq-OR6BHe-it38af { display: none !important; }
    `
    document.head.appendChild(style)

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 4. FUNÇÃO ROBUSTA DE TROCA
  const changeLanguage = (langCode: string) => {
    // Tenta encontrar o select do Google
    const googleSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement
    
    if (googleSelect) {
      // Define o valor (se for PT, limpa para voltar ao original)
      googleSelect.value = langCode === 'pt' ? '' : langCode
      
      // Dispara eventos para o Google "acordar"
      googleSelect.dispatchEvent(new Event('change'))
      googleSelect.dispatchEvent(new Event('input'))
      
      // Atualiza estado visual
      setCurrentLang(langCode)
      setIsOpen(false)
    } else {
      // Fallback: Se o select não estiver pronto, tenta recarregar a página com o cookie
      // Isso raramente acontece, mas resolve casos extremos
      document.cookie = `googtrans=/auto/${langCode}; path=/; domain=${window.location.hostname}`
      window.location.reload()
    }
  }

  const languages = [
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ]

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Container invisível (mas existente) para o Google injetar o código */}
      <div id="google_translate_element"></div>

      {/* BOTÃO */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center transition-all active:scale-90 ${
            isMobile 
            ? 'flex-col gap-1 w-12 h-12 text-zinc-600 hover:text-white' 
            : 'flex-row gap-2 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 px-3 py-2 rounded-full text-zinc-300 hover:text-white'
        }`}
      >
        {isMobile ? (
            <Languages size={22} strokeWidth={2} />
        ) : (
            <>
                <Globe size={16} className={currentLang !== 'pt' ? 'text-rose-500' : ''} />
                <span className="text-[10px] font-bold uppercase hidden sm:block">{currentLang}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </>
        )}
      </button>

      {/* DROPDOWN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: isMobile ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute ${isMobile ? 'bottom-full mb-4 -left-10' : 'top-full mt-2 right-0'} w-40 bg-[#121214] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-[100]`}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{lang.flag}</span>
                  <span className={`font-bold uppercase tracking-wide ${currentLang === lang.code ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                    {lang.label}
                  </span>
                </div>
                {currentLang === lang.code && <Check size={12} className="text-rose-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}