import { logger } from "@/lib/logger";

export const SAFE_MESSAGES = {
  generic: "No se ha podido completar la operación.",
  auth: "Credenciales incorrectas o cuenta no disponible.",
  forbidden: "No tienes permisos para realizar esta acción.",
  invalidFile: "Archivo no válido.",
  ocr: "Error temporal del servicio OCR.",
} as const;

export type SafeMessage = (typeof SAFE_MESSAGES)[keyof typeof SAFE_MESSAGES];

function getErrorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
}

export function getSafeUserMessage(error: unknown, fallback: SafeMessage = SAFE_MESSAGES.generic) {
  const text = getErrorText(error).toLowerCase();

  if (text.includes("permission") || text.includes("permiso") || text.includes("rls") || text.includes("403")) {
    return SAFE_MESSAGES.forbidden;
  }

  if (text.includes("archivo") || text.includes("file") || text.includes("mime") || text.includes("formato")) {
    return SAFE_MESSAGES.invalidFile;
  }

  if (text.includes("ocr") || text.includes("gemini") || text.includes("modelo")) {
    return SAFE_MESSAGES.ocr;
  }

  return fallback;
}

export function logTechnicalError(context: string, error: unknown) {
  const text = getErrorText(error);
  logger.error(context, {
    errorType: error instanceof Error ? error.name : typeof error,
    hasMessage: Boolean(text),
  });
}
