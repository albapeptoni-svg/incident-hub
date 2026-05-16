const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const GEMINI_PARTE_PROMPT = `
Actua como un sistema experto en lectura de partes de trabajo manuscritos de mantenimiento.

Analiza la imagen y extrae:
- centro
- fecha_visita
- todas las lineas del parte como incidencias revisables

Reglas:
- Devuelve SOLO JSON valido.
- Sin markdown.
- Sin explicaciones fuera del JSON.
- No ignores ninguna linea del parte manuscrito.
- Incluye tambien CHECKLIST si aparece.
- Si detectas CHECKLIST, crealo como incidencia revisable con:
  titulo: "Checklist"
  descripcion: texto original detectado
  incluirEnSIEC: false
  confianza: "alta"
- Las incidencias reales deben tener incluirEnSIEC: true por defecto.
- La decision final de incluir o no cada linea la toma el usuario revisor.
- Genera un titulo breve por incidencia.
- Conserva la descripcion lo mas fiel posible al texto original.

Formato obligatorio:
{
  "centro": "",
  "fecha_visita": "",
  "incidencias": [
    {
      "titulo": "",
      "descripcion": "",
      "incluirEnSIEC": true,
      "confianza": "media"
    }
  ],
  "texto_original_detectado": "",
  "avisos": []
}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Metodo no permitido" }, 405);
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Falta Authorization Bearer" }, 401);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return json({ error: "Falta GEMINI_API_KEY en Supabase" }, 500);
  }

  let payload: {
    imageBase64?: string;
    image?: string;
    base64?: string;
    file?: string;
    mimeType?: string;
    prompt?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body JSON invalido" }, 400);
  }

  const imageBase64 = payload.imageBase64 || payload.image || payload.base64 || payload.file;
  const mimeType = payload.mimeType || "image/jpeg";

  if (!imageBase64) {
    return json({ error: "Falta imageBase64" }, 400);
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: payload.prompt || GEMINI_PARTE_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const geminiData = await geminiResponse.json().catch(() => null);

  if (!geminiResponse.ok) {
    return json(
      {
        error:
          geminiData?.error?.message ||
          `Error Gemini ${geminiResponse.status}`,
      },
      geminiResponse.status,
    );
  }

  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    return json({ error: "Gemini no devolvio respuesta valida" }, 502);
  }

  try {
    return json(JSON.parse(rawText));
  } catch {
    return json({ error: "Gemini no devolvio JSON valido", rawText }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
