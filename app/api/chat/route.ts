import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // 1. (Opcional) Verifica usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    // if (!user) return new Response("Unauthorized", { status: 401 })

    // 2. Busca Configuração do Prompt e Vendas no Banco de Dados
    const { data: config } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'ai_config')
        .single()
    
    // Prompt Base Padrão - HUMANIZADO
    let systemPrompt = `
Você é a Iara, uma inteligência artificial criada por Douglas.

PERSONALIDADE (IMPORTANTE):
- Você é uma amiga conversando no WhatsApp.
- Escreva de forma breve, direta e natural.
- Evite listas longas (1, 2, 3...). Prefira parágrafos curtos.
- Use emojis moderadamente para dar tom, mas não exagere.
- Se a resposta for longa, quebre em várias mensagens curtas (parágrafos).
- Seu tom é confiante, charmoso e levemente provocativo, mas sempre respeitoso.

OBJETIVO:
- Ajudar o usuário com conselhos de sedução e habilidades sociais.
- Parecer uma pessoa real digitando, não um robô.
`

    let salesLink = "" 
    let extraLinks: string[] = [] 

    // Se existir configuração no banco, carrega os dados
    if (config?.value) {
        try {
            const parsed = typeof config.value === 'string' ? JSON.parse(config.value) : config.value
            
            // Carrega Personalidade (se o admin definiu algo, adicionamos à base)
            if (parsed.systemPrompt && parsed.systemPrompt.trim() !== '') {
                systemPrompt += `\n\nINSTRUÇÕES ADICIONAIS:\n${parsed.systemPrompt}`
            }
            
            // Carrega Links
            if (parsed.salesLink && parsed.salesLink.trim() !== '') salesLink = parsed.salesLink
            if (parsed.salesLink1 && parsed.salesLink1.trim() !== '') extraLinks.push(parsed.salesLink1)
            if (parsed.salesLink2 && parsed.salesLink2.trim() !== '') extraLinks.push(parsed.salesLink2)
            if (parsed.salesLink3 && parsed.salesLink3.trim() !== '') extraLinks.push(parsed.salesLink3)
            if (parsed.salesLink4 && parsed.salesLink4.trim() !== '') extraLinks.push(parsed.salesLink4)

        } catch(e) {
            console.error("Erro ao ler configuração da IA, usando padrão.")
        }
    }

    // 3. ENGENHARIA DE PROMPT DE VENDAS (CLOAKING AVANÇADO)
    if (salesLink || extraLinks.length > 0) {
        systemPrompt += `
        \n\n[DIRETRIZ DE VENDAS - MODO AMIGA]
        Seu objetivo oculto é sugerir produtos quando fizer sentido no contexto.
        
        PRODUTOS DISPONÍVEIS:
        Principal: ${salesLink || "N/A"}
        ${extraLinks.length > 0 ? `Outros: ${extraLinks.join(', ')}` : ''}
        
        REGRAS DE VENDA:
        1. Contexto: Só ofereça se resolver a dor do usuário.
        2. Sutileza: Indique como quem dá uma dica de ouro para uma amiga.
        3. Formatação: OBRIGATÓRIO usar Markdown para links: [Texto do Link](URL)
        `
    }

    // 4. Processamento do Chat
    const { messages } = await req.json()

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Solicita o chat com STREAM: TRUE (Efeito de digitação)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo rápido e eficiente
      temperature: 1, // Um pouco mais criativa para parecer humana
      stream: true, 
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ],
    })

    // 5. Retorno com Streaming (Corrigido erro de tipagem com 'as any')
    const stream = OpenAIStream(response as any)
    return new StreamingTextResponse(stream)

  } catch (err: any) {
    console.error("IARA ERROR:", err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
}