const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function apply() {
  const sql = fs.readFileSync('supabase/migrations/20260105_orbit_translator.sql', 'utf8');
  const commands = sql.split(';').filter(cmd => cmd.trim());
  
  for (const cmd of commands) {
    console.log('Executing:', cmd.substring(0, 50) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: cmd });
    if (error) {
      if (error.message.includes('function orbit.exec_sql() does not exist') || error.message.includes('Method not found')) {
         // Fallback if exec_sql RPC is not available (common on some setups)
         console.warn('exec_sql RPC not found. Trying raw query if possible or reporting failure.');
         break;
      }
      console.error('Error executing query:', error);
    }
  }
}

// Alternatively, since exec_sql might not be allowed for security, 
// I will try to use a more direct method if available or ask for user intervention 
// IF this script fails. 

apply();
