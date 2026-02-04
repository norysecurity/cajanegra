import { createClient } from '@supabase/supabase-js'

// Cria um cliente com poderes de SUPER ADMIN (Service Role)
// Isso permite gravar compras mesmo sem o usuário estar logado
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)