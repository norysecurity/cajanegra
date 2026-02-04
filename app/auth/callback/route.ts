import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    const cookieStore = {} // Armazenamento temporário
    
    // 1. Criamos a resposta (O Veículo) PRIMEIRO
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Pega cookies do request (browser)
            return parseCookies(request.headers.get('Cookie') ?? '')
          },
          setAll(cookiesToSet) {
            // AQUI É O SEGREDO:
            // Gravamos os cookies diretamente na RESPOSTA que vai pro navegador
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 2. Trocamos o código pela sessão (o Supabase vai chamar o setAll acima)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  // Se der erro
  return NextResponse.redirect(`${origin}/auth/login?error=auth_code_error`)
}

// Função auxiliar para ler cookies (já que 'request.cookies' as vezes falha no build)
function parseCookies(cookieHeader: string) {
  const list: any[] = []
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=')
    if (parts.length >= 2) {
      list.push({ name: parts[0].trim(), value: parts[1] })
    }
  })
  return list
}