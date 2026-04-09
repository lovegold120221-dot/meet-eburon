
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials in environment variables.");
  console.error("SUPABASE_URL:", SUPABASE_URL ? 'Present' : 'Missing');
  console.error("SUPABASE_KEY:", SUPABASE_KEY ? 'Present' : 'Missing');
}

// Create a safe client that won't crash if env vars are missing
export const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null as any; // Fallback to null to prevent crashes

if (!supabase) {
  console.warn("⚠️ Supabase client not initialized - database features will be disabled");
}
