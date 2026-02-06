'use server'

export async function triggerHotmartSimulation(data: { email: string, name: string, productId: string }) {
    // 1. Define a URL (Garante que usa a porta 3000 localmente se a variável não estiver definida)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/webhooks/hotmart`
    
    // 2. CORREÇÃO: Tenta pegar o token do .env correto (HOTMART_SECRET_TOKEN)
    const secretToken = process.env.HOTMART_SECRET_TOKEN || process.env.HOTMART_WEBHOOK_SECRET

    // Debug no terminal do VS Code para você conferir
    console.log('--- INICIANDO SIMULAÇÃO ---')
    console.log('URL Alvo:', webhookUrl)
    console.log('Token Carregado:', secretToken ? 'SIM (********)' : 'NÃO ENCONTRADO')

    if (!secretToken) {
        return { success: false, error: "ERRO DE CONFIG: Token não encontrado no .env (HOTMART_SECRET_TOKEN)" }
    }

    // 3. Gera um ID de transação único
    const transactionId = `SIM-${Math.floor(Math.random() * 1000000)}`

    // 4. Payload (Exatamente o formato que funcionou no Postman)
    const payload = {
        event: "PURCHASE_APPROVED",
        data: {
            buyer: {
                email: data.email,
                name: data.name,
                checkout_phone: "5511999999999"
            },
            product: {
                id: Number(data.productId) || data.productId, 
                name: "Produto Simulado",
                ucode: "SIM-CODE"
            },
            purchase: {
                status: "APPROVED",
                transaction: transactionId,
                order_date: Date.now(),
                price: { value: 97.00, currency_code: "BRL" }
            }
        }
    }

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // CORREÇÃO CRÍTICA: O nome do header tem que ser este:
                'x-hotmart-hottok': secretToken 
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const text = await res.text()
            console.error(`[ERRO RETORNO] Status: ${res.status} | Msg: ${text}`)
            return { success: false, error: `Erro ${res.status}: ${text}` }
        }
        
        const jsonResponse = await res.json()
        console.log('[SUCESSO] Resposta do Webhook:', jsonResponse)
        
        return { success: true, product: data.productId }
    } catch (error: any) {
        console.error('[ERRO FATAL]', error)
        return { success: false, error: error.message }
    }
}