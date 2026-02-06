'use client'

import { useEffect, useState } from 'react'
import { Languages, X, Loader2 } from 'lucide-react'

export default function GoogleTranslator() {
  const [isOpen, setIsOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 1. Função de inicialização
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'pt',
          includedLanguages: 'en,es',
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      )
    }

    // 2. Injeção do Script
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    // 3. Verificação
    const checkReady = setInterval(() => {
      const select = document.querySelector('.goog-te-combo')
      if (select) {
        setIsReady(true)
        clearInterval(checkReady)
      }
    }, 500)

    const timeout = setTimeout(() => {
      if (!isReady) clearInterval(checkReady)
    }, 10000)

    // 4. CSS para esconder barras
    const style = document.createElement('style')
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate, .goog-te-gadget-icon { display: none !important; }
      body { top: 0px !important; }
      .goog-tooltip { display: none !important; }
      .goog-tooltip:hover { display: none !important; }
      .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      #google_translate_element { display: none !important; }
      .VIpgJd-Zvi9fq-OR6BHe-it38af { display: none !important; }
    `
    document.head.appendChild(style)

    return () => {
      clearInterval(checkReady)
      clearTimeout(timeout)
    }
  }, [])

  const translateTo = (langCode: string) => {
    const googleSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement
    if (googleSelect) {
      googleSelect.value = langCode
      googleSelect.dispatchEvent(new Event('change'))
    }
  }

  return (
    <>
      {/* ALTERAÇÃO AQUI: 
          - 'hidden': Esconde o botão por padrão (no mobile).
          - 'md:flex': Mostra o botão (display: flex) apenas em telas médias ou maiores (PC/Tablet).
      */}
      <div className="hidden md:flex fixed bottom-4 left-4 z-[9999] flex-col items-start gap-2">
        {isOpen && (
          <div className="bg-[#121214] border border-white/10 p-3 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200 w-40 mb-1 backdrop-blur-md">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Traduzir</span>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={12}/>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {isReady ? (
                <>
                  <button 
                    onClick={() => translateTo('en')}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    🇺🇸 English
                  </button>
                  <button 
                    onClick={() => translateTo('es')}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    🇪🇸 Español
                  </button>
                  <button 
                    onClick={() => translateTo('pt')}
                    className="w-full py-1.5 mt-1 text-zinc-500 text-[8px] font-black uppercase hover:text-white transition-colors tracking-widest"
                  >
                    Original (PT)
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center py-2 gap-1">
                  <Loader2 size={16} className="animate-spin text-zinc-500" />
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-9 h-9 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 border border-white/10 backdrop-blur-sm ${
            isOpen ? 'bg-white text-black' : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
          }`}
        >
          <Languages size={16} />
        </button>
      </div>

      <div id="google_translate_element" className="hidden"></div>
    </>
  )
}