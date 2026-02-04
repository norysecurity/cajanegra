import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import PDFParser from 'pdf2json'
import OpenAI from 'openai'

// OBRIGATÓRIO: Runtime Node.js para processamento de arquivos
export const runtime = 'nodejs'
// Aumenta o tempo máximo de execução (ajuda no plano Pro, no Hobby é limitado a 10-60s)
export const maxDuration = 60; 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  console.log("🚀 [API SUPER RÁPIDA] Iniciando...")

  try {
    const formData = await req.formData()
    
    const file = formData.get('pdf_file') as File | null
    const title = formData.get('title') as string
    const moduleId = formData.get('module_id') as string
    const videoUrl = formData.get('video_url') as string
    const description = formData.get('description') as string

    if (!title || !moduleId) {
      return NextResponse.json({ error: 'Título e Módulo obrigatórios.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let extractedText = ""

    // 1. EXTRAÇÃO DO PDF (Rápida)
    if (file && file.size > 0) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        extractedText = await new Promise((resolve) => {
          // @ts-ignore - Ignora tipagem para evitar erro de build
          const pdfParser = new PDFParser()
          pdfParser.on("pdfParser_dataError", () => resolve(""))
          pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()))
          pdfParser.parseBuffer(buffer)
        })
      } catch (err) {
        console.error("⚠️ Erro PDF:", err)
      }
    }

    // 2. SALVAR A AULA NO BANCO (Prioridade Imediata)
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({
        title, module_id: moduleId, video_url: videoUrl,
        description: description || '', type: file ? 'pdf' : 'video',
        content: extractedText, // Texto completo para a Voz (TTS)
      })
      .select()
      .single()

    if (error) throw error

    // 3. TREINAMENTO PARALELO (Embeddings em Lote)
    if (extractedText && extractedText.length > 50) {
        console.log("🧠 Iniciando Treinamento Otimizado...")
        
        const cleanText = extractedText.replace(/\s+/g, ' ').trim()
        const chunks = splitTextIntoChunks(cleanText, 1000)
        
        console.log(`⚡ Processando ${chunks.length} blocos em paralelo...`)

        // AQUI ESTÁ A MÁGICA: Promise.all para gerar tudo ao mesmo tempo
        const embeddingPromises = chunks.map(async (chunk) => {
            try {
                const res = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: chunk,
                })
                const embedding = res.data[0].embedding

                return {
                    content: chunk,
                    metadata: { 
                        title: title, 
                        lesson_id: lesson.id,
                        source: "Aula Automática"
                    },
                    embedding: embedding
                }
            } catch (e) {
                console.error("Erro num chunk específico:", e)
                return null
            }
        })

        // Espera todas as chamadas da OpenAI terminarem
        const results = await Promise.all(embeddingPromises)
        const validResults = results.filter(r => r !== null)

        // Salva tudo no Supabase de uma única vez (Bulk Insert)
        if (validResults.length > 0) {
            const { error: insertError } = await supabase
                .from('iara_knowledge')
                .insert(validResults)
            
            if (insertError) console.error("Erro ao salvar memória:", insertError)
            else console.log(`🤖 Iara memorizou ${validResults.length} conceitos de uma vez!`)
        }
    }

    return NextResponse.json({ success: true, lesson })

  } catch (error: any) {
    console.error("🚨 ERRO:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Função Auxiliar de Divisão de Texto
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  const sentences = text.split('. ') 
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence + '. '
    } else {
      currentChunk += sentence + '. '
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim())
  return chunks
}