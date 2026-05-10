type SafeMeta = Record<string, string | number | boolean | null | undefined>;

const isDevelopment = import.meta.env.DEV;

function normalizeMeta(meta?: SafeMeta) {
  if (!meta) return undefined;

  return Object.fromEntries(
    Object.entries(meta).filter(([, value]) => {
      const type = typeof value;
      return value == null || type === "string" || type === "number" || type === "boolean";
    })
  );
}

function write(level: "debug" | "info" | "warn" | "error", message: string, meta?: SafeMeta) {
  if (!isDevelopment) return;

  const safeMeta = normalizeMeta(meta);
  const output = safeMeta && Object.keys(safeMeta).length > 0 ? [message, safeMeta] : [message];
  console[level](...output);
}

export const logger = {
  debug: (message: string, meta?: SafeMeta) => write("debug", message, meta),
  info: (message: string, meta?: SafeMeta) => write("info", message, meta),
  warn: (message: string, meta?: SafeMeta) => write("warn", message, meta),
  error: (message: string, meta?: SafeMeta) => write("error", message, meta),
};
