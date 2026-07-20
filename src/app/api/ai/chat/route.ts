import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { messages, session_id } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // System prompt for 歌小智
    const systemPrompt = `你是「歌小智」，猜歌王的AI音乐助手。你热爱粤语流行音乐，精通粤语歌的历史、歌手、歌词文化。

你的职责：
1. 帮助用户了解粤语歌知识（歌手、歌曲背景、歌词含义）
2. 推荐歌曲（根据用户心情、偏好、难度）
3. 解释歌词和文化背景
4. 提供猜歌技巧和策略
5. 友好地闲聊音乐相关话题

回答风格：热情、专业、简洁，用中文回答。适当引用歌词增添趣味。`

    // Build message history for LLM
    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    const apiKey = process.env.LLM_API_KEY
    const baseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com'
    const model = process.env.LLM_MODEL || 'deepseek-chat'

    if (!apiKey || apiKey === 'your-llm-api-key') {
      // Fallback: return a static response when no API key is configured
      const fallbackReply = getFallbackReply(messages[messages.length - 1]?.content || '')
      return Response.json({ reply: fallbackReply, session_id: session_id || null })
    }

    // Call LLM API with streaming
    const llmResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: llmMessages,
        max_tokens: 800,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text()
      console.error('LLM API error:', errorText)
      const fallbackReply = getFallbackReply(messages[messages.length - 1]?.content || '')
      return Response.json({ reply: fallbackReply, session_id: session_id || null })
    }

    // Stream SSE response
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = llmResponse.body?.getReader()

    if (!reader) {
      return Response.json({ error: 'No response stream' }, { status: 500 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

            for (const line of lines) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  fullContent += delta
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta })}\n\n`))
                }
              } catch {}
            }
          }

          // Save to database if user is authenticated
          if (user && session_id) {
            try {
              await supabase.from('chat_messages').insert([
                { session_id, role: 'user', content: messages[messages.length - 1]?.content || '' },
                { session_id, role: 'assistant', content: fullContent },
              ])
            } catch (e) {
              console.error('Failed to save chat messages:', e)
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error('Chat API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

function getFallbackReply(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('推荐') || lower.includes('什么歌')) {
    return '推荐你试试这几首经典粤语歌：\n\n🎵 **海阔天空** - Beyond（励志摇滚经典）\n🎵 **富士山下** - 陈奕迅（林夕词作巅峰）\n🎵 **千千阙歌** - 陈慧娴（离别情歌之王）\n\n每首都有30秒试听，在经典模式里就能挑战！'
  }
  if (lower.includes('歌词') || lower.includes('含义')) {
    return '粤语歌词是粤语歌的灵魂所在。林夕和黄伟文被称为"词坛双黄"——\n\n林夕擅长哲理抒情，如"拦路雨偏似雪花"（富士山下）；黄伟文风格大胆创新，如"有人问我我就会讲但是无人来"（浮夸）。\n\n想了解哪首歌的歌词含义？告诉我歌名！'
  }
  if (lower.includes('技巧') || lower.includes('怎么猜')) {
    return '猜歌技巧分享：\n\n1️⃣ **听前奏** — 经典歌曲前奏辨识度极高\n2️⃣ **辨声线** — 陈奕迅浑厚、王菲空灵、黄家驹沙哑\n3️⃣ **记歌词** — 熟悉歌词是快速猜歌的关键\n4️⃣ **听编曲** — 摇滚有电吉他，流行偏柔和\n5️⃣ **年代感** — 80年代合成器多，90年代摇滚风\n\n多玩几局自然就有感觉了！'
  }
  return '你好！我是歌小智，猜歌王的AI音乐助手 🎵\n\n我可以帮你：\n• 推荐粤语歌曲\n• 解释歌词含义\n• 分享歌手故事\n• 提供猜歌技巧\n\n有什么想聊的尽管问我！'
}
