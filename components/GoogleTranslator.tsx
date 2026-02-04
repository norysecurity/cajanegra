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

    // 2. Injeção do Script com Verificação
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    // 3. Polling para verificar se o Google injetou o seletor
    const checkReady = setInterval(() => {
      const select = document.querySelector('.goog-te-combo')
      if (select) {
        setIsReady(true)
        clearInterval(checkReady)
      }
    }, 500)

    // 4. Timeout de Segurança: Se em 10s não carregar, para o loader (evita trava infinita)
    const timeout = setTimeout(() => {
      if (!isReady) {
        clearInterval(checkReady)
        // Opcional: setIsReady(true) aqui permitiria mostrar os botões mesmo com erro
      }
    }, 10000)

    // 5. CSS para esconder barras indesejadas do Google
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
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        {isOpen && (
          <div className="bg-[#121214] border border-white/10 p-4 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 w-48 mb-2">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Traduzir App</span>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={14}/>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {isReady ? (
                <>
                  <button 
                    onClick={() => translateTo('en')}
                    className="w-full py-3 bg-white/5 hover:bg-rose-600 text-white text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    🇺🇸 English
                  </button>
                  <button 
                    onClick={() => translateTo('es')}
                    className="w-full py-3 bg-white/5 hover:bg-rose-600 text-white text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    🇪🇸 Español
                  </button>
                  <button 
                    onClick={() => translateTo('pt')}
                    className="w-full py-2 mt-1 text-zinc-500 text-[9px] font-black uppercase hover:text-white transition-colors tracking-widest"
                  >
                    Original (PT)
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center py-4 gap-2">
                  <Loader2 size={20} className="animate-spin text-rose-600" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Sincronizando...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 border-2 border-white/5 ${
            isOpen ? 'bg-white text-black' : 'bg-rose-600 text-white shadow-rose-600/20'
          }`}
        >
          <Languages size={24} />
        </button>
      </div>

      <div id="google_translate_element" className="hidden"></div>
    </>
  )
}