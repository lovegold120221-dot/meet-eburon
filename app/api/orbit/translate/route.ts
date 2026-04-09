
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, targetLang } = await request.json();

    if (!text || !targetLang) {
      return new NextResponse('Missing text or targetLang', { status: 400 });
    }

    // 0. Try Remote Ollama (User Preference)
    const ollamaUrl = process.env.OLLAMA_BASE_URL;
    if (ollamaUrl) {
      try {
        console.log(`[Orbit] Attempting Remote Ollama at ${ollamaUrl}...`);
        const olResponse = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "gemini-3-flash-preview:cloud", // Upgraded to user's new model
            prompt: `Translate the following text to ${targetLang}. Output ONLY the translated text.\n\nText: ${text}`,
            stream: false
          })
        });

        if (olResponse.ok) {
           const data = await olResponse.json();
           const translation = data.response?.trim();
           if (translation) return NextResponse.json({ translation });
        } else {
           console.warn(`[Orbit] Remote Ollama failed (${olResponse.status}). Fallback...`);
        }
      } catch (e) {
         console.error("[Orbit] Remote Ollama connection error:", e);
      }
    }

    // 1. Try DeepSeek (User Preference)
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      try {
        const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "You are a professional translator. Output ONLY the translated text." },
              { role: "user", content: `Translate to ${targetLang}:\n\n${text}` }
            ],
            stream: false
          })
        });

        if (dsResponse.ok) {
          const data = await dsResponse.json();
          const translation = data.choices?.[0]?.message?.content?.trim();
          if (translation) return NextResponse.json({ translation });
        } else {
          const err = await dsResponse.text();
          console.warn(`[Orbit] DeepSeek translation failed (${dsResponse.status}): ${err}. Falling back to Gemini.`);
        }
      } catch (e) {
        console.error("[Orbit] DeepSeek connection error:", e);
      }
    }

    // 2. Fallback to Gemini (Verified Working)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!geminiKey) {
      return new NextResponse('Translation Failed: DeepSeek failed and no Gemini key found', { status: 500 });
    }

    // Use reported working model
    const model = 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Translate the following text to ${targetLang}. Output ONLY the translated text.\n\nText: ${text}` 
          }]
        }],
        generationConfig: { temperature: 0.1 }
      }),
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error(`[Orbit] Gemini translation failed (${geminiResponse.status}):`, err);
      return new NextResponse(err, { status: geminiResponse.status });
    }

    const data = await geminiResponse.json();
    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return NextResponse.json({ translation });

  } catch (error) {
    console.error('Orbit translation route error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}