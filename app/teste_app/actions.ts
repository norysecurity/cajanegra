'use server'

// Simula o envio do Webhook da Hotmart para o seu servidor
export async function triggerHotmartSimulation(data: { email: string, name: string, productId: string }) {
    // Define a URL (Local ou Produção)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/webhooks/hotmart`
    const secretToken = process.env.HOTMART_WEBHOOK_SECRET

    if (!secretToken) return { success: false, error: "SEM TOKEN NO ENV" }

    // Gera um ID de transação único para cada produto
    const transactionId = `HP-${Math.floor(Math.random() * 1000000)}`

    const payload = {
        event: "PURCHASE_APPROVED",
        data: {
            buyer: {
                email: data.email,
                name: data.name,
                checkout_phone: "5511999999999"
            },
            product: {
                id: Number(data.productId) || data.productId, // Aceita string ou number
                name: "Produto Simulado"
            },
            purchase: {
                status: "APPROVED",
                transaction: transactionId,
                order_date: Date.now()
            }
        }
    }

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hotmart-hws-signature': secretToken
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) return { success: false, error: `Status ${res.status}` }
        
        return { success: true, product: data.productId }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}