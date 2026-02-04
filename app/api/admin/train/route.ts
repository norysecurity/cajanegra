import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import PDFParser from 'pdf2json'

// Forçamos o runtime para nodejs pois a biblioteca pdf2json depende de APIs nativas do Node
export const runtime = 'nodejs' 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    console.log(`📄 Iniciando processamento: ${file.name}`)

    // 1. Converte o arquivo para Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 2. Extrai o texto do PDF (Versão corrigida para Vercel)
    const text = await parsePDF(buffer)

    if (!text || text.length < 10) {
        throw new Error("O PDF parece estar vazio ou não contém texto legível.")
    }

    console.log("✅ Texto extraído. Tamanho:", text.length)

    // 3. Limpeza básica do texto
    const cleanText = text
        .replace(/----------------Page \(\d+\) Break----------------/g, '')
        .replace(/\n\n+/g, '\n')
        .replace(/\s+/g, ' ')
        .trim()

    // 4. Divisão em pedaços (Chunks) para o Banco de Dados
    const chunks = splitTextIntoChunks(cleanText, 1000)
    console.log(`🧠 Gerando embeddings para ${chunks.length} pedaços...`)

    // 5. Loop de Processamento e Gravação no Supabase
    let savedCount = 0
    
    for (const chunk of chunks) {
      // Gera o vetor numérico (embedding) daquele pedaço de texto
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      })
      const embedding = embeddingResponse.data[0].embedding

      // Salva no banco de dados na tabela de conhecimento da Iara
      const { error: dbError } = await supabaseAdmin
        .from('iara_knowledge')
        .insert({
          content: chunk,
          metadata: { 
            title: title, 
            source: file.name,
            trained_at: new Date().toISOString()
          },
          embedding: embedding
        })

      if (!dbError) savedCount++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Treinamento concluído! Iara aprendeu ${savedCount} novos blocos de conhecimento.` 
    })

  } catch (error: any) {
    console.error('Erro no processamento do treino:', error)
    return NextResponse.json({ 
        error: error.message || 'Erro interno ao processar treinamento' 
    }, { status: 500 })
  }
}

// --- FUNÇÃO AUXILIAR: Extração de PDF (Blindada para Build) ---
function parsePDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        // Chamada sem argumentos no construtor para evitar erro de tipo no TypeScript/Vercel
        // @ts-ignore
        const pdfParser = new PDFParser()

        pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error("Erro no Parser:", errData.parserError)
            reject(new Error("Falha ao ler dados do PDF."))
        })

        pdfParser.on("pdfParser_dataReady", () => {
            // getRawTextContent extrai o texto puro processado
            const rawText = pdfParser.getRawTextContent()
            resolve(rawText)
        })

        pdfParser.parseBuffer(buffer)
    })
}

// --- FUNÇÃO AUXILIAR: Divisão de Texto ---
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  
  // Divide por frases para não cortar palavras ao meio
  const sentences = text.split('. ') 

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence + '. '
    } else {
      currentChunk += sentence + '. '
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}