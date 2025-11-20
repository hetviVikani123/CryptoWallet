import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Service client (has admin privileges - use for backend operations)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client (for client-side operations with RLS)
export const supabaseAnon: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey || supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

// Test connection
export const connectSupabase = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      // If table doesn't exist yet, that's okay
      if (error.code === '42P01') {
        logger.warn('⚠️  Supabase connected but tables not created yet. Run migrations.');
        return true;
      }
      // If Supabase returns an invalid API key error, provide a clearer hint
      const msg = error.message || String(error);
      if (typeof msg === 'string' && msg.toLowerCase().includes('invalid api key')) {
        logger.error('Supabase reported an invalid API key. Double-check SUPABASE_SERVICE_KEY in backend/.env (use the service_role key).');
        throw new Error('Invalid Supabase API key. Double-check SUPABASE_SERVICE_KEY in backend/.env (use the service_role key).');
      }
      throw error;
    }
    
    logger.info('✅ Supabase connected successfully');
    return true;
  } catch (error: any) {
    // Log without exposing keys
    logger.error('❌ Failed to connect to Supabase:', error?.message || error);
    // Re-throw so server startup fails fast and surfaces a clear error to the operator
    throw error;
  }
};

export default supabase;
