import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// If not configured, we export a dummy client or handle it in services
// To avoid breaking existing imports and types, we provide a safe fallback
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : {} as any; // Cast as any to avoid type errors in legacy code, but isSupabaseConfigured should be checked
