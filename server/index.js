import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GEMINI_PARTE_PROMPT } from "./geminiPrompt.js";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.GEMINI_SERVER_PORT || process.env.PORT || 8787;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_GENERATE_ENDPOINT = `${GEMINI_API_BASE_URL}/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_MODELS_ENDPOINT = `${GEMINI_API_BASE_URL}/models`;
const allowedOrigins = (process.env.GEMINI_ALLOWED_ORIGINS || "http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BASE64_LENGTH = 12_000_000;
const OCR_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OCR_RATE_LIMIT_PER_USER = 20;
const OCR_RATE_LIMIT_PER_IP = 60;
const allowedRoles = new Set(["admin", "revisor", "tecnico"]);
const rateLimitBuckets = new Map();
const isDevelopment = process.env.NODE_ENV !== "production";

function logServerError(message, error) {
  if (!isDevelopment) return;
  console.error(message, {
    errorType: error instanceof Error ? error.name : typeof error,
    hasMessage: Boolean(error?.message),
  });
}

function genericError(status, error) {
  return { status, error };
}

function getSupabaseServerClient(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function checkRateLimit(key, limit) {
  const now = Date.now();
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + OCR_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

async function authenticateOcrRequest(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json(genericError(401, "No autorizado."));
  }

  const supabase = getSupabaseServerClient(token);
  if (!supabase) {
    return res.status(500).json(genericError(500, "No se ha podido completar la operación."));
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      if (userError) logServerError("Supabase token validation failed", userError);
      return res.status(401).json(genericError(401, "No autorizado."));
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("activo,rol")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("Supabase profile validation failed", profileError);
      return res.status(403).json(genericError(403, "No tienes permisos para realizar esta acción."));
    }

    if (!profile?.activo || !allowedRoles.has(profile.rol)) {
      return res.status(403).json(genericError(403, "No tienes permisos para realizar esta acción."));
    }

    if (!checkRateLimit(`user:${user.id}`, OCR_RATE_LIMIT_PER_USER)) {
      return res.status(429).json(genericError(429, "Demasiadas solicitudes. Inténtalo de nuevo más tarde."));
    }

    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkRateLimit(`ip:${ip}`, OCR_RATE_LIMIT_PER_IP)) {
      return res.status(429).json(genericError(429, "Demasiadas solicitudes. Inténtalo de nuevo más tarde."));
    }

    req.ocrUser = { id: user.id, role: profile.rol };
    return next();
  } catch (error) {
    logServerError("OCR auth middleware failed", error);
    return res.status(500).json(genericError(500, "No se ha podido completar la operación."));
  }
}

function cleanBase64(value) {
  return value.replace(/^data:.*;base64,/i, "").trim();
}

function validateImagePayload(body) {
  const imageBase64 = typeof body?.imageBase64 === "string" ? cleanBase64(body.imageBase64) : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";

  if (!imageBase64) {
    return { ok: false, status: 400, error: "Archivo no válido." };
  }

  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return { ok: false, status: 413, error: "Archivo no válido." };
  }

  if (!allowedMimeTypes.has(mimeType)) {
    return { ok: false, status: 400, error: "Archivo no válido." };
  }

  if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64)) {
    return { ok: false, status: 400, error: "Archivo no válido." };
  }

  return { ok: true, imageBase64, mimeType };
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origen no permitido"));
    },
  })
);
app.use(express.json({ limit: "12mb" }));

function getGeminiErrorResponse(status, data) {
  const message = String(data?.error?.message || data?.error || "");

  if (status === 404 || message.includes("404")) {
    return {
      status: 404,
      error: "Error temporal del servicio OCR.",
    };
  }

  if (status === 401 || status === 403 || message.includes("401") || message.includes("403")) {
    return {
      status: status || 403,
      error: "Error temporal del servicio OCR.",
    };
  }

  if (status === 429 || message.includes("429")) {
    return {
      status: 429,
      error: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
    };
  }

  return {
    status: status || 500,
    error: "Error temporal del servicio OCR.",
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Gemini SIEC local server",
    model: GEMINI_MODEL,
    endpoint: GEMINI_GENERATE_ENDPOINT,
  });
});

app.get("/api/gemini-models", authenticateOcrRequest, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "No se ha podido completar la operación.",
    });
  }

  const endpoint = `${GEMINI_MODELS_ENDPOINT}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mapped = getGeminiErrorResponse(response.status, data);
    return res.status(mapped.status).json(mapped);
  }

  return res.json({
    modelConfigured: GEMINI_MODEL,
    endpoint: GEMINI_MODELS_ENDPOINT,
    models: data?.models || [],
  });
});

app.post("/api/analizar-parte", authenticateOcrRequest, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "No se ha podido completar la operación.",
      });
    }

    const validation = validateImagePayload(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({
        error: validation.error,
      });
    }

    const endpoint = `${GEMINI_GENERATE_ENDPOINT}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: GEMINI_PARTE_PROMPT },
              {
                inline_data: {
                  mime_type: validation.mimeType,
                  data: validation.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const mapped = getGeminiErrorResponse(response.status, data);
      return res.status(mapped.status).json(mapped);
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({
        error: "Error temporal del servicio OCR.",
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      logServerError("Gemini JSON parse failed", error);
      return res.status(500).json({
        error: "Error temporal del servicio OCR.",
      });
    }

    return res.json(parsed);
  } catch (error) {
    logServerError("Gemini analysis failed", error);
    return res.status(500).json({
      error: "Error temporal del servicio OCR.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Gemini activo en http://localhost:${PORT}`);
  console.log(`Modelo Gemini activo: ${GEMINI_MODEL}`);
});
