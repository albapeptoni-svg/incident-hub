import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_PARTE_PROMPT } from "./geminiPrompt.js";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.GEMINI_SERVER_PORT || 8787;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Gemini SIEC local server",
    model: "gemini-2.5-flash-lite",
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

    if (!imageBase64) {
      return res.status(400).json({
        error: "Falta imageBase64",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: GEMINI_PARTE_PROMPT },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;

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
      error: "Error analizando parte con Gemini",
      details: error?.message || String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Gemini activo en http://localhost:${PORT}`);
  console.log("Modelo Gemini activo: gemini-2.5-flash-lite");
});