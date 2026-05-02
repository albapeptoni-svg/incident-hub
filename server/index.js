import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GEMINI_PARTE_PROMPT } from "./geminiPrompt.js";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.GEMINI_SERVER_PORT || 8787;
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
  const base = {
    model: GEMINI_MODEL,
    endpoint: GEMINI_GENERATE_ENDPOINT,
  };

  if (status === 404 || message.includes("404")) {
    return {
      status: 404,
      ...base,
      error: `Modelo Gemini no encontrado o no compatible. Revisa el modelo configurado. Modelo: ${GEMINI_MODEL}. Endpoint: ${GEMINI_GENERATE_ENDPOINT}`,
    };
  }

  if (status === 401 || status === 403 || message.includes("401") || message.includes("403")) {
    return {
      status: status || 403,
      ...base,
      error: "API key no válida o sin permisos.",
    };
  }

  if (status === 429 || message.includes("429")) {
    return {
      status: 429,
      ...base,
      error: "Límite de uso de Gemini alcanzado.",
    };
  }

  return {
    status: status || 500,
    ...base,
    error: "Error analizando parte con Gemini.",
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

app.get("/api/gemini-models", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Falta GEMINI_API_KEY en .env.local",
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

app.post("/api/analizar-parte", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Falta GEMINI_API_KEY en .env.local",
      });
    }

    if (typeof imageBase64 !== "string" || !imageBase64) {
      return res.status(400).json({
        error: "Falta imageBase64",
      });
    }

    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return res.status(413).json({
        error: "Imagen demasiado grande",
      });
    }

    if (!allowedMimeTypes.has(mimeType)) {
      return res.status(400).json({
        error: "Tipo de archivo no permitido",
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
                  mime_type: mimeType || "image/jpeg",
                  data: imageBase64,
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
        error: "Gemini no devolvió respuesta válida",
        model: GEMINI_MODEL,
        endpoint: GEMINI_GENERATE_ENDPOINT,
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      return res.status(500).json({
        error: "Gemini no devolvió JSON válido",
        rawText,
      });
    }

    return res.json(parsed);
  } catch (error) {
    console.error("Error analizando parte con Gemini:", error);
    return res.status(500).json({
      error: "Error analizando parte con Gemini.",
      model: GEMINI_MODEL,
      endpoint: GEMINI_GENERATE_ENDPOINT,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Gemini activo en http://localhost:${PORT}`);
  console.log(`Modelo Gemini activo: ${GEMINI_MODEL}`);
});
