import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isSupabaseAvailable, supabaseAnonKey, supabaseUrl } from '@/config/data-mode';

export const isSupabaseConfigured = isSupabaseAvailable;

// If not configured, we export a dummy client or handle it in services
// To avoid breaking existing imports and types, we provide a safe fallback
export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : {} as SupabaseClient<Database>;
