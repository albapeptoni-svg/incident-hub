import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  isSupabaseAvailable,
  supabaseAnonKey,
  supabaseUrl,
} from "@/config/data-mode";

export const isSupabaseConfigured = isSupabaseAvailable;

const REMEMBER_SESSION_KEY = "siec-remember-session";

const adaptiveAuthStorage: Storage = {
  getItem: (key) => {
    const remember = localStorage.getItem(REMEMBER_SESSION_KEY) !== "false";
    return remember ? localStorage.getItem(key) : sessionStorage.getItem(key);
  },

  setItem: (key, value) => {
    const remember = localStorage.getItem(REMEMBER_SESSION_KEY) !== "false";
    const storage = remember ? localStorage : sessionStorage;

    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    storage.setItem(key, value);
  },

  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },

  clear: () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => localStorage.removeItem(key));

    Object.keys(sessionStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => sessionStorage.removeItem(key));
  },

  key: (index) => {
    const localKey = localStorage.key(index);
    if (localKey) return localKey;

    const sessionIndex = index - localStorage.length;
    return sessionStorage.key(sessionIndex);
  },

  get length() {
    return localStorage.length + sessionStorage.length;
  },
};

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: adaptiveAuthStorage,
      },
    })
  : ({} as SupabaseClient<Database>);