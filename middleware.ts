import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. REGRA DE OURO: LIBERAÇÃO IMEDIATA DA API E ARQUIVOS ESTÁTICOS
  // Se for API, passa direto. Não carrega Supabase, não verifica cookie.
  // Isso resolve o erro 405/500 nos Webhooks.
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.includes('.') // Pula arquivos (imagens, favicon, etc)
  ) {
    return NextResponse.next()
  }

  // 2. Configuração Padrão para o resto do App
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Verifica o Usuário
  const { data: { user } } = await supabase.auth.getUser()

  // 4. PROTEÇÃO BLINDADA DO ADMIN (NOVA ROTA)
  const adminPath = '/portal-gestor-x9z' // <--- SUA PASTA NOVA AQUI

  if (request.nextUrl.pathname.startsWith(adminPath)) {
    // Se não estiver logado -> Login
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Se estiver logado, VERIFICA NO BANCO SE É ADMIN (Camada Extra de Segurança)
    // Isso impede que um aluno descubra a URL e entre só porque está logado
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Se a role não for 'admin' -> Manda para área de aluno (sem choro)
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/app', request.url))
    }
  }

  // 5. Proteção de Rotas de Aluno (/app requer login)
  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 6. Redireciona usuário logado que tenta acessar login/cadastro
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}