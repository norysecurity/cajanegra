'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import webpush from 'web-push' 

// --- CONFIGURAÇÃO WEB PUSH ---
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@seusite.com', 
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

function formatYoutubeUrl(url: string) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
}

// --- FUNÇÃO AUXILIAR PARA LIMPAR O CACHE GERAL ---
function revalidateAll() {
  revalidatePath('/portal-gestor-x9z', 'layout') 
  revalidatePath('/app', 'layout')   
  revalidatePath('/', 'layout')      
}

// --- CONFIGURAÇÕES DO SITE (BANNER FIX) ---
export async function updateSiteConfig(key: string, value: any) {
  const supabase = await createClient()
  
  let jsonValue = value
  if (typeof value === 'string') {
    try { 
      jsonValue = JSON.parse(value) 
    } catch(e) { 
      jsonValue = value 
    }
  }

  const { error } = await supabase.from('site_config').upsert({ 
    key, 
    value: jsonValue 
  }, { onConflict: 'key' })

  if (error) throw new Error(error.message)
  
  revalidateAll()
  return { success: true }
}

// --- PRODUTOS (CURSOS) ---
export async function createProduct(title: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({ 
    title, 
    image_url: '', 
    is_locked_by_default: true,
    description: '' 
  })
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function toggleProductLock(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').update({ is_locked_by_default: !currentStatus }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

// --- MÓDULOS ---
export async function addModule(productId: string, title: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('modules').insert({ product_id: productId, title })
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteModule(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('modules').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

// --- AULAS ---
export async function addLesson(moduleId: string, title: string, type: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lessons').insert({ 
    module_id: moduleId, 
    title, 
    type, 
    position: 0 
  })
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteLesson(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

// --- EDIÇÃO E CADASTRO DE CONTEÚDO (UNIFICADO) ---
export async function updateContent(formData: FormData) {
  const supabase = await createClient()
  const rawId = formData.get('id') as string
  const id = (rawId && rawId !== 'undefined' && rawId !== '' && rawId !== 'null') ? rawId : null
  const entityType = formData.get('entity_type') as string 
  const title = (formData.get('title') as string) || 'Sem Título'
  const imageUrl = (formData.get('image_url') as string) || ''
  const content = (formData.get('content') as string) || (formData.get('description') as string) || ''

  try {
    if (entityType === 'product') {
      const productPayload = {
        title,
        description: content,
        image_url: imageUrl,
        hotmart_id: (formData.get('hotmart_id') as string) || null,
        sales_page_url: (formData.get('sales_page_url') as string) || null,
        is_locked_by_default: true
      }
      if (id) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(productPayload)
        if (error) throw error
      }
    } else {
      const lessonType = (formData.get('type') as string) || 'video'
      let videoUrl = (formData.get('video_url') as string) || ''
      const duration = Number(formData.get('duration') || 0)
      const moduleId = formData.get('moduleId') as string 

      if (lessonType === 'video') videoUrl = formatYoutubeUrl(videoUrl)

      const lessonPayload = {
        title,
        content,
        video_url: videoUrl,
        image_url: imageUrl,
        duration,
        type: lessonType
      }
      if (id) {
        const { error } = await supabase.from('lessons').update(lessonPayload).eq('id', id)
        if (error) throw error
      } else {
        if (!moduleId) throw new Error("ID do módulo não fornecido.")
        const { error } = await supabase.from('lessons').insert({
          ...lessonPayload,
          module_id: moduleId,
          position: 0
        })
        if (error) throw error
      }
    }
    revalidateAll()
    return { success: true }
  } catch (error: any) {
    throw new Error(error.message || "Erro interno no servidor")
  }
}

export const updateProduct = updateContent;
export const updateLesson = updateContent;

// --- INTERAÇÕES E COMENTÁRIOS ---
export async function toggleLike(lessonId: string, isLiked: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('lesson_interactions').upsert({ user_id: user.id, lesson_id: lessonId, is_liked: isLiked })
  revalidatePath(`/app/view/${lessonId}`)
}

export async function toggleCommentLike(commentId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: existing } = await supabase.from('comment_reactions').select('*').eq('user_id', user.id).eq('comment_id', commentId).single()
  if (existing) await supabase.from('comment_reactions').delete().eq('user_id', user.id).eq('comment_id', commentId)
  else await supabase.from('comment_reactions').insert({ user_id: user.id, comment_id: commentId, reaction_type: 'heart' })
  revalidatePath(`/app/view/${lessonId}`)
}

export async function postComment(lessonId: string, content: string, parentId: string | null = null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('lesson_comments').insert({ user_id: user.id, lesson_id: lessonId, content, parent_id: parentId })
  revalidatePath(`/app/view/${lessonId}`)
}

export async function deleteComment(commentId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('lesson_comments').delete().eq('id', commentId).eq('user_id', user.id)
  revalidatePath(`/app/view/${lessonId}`)
}

export async function toggleLessonCompletion(lessonId: string, completed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  if (completed) await supabase.from('user_lessons_completed').upsert({ user_id: user.id, lesson_id: lessonId })
  else await supabase.from('user_lessons_completed').delete().eq('user_id', user.id).eq('lesson_id', lessonId)
  revalidateAll()
}

export async function saveVideoTime(lessonId: string, time: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('user_video_progress').upsert({ user_id: user.id, lesson_id: lessonId, last_time: Math.floor(time) }, { onConflict: 'user_id,lesson_id' })
}

export async function trackProgress(lessonId: string, seconds: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('user_activity_logs').upsert({ user_id: user.id, lesson_id: lessonId, seconds_watched: Math.floor(seconds), last_access: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' })
}

export async function toggleProductSave(productId: string, isSaved: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  if (isSaved) await supabase.from('user_saved_products').delete().eq('user_id', user.id).eq('product_id', productId)
  else await supabase.from('user_saved_products').insert({ user_id: user.id, product_id: productId })
  revalidateAll()
}

// --- ATUALIZAÇÃO DE PERFIL ---
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }
  const updates: any = { full_name: formData.get('full_name'), updated_at: new Date().toISOString() }
  const avatar_url = formData.get('avatar_url') as string
  if (avatar_url) updates.avatar_url = avatar_url
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) return { error: error.message }
  revalidateAll()
  return { success: true }
}

// --- CONTROLE DE ACESSO (CORRIGIDO PARA FUNCIONAR BLOQUEIO/LIBERAÇÃO) ---
export async function grantAccess(studentId: string, productId: string) {
  const supabase = await createClient()
  // CORREÇÃO: Usar conflito em user_id e product_id para garantir que a linha seja única
  const { error } = await supabase.from('purchases').upsert({ 
    user_id: studentId, 
    product_id: productId, 
    status: 'active', 
    transaction_id: `manual_${studentId.slice(0,5)}_${Date.now()}` 
  }, { onConflict: 'user_id,product_id' })
  
  if (error) throw new Error(error.message)
  revalidateAll()
  return { success: true }
}

export async function revokeAccess(studentId: string, productId: string) {
  const supabase = await createClient()
  // CORREÇÃO: Match exato para deletar o acesso desse aluno a esse produto
  const { error } = await supabase.from('purchases').delete().match({ user_id: studentId, product_id: productId })
  
  if (error) throw new Error(error.message)
  revalidateAll()
  return { success: true }
}

// --- NOTIFICAÇÕES E WEB PUSH ---

export async function clearNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidateAll()
  return { success: true }
}

export async function sendNotification(formData: FormData) {
  const supabase = await createClient()
  const title = formData.get('title') as string
  const message = formData.get('message') as string
  const targetUserId = formData.get('target_user_id') as string
  const link = formData.get('link') as string 

  if (!title || !message) return { error: 'Campos obrigatórios' }

  const { error } = await supabase.from('notifications').insert({ 
    title, 
    message, 
    link: link || null, 
    user_id: targetUserId === 'all' ? null : targetUserId 
  })
  if (error) throw new Error(error.message)

  if (process.env.VAPID_PRIVATE_KEY) {
    const pushPayload = JSON.stringify({
      title,
      body: message,
      url: link || '/app', 
      icon: '/icon-192.png'
    })

    let query = supabase.from('push_subscriptions').select('subscription')
    if (targetUserId !== 'all') query = query.eq('user_id', targetUserId)
    
    const { data: subs } = await query

    if (subs) {
      subs.forEach(s => {
        try {
          webpush.sendNotification(s.subscription, pushPayload)
        } catch (e) {
          console.error("Erro ao enviar push:", e)
        }
      })
    }
  }

  revalidateAll()
}

export async function replyAsBotAction(studentId: string, botId: string, content: string) {
  const supabase = await createClient()

  const { error: msgError } = await supabase.from('bot_messages').insert({
    user_id: studentId,
    bot_id: botId,
    content,
    is_from_bot: true,
    read: true
  })

  if (msgError) throw msgError

  await supabase.from('notifications').insert({
    user_id: studentId,
    title: "Nova mensagem recebida",
    message: "O suporte respondeu sua dúvida no chat.",
    link: `/app/chat/direct/${botId}?type=bot`
  })

  revalidateAll()
  return { success: true }
}

// --- GUARDIÕES DE ACESSO ---

export async function checkLessonAccess(lessonId: string) {
  // AULAS LIBERADAS PARA TESTE
  return { allowed: true }
}

export async function checkAIAccess() {
  // LÓGICA DE COMPRA RESTAURADA PARA A I.A.
  const supabase = await createClient()
  const { data: config } = await supabase.from('site_config').select('value').eq('key', 'ai_config').maybeSingle()
  const parsed = typeof config?.value === 'string' ? JSON.parse(config.value) : config?.value
  
  if (parsed?.accessMode === 'free') return { allowed: true }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false }
  
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', parsed?.aiProductId)
    .eq('status', 'active')
    .maybeSingle()
    
  return purchase ? { allowed: true } : { allowed: false }
}

export async function getAISettings() {
  const supabase = await createClient()
  const { data: config } = await supabase.from('site_config').select('value').eq('key', 'ai_config').maybeSingle()
  return typeof config?.value === 'string' ? JSON.parse(config.value) : config?.value
}