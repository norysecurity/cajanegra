import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) return NextResponse.json({ error: 'Texto não fornecido' }, { status: 400 })

    // Gerando o áudio com a voz "Nova" (feminina e suave)
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", 
      input: text.substring(0, 4000), // Limite de segurança da OpenAI
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error: any) {
    console.error('Erro na Voz da Iara:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}