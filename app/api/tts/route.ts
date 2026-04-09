import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TtsRequestBody = {
  text: string;
  voiceId?: string;
  provider?: 'orbit-ai' | 'orbit-ai-voice' | 'orbit-ai-agent' | 'cartesia';
};

function pcm16leToWav(pcm: Buffer, sampleRate = 24000, channels = 1): Buffer {
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM
  header.writeUInt16LE(1, 20);  // AudioFormat = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

export async function POST(request: Request) {
  try {
    const { text, voiceId: requestedVoiceId, provider = 'orbit-ai-voice' } = (await request.json()) as TtsRequestBody;

    if (!text) {
      return new NextResponse('Missing text', { status: 400 });
    }

    if (provider === 'cartesia') {
      const apiKey = process.env.ORBIT_API_KEY || process.env.CARTESIA_API_KEY;
      if (!apiKey) {
        return new NextResponse('Orbit API key not configured', { status: 503 });
      }

      const response = await fetch("https://api.cartesia.ai/tts/bytes", {
         method: "POST",
         headers: {
           "Cartesia-Version": process.env.CARTESIA_VERSION || "2025-04-16",
           "X-API-Key": apiKey,
           "Content-Type": "application/json"
         },
         body: JSON.stringify({
            model_id: process.env.CARTESIA_MODEL_ID || "sonic-3",
            transcript: text,
            voice: {
              mode: "id",
              id: requestedVoiceId || process.env.CARTESIA_VOICE_ID || "9c7e6604-52c6-424a-9f9f-2c4ad89f3bb9"
            },
            output_format: {
              container: "wav",
              encoding: "pcm_f32le",
              sample_rate: 44100
            },
            speed: "normal",
            generation_config: { speed: 1, volume: 1 }
         })
       });

       if (!response.ok) {
           const err = await response.text();
           console.error("Cartesia TTS Error", err);
           return new NextResponse(err, { status: 500 });
       }
       const buffer = await response.arrayBuffer();
       return new NextResponse(buffer, { headers: { "Content-Type": "audio/wav" } });
    }

    if (provider === 'orbit-ai') {
      const apiKey = process.env.ORBIT_AI_API_KEY;
      const model = process.env.ORBIT_AI_AUDIO_MODEL || 'orbit-ai-tts-1';
      const voiceName = process.env.ORBIT_AI_TTS_VOICE_NAME || 'Orbit';

      if (!apiKey) {
        return new NextResponse('Orbit AI API key not configured', { status: 503 });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Orbit AI audio error:', errorData);
        return new NextResponse('Orbit AI audio failed', { status: 500 });
      }

      const data = await response.json();
      const part0 = data?.candidates?.[0]?.content?.parts?.[0];
      const audioBase64 =
        part0?.inlineData?.data ??
        part0?.inline_data?.data ??
        null;

      if (!audioBase64) {
        return new NextResponse('Orbit AI returned no audio', { status: 500 });
      }

      // Orbit AI returns PCM (example flow converts PCM -> WAV). Wrap for browser playback.
      const pcm = Buffer.from(audioBase64, 'base64');
      const wav = pcm16leToWav(pcm, 24000, 1);
      return new NextResponse(wav as any, {
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Orbit AI Agent TTS - uses the room's AI agent for speech synthesis
    if (provider === 'orbit-ai-agent') {
      // The Orbit AI agent handles TTS by sending text to the agent room
      // Agent will speak directly in the room with muted mic for other participants
      // For API-based TTS, we fall back to voice synthesis but mark it as agent-initiated
      console.log('Orbit AI Agent TTS requested - using agent voice synthesis');
      
      // For now, delegate to voice synthesis with agent voice settings
      // In production, this would dispatch to a running Orbit AI agent
      const apiKey = process.env.ORBIT_AI_VOICE_API_KEY;
      const agentVoiceId = process.env.ORBIT_AI_AGENT_VOICE_ID || process.env.ORBIT_AI_VOICE_ID;
      const modelId = process.env.ORBIT_AI_VOICE_MODEL_ID || 'orbit-ai-voice-1';

      if (!apiKey || !agentVoiceId) {
        return new NextResponse('Agent voice not configured', { status: 503 });
      }

      const voiceBaseUrl = process.env.ORBIT_AI_VOICE_BASE_URL || 'https://api.orbit.ai';
      const response = await fetch(`${voiceBaseUrl}/tts/bytes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Orbit-AI-Version': '2025-04-16',
        },
        body: JSON.stringify({
          model_id: modelId,
          transcript: text,
          voice: { mode: 'id', id: agentVoiceId },
          output_format: { container: 'wav', encoding: 'pcm_f32le', sample_rate: 44100 },
          speed: 'normal',
          generation_config: { speed: 1.0, volume: 1, emotion: 'neutral' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Agent TTS error:', errorData);
        return new NextResponse('Agent TTS failed', { status: 500 });
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`Agent TTS successful: ${audioBuffer.byteLength} bytes`);
      return new NextResponse(audioBuffer, {
        headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-cache' },
      });
    }

    const apiKey = process.env.ORBIT_AI_VOICE_API_KEY;
    const voiceEnv = process.env.ORBIT_AI_VOICE_ID;
    const modelId = process.env.ORBIT_AI_VOICE_MODEL_ID || 'orbit-ai-voice-1';
    const voiceToUse = requestedVoiceId?.trim() || voiceEnv;

    if (!apiKey || !voiceToUse) {
      return new NextResponse('Orbit AI voice not configured', { status: 503 });
    }

    const voiceBaseUrl = process.env.ORBIT_AI_VOICE_BASE_URL || 'https://api.orbit.ai';
    const response = await fetch(`${voiceBaseUrl}/tts/bytes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Provider docs: Authorization Bearer + API version header.
        Authorization: `Bearer ${apiKey}`,
        // Keep X-API-Key as a compatibility fallback for some gateways.
        'X-API-Key': apiKey,
        'Orbit-AI-Version': '2025-04-16',
      },
      body: JSON.stringify({
        model_id: modelId,
        transcript: text,
        voice: {
          mode: 'id',
          id: voiceToUse,
        },
        output_format: {
          container: 'wav',
          encoding: 'pcm_f32le',
          sample_rate: 44100,
        },
        speed: 'normal',
        generation_config: {
          speed: 1.1,
          volume: 1,
          emotion: 'calm',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Orbit AI voice error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        modelId,
        voiceToUse: voiceToUse.substring(0, 8) + '...',
      });
      return new NextResponse(`TTS failed: ${response.status}`, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`TTS successful: generated ${audioBuffer.byteLength} bytes for text: "${text.substring(0, 30)}..."`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS route internal error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
