const fs = require('fs');
const path = require('path');

// 1. Manually read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      env[key] = value;
    }
  });
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("🔐 Using Service Role Key (Bypassing RLS)");
} else {
    console.log("⚠️ Using Anon Key (Subject to RLS)");
}

// Helper for Supabase REST
async function sbFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

async function injectTest() {
  console.log('🔍 Inspecting `transcriptions` table schema...');
  const res = await sbFetch('transcriptions?limit=1');
  if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
          console.log('✅ Found row. Columns:', Object.keys(data[0]));
      } else {
          console.log('⚠️ Table is empty, cannot verify columns by select.');
      }
  } else {
      console.error('❌ Failed to select:', res.status, await res.text());
  }

  // Insert Logic
  const meetingId = 'irgk-361l';
  const testSpeakerId = "00000000-0000-0000-0000-000000000000"; 
  const text = "This is a test segment for the final schema.";
  
  const payload = {
    meeting_id: meetingId,
    speaker_id: testSpeakerId,
    transcribe_text_segment: text,
    full_transcription: text + " (full)",
    users_all: [] // or ['userid1', 'userid2']
  };

  console.log(`🚀 Injecting: "${text}" into 'transcriptions' with new schema`);

  const insertRes = await sbFetch('transcriptions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (insertRes.ok) {
    console.log('✅ Successfully injected! Check your Orbit Translator UI.');
  } else {
    console.error('❌ Insert failed:', insertRes.status, await insertRes.text());
  }
}

injectTest();
