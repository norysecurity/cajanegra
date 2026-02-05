import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente ADMIN (Service Role) - Necessário para criar usuários
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // === BLINDAGEM DE SEGURANÇA (ATUALIZADO) ===
    // 1. Pega o token: Aceita o header antigo (hottok) OU o novo (hws-signature/simulador)
    const signature = request.headers.get('x-hotmart-hottok') || request.headers.get('x-hotmart-hws-signature')
    
    // 2. Pega o segredo: Tenta ler as duas variáveis possíveis do .env para garantir
    const secret = process.env.HOTMART_SECRET_TOKEN || process.env.HOTMART_WEBHOOK_SECRET

    // 3. Validação
    if (!secret || signature !== secret) {
      console.error('[SEGURANÇA] Tentativa de acesso não autorizado no Webhook.')
      return NextResponse.json({ error: 'Acesso Negado: Token Inválido' }, { status: 401 })
    }
    // ======================================

    const body = await request.json()
    console.log('[WEBHOOK] Payload recebido e autenticado.')

    // Tratamento para payload v1.0 ou v2.0 da Hotmart
    const payloadData = body.data && body.data.product ? body.data : body
    
    // Dados da Venda
    const hotmartId = String(payloadData.product?.id || payloadData.prod || '')
    const email = payloadData.buyer?.email || payloadData.email
    const name = payloadData.buyer?.name || payloadData.name || 'Novo Aluno'
    const status = (payloadData.purchase?.status || payloadData.status || '').toUpperCase()
    const transaction = payloadData.purchase?.transaction || payloadData.transaction

    console.log(`[PROCESSANDO] Hotmart ID: ${hotmartId} | Email: ${email} | Status: ${status}`)

    // Validação de Dados Básicos
    if (!hotmartId || !email) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Filtra apenas compras APROVADAS
    const aprovados = ['APPROVED', 'COMPLETED', 'PURCHASE_APPROVED']
    if (!aprovados.includes(status)) {
      return NextResponse.json({ message: `Status ${status} ignorado` })
    }

    // 3. Encontra o produto no SEU banco
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, title')
      .eq('hotmart_id', hotmartId)
      .single()

    if (!product) {
      console.error(`[ERRO] Produto Hotmart ID ${hotmartId} não encontrado.`)
      return NextResponse.json({ message: 'Produto não cadastrado' }, { status: 200 })
    }

    // 4. Verifica/Cria Usuário
    let userId = null
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      userId = existingUser.id
      console.log(`[USUÁRIO EXISTENTE] ID: ${userId}`)
    } else {
      console.log(`[NOVO USUÁRIO] Criando: ${email}`)
      // Senha temporária forte
      const password = Math.random().toString(36).slice(-8) + 'Aa1@'
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: name }
      })

      if (createError) throw createError
      userId = newUser.user.id
      
      // Cria perfil
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: name,
        updated_at: new Date().toISOString()
      })
    }

    // 5. Libera o Acesso
    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .upsert({ 
        user_id: userId,
        product_id: product.id,
        status: 'active',
        transaction_id: transaction,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,product_id' }) // Ajuste para evitar erro se tentar liberar o mesmo produto 2x

    if (purchaseError) throw purchaseError

    console.log(`[SUCESSO] Acesso liberado para ${email} no produto ${product.title}`)

    return NextResponse.json({ message: 'Acesso Liberado e Seguro' })

  } catch (error: any) {
    console.error('[FATAL ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}