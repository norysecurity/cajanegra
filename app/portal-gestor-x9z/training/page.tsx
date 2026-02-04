'use client'

import { useState } from 'react'
import { Upload, Brain, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react'

export default function TrainingPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus('idle')
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault() // Impede que a página recarregue
    if (!file) return

    setLoading(true)
    setStatus('idle')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name)

    try {
      const res = await fetch('/api/portal-gestor-x9z/train', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message)
        setFile(null)
      } else {
        setStatus('error')
        setMessage(data.error || 'Erro desconhecido')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto text-zinc-100 pb-32">
      
      <div className="mb-8 flex items-center gap-4">
        <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
            <Brain size={32} className="text-white" />
        </div>
        <div>
            <h1 className="text-3xl font-black italic uppercase">Treinar a Iara</h1>
            <p className="text-zinc-400">Faça upload de PDFs para aumentar o conhecimento da IA.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
        
        <form onSubmit={handleUpload} className="flex flex-col gap-6">
            
            {/* ÁREA DE DRAG & DROP */}
            {/* AQUI ESTAVA O ERRO: Adicionei 'relative' no começo das classes */}
            <div className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${file ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}`}>
                
                {/* O input fica contido APENAS dentro dessa div por causa do 'relative' acima */}
                <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                
                {file ? (
                    <div className="flex flex-col items-center animate-in zoom-in pointer-events-none">
                        <FileText size={48} className="text-rose-500 mb-4" />
                        <p className="text-lg font-bold text-white">{file.name}</p>
                        <p className="text-sm text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-zinc-500 pointer-events-none">
                        <Upload size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Clique ou arraste um PDF aqui</p>
                        <p className="text-xs mt-2 opacity-50">Suporta apenas arquivos .PDF</p>
                    </div>
                )}
            </div>

            {/* BOTÃO DE AÇÃO */}
            {/* Adicionei 'z-20' para garantir que ele fique ACIMA de tudo */}
            <button 
                type="submit" 
                disabled={!file || loading}
                className={`
                    relative z-20 
                    w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all
                    flex items-center justify-center gap-2
                    ${!file || loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 cursor-pointer'}
                `}
            >
                {loading ? (
                    <><Loader2 className="animate-spin" /> Processando Conhecimento...</>
                ) : (
                    <><Brain size={20} /> Iniciar Treinamento</>
                )}
            </button>
        </form>

        {/* FEEDBACK DE STATUS */}
        {status === 'success' && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 animate-in slide-in-from-top-2">
                <CheckCircle size={24} />
                <div>
                    <p className="font-bold">Sucesso!</p>
                    <p className="text-xs opacity-80">{message}</p>
                </div>
            </div>
        )}

        {status === 'error' && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                <AlertCircle size={24} />
                <div>
                    <p className="font-bold">Erro</p>
                    <p className="text-xs opacity-80">{message}</p>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}