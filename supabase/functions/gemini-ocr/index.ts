const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_IMAGE_BASE64_LENGTH = 12_000_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ROLES = new Set(["admin", "tecnico"]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = (Deno.env.get("OCR_ALLOWED_ORIGINS") || "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "http://localhost:8080";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function cleanBase64(value: string) {
  return value.replace(/^data:.*;base64,/, "").trim();
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function extractJsonFromText(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function validateUser(req: Request) {
  const token = getBearerToken(req);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!token) return { ok: false, status: 401, error: "No autorizado." };
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "No se ha podido completar la operación." };
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!authResponse.ok) return { ok: false, status: 401, error: "No autorizado." };

  const user = await authResponse.json().catch(() => null);
  if (!user?.id) return { ok: false, status: 401, error: "No autorizado." };

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=activo,rol&id=eq.${encodeURIComponent(user.id)}`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!profileResponse.ok) {
    return { ok: false, status: 403, error: "No tienes permisos para realizar esta acción." };
  }

  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;

  if (!profile?.activo || !ALLOWED_ROLES.has(profile.rol)) {
    return { ok: false, status: 403, error: "No tienes permisos para realizar esta acción." };
  }

  return { ok: true, userId: user.id, role: profile.rol };
}

function validateImagePayload(imageBase64: string, mimeType: string) {
  if (!imageBase64 || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) return false;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return false;
  return /^[A-Za-z0-9+/=\s]+$/.test(imageBase64);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { error: "Método no permitido. Usa POST." },
      405,
    );
  }

  const auth = await validateUser(req);
  if (!auth.ok) {
    return jsonResponse(req, { error: auth.error }, auth.status);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return jsonResponse(
      req,
      { error: "No se ha podido completar la operación." },
      500,
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let imageBase64 = "";
    let mimeType = "image/jpeg";
    let prompt = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") || formData.get("image");

      if (!(file instanceof File)) {
        return jsonResponse(
          req,
          { error: "No se recibió ningún archivo en el campo file/image." },
          400,
        );
      }

      if (file.size > 8 * 1024 * 1024) {
        return jsonResponse(req, { error: "Archivo no válido." }, 413);
      }

      imageBase64 = await fileToBase64(file);
      mimeType = file.type || "image/jpeg";
      prompt = String(formData.get("prompt") || "");
    } else {
      const body = await req.json();

      imageBase64 = cleanBase64(
        body.imageBase64 || body.base64 || body.image || "",
      );

      mimeType = body.mimeType || body.mime_type || "image/jpeg";
      prompt = body.prompt || "";
    }

    if (!imageBase64) {
      return jsonResponse(
        req,
        { error: "No se recibió imagen en base64 ni archivo." },
        400,
      );
    }

    if (!validateImagePayload(imageBase64, mimeType)) {
      return jsonResponse(req, { error: "Archivo no válido." }, 400);
    }

    const finalPrompt =
      prompt ||
      `
Eres un sistema de extracción de partes de trabajo manuscritos para mantenimiento.

Analiza la imagen y devuelve SOLO un JSON válido, sin markdown, sin explicaciones y sin texto adicional.

Formato obligatorio:
{
  "centro": "string",
  "fecha_visita": "string",
  "incidencias": [
    {
      "id": 1,
      "titulo": "string",
      "texto": "string",
      "incluirEnSIEC": true
    }
  ]
}

Reglas:
- No inventes información.
- Si no puedes leer un dato, deja el campo vacío.
- Cada línea numerada del parte debe convertirse en una incidencia independiente.
- No incluyas el número inicial de la incidencia.
- "texto" debe conservar el texto completo original de la incidencia, lo más fiel posible al manuscrito.
- Corrige solo errores evidentes de OCR, sin cambiar el significado.
- Para cada incidencia debes generar un campo titulo.
- El titulo debe ser una etiqueta técnica breve y coherente para SIEC.
- No puede ser un recorte literal del texto original.
- No puede ser solo un verbo.
- Debe contener obligatoriamente: ACCIÓN PRINCIPAL + ELEMENTO TÉCNICO PRINCIPAL.
- Puede añadir un complemento técnico si es necesario para entender la actuación.
- El título debe responder a: "¿Qué trabajo técnico se hizo y sobre qué elemento?"
- Si ibas a devolver un título de una sola palabra, debes rehacerlo añadiendo el objeto técnico principal extraído del texto original.
- Construye un título nuevo con la estructura: VERBO + OBJETO PRINCIPAL + COMPLEMENTO IMPRESCINDIBLE.
- El título debe responder a: "¿Cómo llamaría un técnico a esta actuación en una lista rápida de trabajos?"
- No debe responder a: "¿Qué frase completa aparece en el parte?"
- El título debe tener normalmente entre 3 y 6 palabras. Puede tener 2 solo si contiene acción y objeto técnico claro.
- Elimina materiales, cantidades, medidas, horarios, textos entre corchetes, textos entre paréntesis, ubicaciones comerciales no esenciales y detalles de ejecución.
- No incluyas secciones como pescadería, carnicería, frutería, panadería, charcutería, almacén, obrador, entrada, parking, aseos, cuarto basuras o sala máquinas salvo que sean imprescindibles.
- No incluyas ubicaciones secundarias como pared, suelo, escalón, acceso, zona, exterior, interior o salida emergencia salvo que formen parte del objeto principal.
- Si hay varias acciones, identifica cuál es la actuación principal. Si una acción es el medio y otra es el objetivo, usa el objetivo en el título.
- No termines nunca el título con conectores como Y, DE, EN, CON, PARA, POR, A, DEL, LA, EL.
- No incluyas símbolos como corchetes, paréntesis, barras, guiones o dos puntos.
- No incluyas frases después de "y" si son acciones secundarias.
- No incluyas aclaraciones como "junto a", "al lado de" o "zona de" si no son esenciales.
- No sustituyas nunca el texto original por el título.
- Ejemplos prohibidos como título completo: "REPARAR", "AJUSTAR", "COLOCAR", "CAMBIAR", "LIMPIAR", "REVISAR", "ATORNILLAR", "MONTAR", "SUSTITUIR".

Ejemplos de título:
- Texto: "REPARAR Y ATORNILLAR A PANEL ESTANTERIA EXP PILAS (8) PERCHAS PARA COLOCAR BLISTERS PILAS [16 TORN 4,5x35 mm]"
  Título: "REPARAR PANEL ESTANTERÍA PILAS"
- Texto: "AJUSTAR Y REAPRETAR TORNILLERIA SUJECION TAPA SANITARIO WC ASEO PERSONAL"
  Título: "AJUSTAR TAPA SANITARIO WC"
- Texto: "COLOCAR CINTA DE SEÑALIZACION DE SEGURIDAD EN ESCALON DE LOS DOS ACCESOS A PESCADERIA [10 m. CINTA NEGRA Y AMARILLA]"
  Título: "COLOCAR CINTA SEÑALIZACIÓN"
- Texto: "REMACHAR PLANCHA MESA DE CORTE PESCADERIA [3 REMACHES]"
  Título: "REMACHAR PLANCHA MESA CORTE"
- Texto: "ATORNILLAR PORTAROLLOS PAPEL EN PARED CARNICERÍA [3 TORN 3x10mm + 2 ARANDELAS]"
  Título: "ATORNILLAR PORTAROLLOS PAPEL"
- Texto: "MASILLAR DESPERFECTOS PARED EXT. OBR. PANADERÍA [1/2 Kgr. MASILLA]"
  Título: "MASILLAR DESPERFECTOS PARED"
- Texto: "LIMPIEZA RECINTO GRUPO PRESION CONTRAINCENDIOS Y LUBRICAR PESTILLO Y CANDADO (20ml LUBRIC)"
  Título: "LIMPIEZA GRUPO PRESIÓN CONTRAINCENDIOS"
- Texto: "DESMONTAR REJILLAS CANALON DE DESAGUE - SALIDA EMERG. Y DESATASCAR DE BASURA Y TIERRA."
  Título: "DESATASCAR CANALÓN DESAGÜE"
- Texto: "PRUEBA GRUPO ELECTROGENO [ INICIO 8:36h. - PARADA 8:53h. ]"
  Título: "PRUEBA GRUPO ELECTRÓGENO"
- Texto: "COMPROBAR CORRECTO FUNC. BOMBA SUMERGIDA ARQUETA JUNTO OBR. FRUTERÍA"
  Título: "COMPROBAR CORRECTO FUNC. BOMBA SUMERGIDA"
- Texto: "MONTAR CONECTOR RAPIDO MANGUERA Y PUNTA DE LANZA CUARTO BASURAS"
  Título: "MONTAR CONECTOR MANGUERA"
- Texto: "REPARAR PLANCHA DAMERO GOLPEADA ALMACÉN (50x30cm PLANCHA DAMERO + 8 REMACHES)"
  Título: "REPARAR PLANCHA ALMACÉN"
`;

    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
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
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return jsonResponse(
        req,
        {
          error: geminiResponse.status === 429
            ? "Demasiadas solicitudes. Inténtalo de nuevo más tarde."
            : "Error temporal del servicio OCR.",
        },
        geminiResponse.status === 429 ? 429 : 502,
      );
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    const parsed = extractJsonFromText(text);

    if (!parsed) {
      return jsonResponse(
        req,
        {
          error: "Error temporal del servicio OCR.",
        },
        502,
      );
    }

    return jsonResponse(req, {
      ok: true,
      data: parsed,
    });
  } catch (error) {
    return jsonResponse(
      req,
      {
        error: "Error temporal del servicio OCR.",
      },
      500,
    );
  }
});
