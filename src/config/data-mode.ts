type DataMode = "real" | "mock" | "auto";

const validDataModes: DataMode[] = ["real", "mock", "auto"];

function normalizeDataMode(value: unknown): DataMode {
  return typeof value === "string" && validDataModes.includes(value as DataMode)
    ? (value as DataMode)
    : "auto";
}

const FORCE_MOCK_MODE = true;

export const dataMode: DataMode = FORCE_MOCK_MODE
  ? "mock"
  : normalizeDataMode(import.meta.env.VITE_DATA_MODE);

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const isMockMode = dataMode === "mock";
export const isRealMode = dataMode === "real";
export const isAutoMode = dataMode === "auto";

export const isSupabaseAvailable = !isMockMode && hasSupabaseEnv;