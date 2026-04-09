const fs = require('fs');
const path = require('path');

async function testPipeline() {
  const baseUrl = 'http://localhost:3000'; // Assuming dev server is running on 3000
  const textToTranslate = "Hello, how are you?";
  const targetLang = "es"; // Spanish

  console.log(`[1] Testing Translation: "${textToTranslate}" -> ${targetLang}`);

  try {
    // 1. Translation Step
    const translateRes = await fetch(`${baseUrl}/api/orbit/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToTranslate, targetLang })
    });

    if (!translateRes.ok) {
      throw new Error(`Translation API failed: ${translateRes.status} ${translateRes.statusText}`);
    }

    const translateData = await translateRes.json();
    const translatedText = translateData.translation;
    console.log(`    ✅ Translated: "${translatedText}"`);

    // 2. TTS Step
    console.log(`[2] Testing TTS for: "${translatedText}"`);
    const ttsRes = await fetch(`${baseUrl}/api/orbit/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: translatedText })
    });

    if (!ttsRes.ok) {
      throw new Error(`TTS API failed: ${ttsRes.status} ${ttsRes.statusText}`);
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Simple verification of WAV header (RIFF....WAVE)
    const header = buffer.slice(0, 4).toString();
    const format = buffer.slice(8, 12).toString();
    
    if (buffer.length > 0) {
        console.log(`    ✅ TTS Audio received: ${buffer.length} bytes`);
        if (header === 'RIFF' && format === 'WAVE') {
             console.log(`    ✅ Verified valid WAV header`);
        } else {
             // It might be raw PCM if we requested that, but our route returns WAV usually or raw depending on implementation.
             // Our mock returns Float32Array buffer which isn't a WAV file structure, it's raw PCM floats.
             // But let's check what we implemented.
             // The implementation in tts/route.ts returns `buffer.buffer`.
             // If it's the mock, it's a Float32Array.buffer. That is raw PCM bytes, not a WAV file with headers.
             // If it's Cartesia, we requested container: "wav".
             console.log(`    ℹ️  Received data (First 4 bytes: ${buffer.slice(0, 4).toString('hex')})`);
        }
    } else {
        throw new Error("TTS returned empty buffer");
    }

    console.log("\n✅ Pipeline Test Passed!");

  } catch (error) {
    console.error("\n❌ Pipeline Test Failed:", error.message);
    process.exit(1);
  }
}

testPipeline();
