import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ggsrzehdjmxbpxgfutfv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Imdnc3J6ZWhkam14YnB4Z2Z1dGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTQxOTksImV4cCI6MjA5MjUzMDE5OX0.51QTA4G3NqjlP1zZMiTwyQ01uLy2ki_gzti0atlkrKo';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// If not configured, we export a dummy client or handle it in services
// To avoid breaking existing imports and types, we provide a safe fallback
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : {} as any; // Cast as any to avoid type errors in legacy code, but isSupabaseConfigured should be checked
