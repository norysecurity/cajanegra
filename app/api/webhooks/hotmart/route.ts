import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Configuração do Cliente Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    // 1. Segurança (Pula se não tiver token configurado localmente)
    const signature = request.headers.get('x-hotmart-hottok')
    const secret = process.env.HOTMART_SECRET_TOKEN
    if (secret && signature !== secret) {
      return NextResponse.json({ error: 'Token Inválido' }, { status: 401 })
    }

    const body = await request.json()
    // Normaliza os dados (v1.0 ou v2.0)
    const payloadData = body.data && body.data.product ? body.data : body

    // === PONTO CRÍTICO: DADOS RECEBIDOS ===
    const hotmartIdRecebido = String(payloadData.product?.id || payloadData.prod || '')
    const email = String(payloadData.buyer?.email || payloadData.email || '').toLowerCase().trim()
    const name = payloadData.buyer?.name || payloadData.name || 'Novo Aluno'
    
    // Status e Transação
    const status = (payloadData.purchase?.status || payloadData.status || '').toUpperCase()
    const transaction = payloadData.purchase?.transaction || payloadData.transaction

    console.log(`[WEBHOOK] ID Recebido do Simulador: ${hotmartIdRecebido}`)
    console.log(`[WEBHOOK] Email: ${email}`)

    // Validações básicas
    if (!hotmartIdRecebido || !email) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    
    const aprovados = ['APPROVED', 'COMPLETED', 'PURCHASE_APPROVED']
    if (!aprovados.includes(status)) return NextResponse.json({ message: `Status ${status} ignorado` })

    // === A CORREÇÃO QUE VOCÊ PEDIU ===
    // Aqui nós forçamos a busca na coluna 'hotmart_id'
    console.log(`[BUSCA NO BANCO] Procurando na coluna 'hotmart_id' pelo valor: '${hotmartIdRecebido}'`)

    const { data: product, error: searchError } = await supabaseAdmin
      .from('products')
      .select('id, title, hotmart_id') // Selecionamos para conferir
      .eq('hotmart_id', hotmartIdRecebido) // <--- O SEGREDO ESTÁ AQUI
      .maybeSingle()

    if (searchError) {
        console.error('[ERRO SQL]', searchError)
        return NextResponse.json({ error: 'Erro no banco de dados' }, { status: 500 })
    }

    if (!product) {
      console.error(`[ERRO 404] Produto não encontrado!`)
      console.error(`MOTIVO: Nenhum registro na tabela 'products' tem hotmart_id = '${hotmartIdRecebido}'`)
      return NextResponse.json({ 
        error: `Produto com hotmart_id '${hotmartIdRecebido}' não encontrado no banco.` 
      }, { status: 404 })
    }

    console.log(`[SUCESSO] Produto Encontrado: ${product.title} (UUID: ${product.id})`)

    // === CRIAÇÃO DE CONTA E LIBERAÇÃO (Fluxo Padrão) ===
    let userId = ''
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users?.find(u => u.email?.toLowerCase() === email)

    if (existingUser) {
      userId = existingUser.id
    } else {
      console.log(`[CRIANDO USUÁRIO] ${email}`)
      const password = Math.random().toString(36).slice(-10) + "!A1a"
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: name }
      })
      if (createError) throw createError
      userId = newUser.user.id
      await supabaseAdmin.from('profiles').upsert({ id: userId, email, full_name: name })
    }

    // Libera a compra usando o UUID que descobrimos
    const safeTransactionId = transaction || `sim_${Date.now()}`
    
    const { error: purchaseError } = await supabaseAdmin.from('purchases').upsert({
        user_id: userId,
        product_id: product.id, // Usa o UUID para relacionar na tabela purchases
        status: 'active',
        transaction_id: safeTransactionId,
        created_at: new Date().toISOString()
    }, { onConflict: 'user_id, product_id' })

    if (purchaseError) throw purchaseError

    console.log('[FINAL] Compra liberada com sucesso!')
    return NextResponse.json({ message: 'Acesso Liberado' })

  } catch (error: any) {
    console.error('[ERRO GERAL]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}