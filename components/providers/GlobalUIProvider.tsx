'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Info, Trash2, AlertTriangle } from 'lucide-react'

// --- TIPOS ---
type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'neutral'
  onConfirm: () => Promise<void> | void
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void
  confirm: (options: ConfirmOptions) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

// --- HOOK PARA USAR EM QUALQUER PÁGINA ---
export function useUI() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI deve ser usado dentro de um GlobalUIProvider')
  return context
}

// --- COMPONENTE PROVIDER ---
export function GlobalUIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; options: ConfirmOptions | null }>({
    isOpen: false,
    options: null
  })

  // Adicionar Toast
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
    
    // Remove automático após 3 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Abrir Confirmação
  const confirm = (options: ConfirmOptions) => {
    setConfirmState({ isOpen: true, options })
  }

  // Fechar Confirmação
  const closeConfirm = () => {
    setConfirmState({ isOpen: false, options: null })
  }

  const handleConfirmAction = async () => {
    if (confirmState.options?.onConfirm) {
      await confirmState.options.onConfirm()
    }
    closeConfirm()
  }

  return (
    <UIContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* --- AREA DE TOASTS (NOTIFICAÇÕES) --- */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              layout
              className="pointer-events-auto bg-[#18181B] border border-white/10 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] backdrop-blur-xl"
            >
              <div className={`p-2 rounded-full ${
                toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                toast.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {toast.type === 'success' && <Check size={16} />}
                {toast.type === 'error' && <AlertCircle size={16} />}
                {toast.type === 'info' && <Info size={16} />}
              </div>
              <span className="text-sm font-medium">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto text-zinc-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      <AnimatePresence>
        {confirmState.isOpen && confirmState.options && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeConfirm}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#18181B] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-full ${confirmState.options.variant === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-zinc-800 text-white'}`}>
                  {confirmState.options.variant === 'danger' ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-white">{confirmState.options.title}</h3>
                  {confirmState.options.description && (
                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{confirmState.options.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <button 
                    onClick={closeConfirm}
                    className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm transition-colors"
                  >
                    {confirmState.options.cancelText || 'Cancelar'}
                  </button>
                  <button 
                    onClick={handleConfirmAction}
                    className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors ${
                      confirmState.options.variant === 'danger' 
                        ? 'bg-rose-600 hover:bg-rose-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {confirmState.options.confirmText || 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  )
}