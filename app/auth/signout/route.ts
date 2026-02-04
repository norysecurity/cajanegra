import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Não precisamos setar nada no logout
        },
      },
    }
  )

  // 1. Mata a sessão no Supabase
  await supabase.auth.signOut()

  // 2. Limpa o Cache do Next.js (Isso evita o erro de página velha)
  revalidatePath('/', 'layout')

  // 3. Prepara o Redirecionamento
  const url = req.nextUrl.clone()
  url.pathname = '/auth/login'
  
  const response = NextResponse.redirect(url)

  // 4. Faxina Completa nos Cookies (Força Bruta)
  // Removemos todos os cookies possíveis para garantir que não sobre lixo
  response.cookies.getAll().forEach((cookie) => {
    response.cookies.set({
      name: cookie.name,
      value: '',
      expires: new Date(0), // Data no passado = Exclusão imediata
      path: '/',
    })
  })

  return response
}