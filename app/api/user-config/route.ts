import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

// GET: Fetch user config by identity
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identity = searchParams.get('identity');

    if (!identity) {
      return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('user_configs')
      .select('*')
      .eq('user_identity', identity)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Return default config if not found
    if (!data) {
      return NextResponse.json({
        tts_engine: 'orbit-ai-voice',
        translation_engine: 'orbit-ai',
        target_language: 'en',
        voice_id: null,
        continuous_save_enabled: false,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('User config GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST: Upsert user config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identity, tts_engine, translation_engine, target_language, voice_id, continuous_save_enabled } = body;

    if (!identity) {
      return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { error } = await supabase
      .from('user_configs')
      .upsert({
        user_identity: identity,
        tts_engine: tts_engine || 'orbit-ai-voice',
        translation_engine: translation_engine || 'orbit-ai',
        target_language: target_language || 'en',
        voice_id: voice_id || null,
        continuous_save_enabled: continuous_save_enabled ?? false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_identity',
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User config POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
