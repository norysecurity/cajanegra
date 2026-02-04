import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ViewContentClient from './ViewContentClient'

// --- FORÇA O NEXT.JS A NÃO FAZER CACHE ---
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ViewContent(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  // 1. LOGIN CHECK
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. BUSCA A AULA
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!lesson) redirect('/app')

  // 3. BUSCA MÓDULO E PRODUTO
  const { data: module } = await supabase.from('modules').select('*, products(*)').eq('id', lesson.module_id).single()

  // 4. LISTA DE AULAS (SIDEBAR)
  const { data: moduleLessons } = await supabase
    .from('lessons')
    .select('id, title, type, video_url')
    .eq('module_id', lesson.module_id)
    .order('created_at', { ascending: true })

  // 5. PROGRESSO
  const { data: completedData } = await supabase
    .from('user_lessons_completed')
    .select('lesson_id')
    .eq('user_id', user.id)
  const completedLessonIds = completedData?.map((c: any) => c.lesson_id) || []

  // 6. BUSCA COMENTÁRIOS (COM DEBUG DE ERRO)
  console.log("🔍 Buscando comentários para aula:", params.id)

  const { data: rawComments, error: commentsError } = await supabase
    .from('lesson_comments')
    .select(`
      *,
      profiles (email, full_name, avatar_url),
      comment_reactions (user_id)
    `)
    .eq('lesson_id', params.id)
    .order('created_at', { ascending: false })

  if (commentsError) {
    console.error("❌ ERRO AO BUSCAR COMENTÁRIOS:", commentsError.message)
    // Se der erro na relação 'profiles', ele vai avisar aqui no terminal
  }

  const comments = rawComments?.map((c: any) => ({
    ...c,
    is_liked_by_user: c.comment_reactions ? c.comment_reactions.some((r: any) => r.user_id === user.id) : false,
    likes_count: c.comment_reactions ? c.comment_reactions.length : 0
  })) || []

  // 7. INTERAÇÃO GERAL
  const { data: interaction } = await supabase
    .from('lesson_interactions')
    .select('is_liked')
    .eq('user_id', user.id)
    .eq('lesson_id', params.id)
    .maybeSingle()

  // 8. PROGRESSO DO VÍDEO
  const { data: videoProgress } = await supabase
    .from('user_video_progress')
    .select('last_time')
    .eq('user_id', user.id)
    .eq('lesson_id', params.id)
    .maybeSingle()

  return (
    <ViewContentClient 
      lesson={lesson} 
      moduleLessons={moduleLessons || []} 
      product={module?.products || {}}
      moduleTitle={module?.title}
      initialComments={comments}
      userId={user.id}
      completedLessonIds={completedLessonIds}
      initialInteraction={interaction}
      lastTime={videoProgress?.last_time || 0}
    />
  )
}