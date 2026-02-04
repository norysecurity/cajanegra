'use client'

import { useState } from 'react'
import { updateContent } from './actions'
import { X, Save, Loader2, Video, FileText, Link as LinkIcon, DollarSign, Key, Image as ImageIcon, Clock } from 'lucide-react'

export default function EditorModal({ item, type, onClose }: any) {
  const [loading, setLoading] = useState(false)
  const [lessonType, setLessonType] = useState(item.type || 'video')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)

    // --- CORREÇÃO DO LINK DE VENDA ---
    // Garante que o link gravado não tenha espaços invisíveis que causam erro na Hotmart
    const rawSalesLink = formData.get('sales_page_url') as string
    if (rawSalesLink) {
      formData.set('sales_page_url', rawSalesLink.trim())
    }

    try {
      await updateContent(formData)
      onClose()
    } catch (err) {
      alert("Erro ao salvar: " + err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161618] border border-white/5 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">

        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-[#121214]">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            {type === 'product'
              ? <div className="p-1.5 bg-rose-600 rounded-lg"><DollarSign size={14} /></div>
              : <div className="p-1.5 bg-blue-600 rounded-lg"><Video size={14} /></div>
            }
            Editar {type === 'product' ? 'Curso / Produto' : 'Conteúdo da Aula'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="entity_type" value={type} />

          {type === 'lesson' && (
            <input
              type="hidden"
              name="moduleId"
              value={item.moduleId || ''}
            />
          )}

          {/* === SE FOR PRODUTO === */}
          {type === 'product' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Nome do Curso</label>
                <input
                  name="title"
                  defaultValue={item.title}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-rose-600/50 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Capa (URL da Imagem)</label>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose-600/50 transition">
                  <ImageIcon size={14} className="text-zinc-600" />
                  <input
                    name="image_url"
                    defaultValue={item.image_url}
                    placeholder="https://..."
                    className="bg-transparent w-full text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-rose-400 ml-1 tracking-widest flex items-center gap-1">
                    <Key size={10} /> ID Hotmart
                  </label>
                  <input
                    name="hotmart_id"
                    defaultValue={item.hotmart_id || ''}
                    placeholder="Ex: 1234567"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-600/50 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-rose-400 ml-1 tracking-widest flex items-center gap-1">
                    <DollarSign size={10} /> Link de Venda
                  </label>
                  <input
                    name="sales_page_url"
                    defaultValue={item.sales_page_url || ''}
                    placeholder="https://pay.hotmart.com/..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-600/50 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Descrição Curta</label>
                <textarea
                  name="description"
                  defaultValue={item.description}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-rose-600/50 transition resize-none"
                />
              </div>
            </>
          )}

          {/* === SE FOR AULA === */}
          {type === 'lesson' && (
            <>
              <input type="hidden" name="type" value={lessonType} />

              <div className="flex gap-4">
                <div className="flex-[2] space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Título da Aula</label>
                  <input
                    name="title"
                    defaultValue={item.title}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-rose-600/50 transition"
                    required
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Duração (min)</label>
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose-600/50 transition">
                    <Clock size={14} className="text-zinc-600" />
                    <input
                      name="duration"
                      type="number"
                      defaultValue={item.duration || 0}
                      className="bg-transparent w-full text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
                {['video', 'text', 'pdf'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLessonType(t)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition ${lessonType === t ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {lessonType === 'video' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Link do Vídeo</label>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose-600/50 transition">
                      <Video size={14} className="text-zinc-600" />
                      <input
                        name="video_url"
                        defaultValue={item.video_url}
                        placeholder="https://..."
                        className="bg-transparent w-full text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Capa / Thumbnail</label>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose-600/50 transition">
                      <ImageIcon size={14} className="text-zinc-600" />
                      <input
                        name="image_url"
                        defaultValue={item.image_url}
                        placeholder="https://..."
                        className="bg-transparent w-full text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {lessonType === 'pdf' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Link do PDF (Google Drive)</label>
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose-600/50 transition">
                    <LinkIcon size={14} className="text-zinc-600" />
                    <input
                      name="video_url"
                      defaultValue={item.video_url || item.image_url}
                      placeholder="https://drive.google.com/..."
                      className="bg-transparent w-full text-xs text-white outline-none"
                    />
                  </div>
                  <input type="hidden" name="image_url" value={item.image_url || ''} />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Conteúdo / Descrição</label>
                <textarea
                  name="content"
                  defaultValue={item.content}
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-rose-600/50 transition resize-none"
                />
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-zinc-500 bg-white/5 hover:bg-white/10 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-white hover:bg-rose-600 text-black hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 shadow-xl shadow-rose-900/0 hover:shadow-rose-900/20"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Save size={14} /> Salvar Alterações
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}