type DataMode = "real" | "mock" | "auto";

const validDataModes: DataMode[] = ["real", "mock", "auto"];

function normalizeDataMode(value: unknown): DataMode {
  return typeof value === "string" && validDataModes.includes(value as DataMode)
    ? (value as DataMode)
    : "auto";
}

function isEnabled(value: unknown) {
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const requestedDataMode = normalizeDataMode(import.meta.env.VITE_DATA_MODE);
const explicitlyRequestedMock =
  requestedDataMode === "mock" ||
  isEnabled(import.meta.env.VITE_USE_MOCK) ||
  isEnabled(import.meta.env.DEV_MODE) ||
  isEnabled(import.meta.env.MOCK_AUTH);

const canUseMockMode = import.meta.env.DEV && explicitlyRequestedMock;

export const dataMode: DataMode = canUseMockMode
  ? "mock"
  : requestedDataMode === "real"
    ? "real"
    : "auto";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const isMockMode = dataMode === "mock";
export const isRealMode = dataMode === "real";
export const isAutoMode = dataMode === "auto";

export const isSupabaseAvailable = !isMockMode && hasSupabaseEnv;
