import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente ADMIN (Bypass de segurança para gravar no banco)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TESTE DE SAÚDE (GET)
export async function GET() {
  return NextResponse.json({ message: 'Webhook Hotmart Online 🚀' })
}

// ONDE A MÁGICA ACONTECE (POST)
export async function POST(request: Request) {
  try {
    // 1. Recebe o JSON Bruto
    const body = await request.json()
    console.log('[WEBHOOK START] Payload recebido.')

    // 2. TRATAMENTO INTELIGENTE (Versão 2.0 vs 1.0)
    const payloadData = body.data && body.data.product ? body.data : body
    
    // Pega o ID do produto
    const rawId = payloadData.product?.id ?? payloadData.prod
    const hotmartId = String(rawId !== undefined && rawId !== null ? rawId : '')
    
    // Pega o Email do Comprador (REAL)
    const email = (payloadData.buyer?.email || payloadData.email || '').toLowerCase().trim()
    
    // Status
    const status = (
        payloadData.purchase?.status || 
        payloadData.status || 
        payloadData.event || 
        ''
    ).toUpperCase()

    // Transação
    const transaction = payloadData.purchase?.transaction || payloadData.transaction

    console.log(`[PROCESSANDO] ID: "${hotmartId}" | Email: "${email}" | Status: "${status}"`)

    // Validação básica
    if (!hotmartId || !email) {
      console.error('[ERRO] ID do produto ou Email não encontrados.')
      return NextResponse.json({ error: 'Dados incompletos no Payload' }, { status: 400 })
    }

    // 3. Filtra apenas compras APROVADAS
    const aprovados = ['APPROVED', 'COMPLETED', 'PURCHASE_APPROVED']
    if (!aprovados.includes(status)) {
      console.log(`[IGNORED] Status ${status} ignorado.`)
      return NextResponse.json({ message: 'Status ignorado' })
    }

    // 4. Busca qual curso corresponde a esse ID da Hotmart
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, title')
      .eq('hotmart_id', hotmartId)
      .single()

    if (!product) {
      console.error(`[ALERTA] Produto Hotmart ID "${hotmartId}" não cadastrado no Supabase.`)
      // Retorna 200 para a Hotmart não ficar reenviando erro, mas avisa no log
      return NextResponse.json({ message: 'Produto não configurado no App' }, { status: 200 })
    }

    // 5. Verifica se o usuário já existe ou cria um novo
    let userId = null
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users.find(u => u.email?.toLowerCase() === email)

    if (existingUser) {
      console.log(`[INFO] Usuário já existe: ${existingUser.id}`)
      userId = existingUser.id
    } else {
      console.log(`[NOVO USUÁRIO] Criando conta para: ${email}`)
      
      const password = Math.random().toString(36).slice(-8) + 'Aa1@'
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: payloadData.buyer?.name || 'Aluno Novo',
          source: 'hotmart_webhook'
        }
      })

      if (createError) {
        console.error('[ERRO CRÍTICO] Falha ao criar usuário:', createError)
        return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 })
      }

      userId = newUser.user.id
      console.log(`[SUCESSO] Usuário criado! ID: ${userId}`)
    }

    // 6. Libera o acesso na tabela 'purchases'
    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .upsert({ 
        user_id: userId,
        product_id: product.id,
        status: 'active',
        transaction_id: transaction,
        created_at: new Date().toISOString()
      }, { onConflict: 'transaction_id' })

    if (purchaseError) {
      console.error('[ERRO DB] Falha ao gravar compra:', purchaseError)
      return NextResponse.json({ error: 'Erro ao gravar compra' }, { status: 500 })
    }

    console.log(`[FINALIZADO] Acesso liberado para ${email} no curso "${product.title}"`)
    return NextResponse.json({ message: 'Acesso Liberado com Sucesso' })

  } catch (error: any) {
    console.error('[FATAL ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}