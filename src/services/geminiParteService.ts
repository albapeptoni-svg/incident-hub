export type IncidenciaGemini = {
  titulo: string;
  descripcion: string;
  incluirEnSIEC: boolean;
  confianza: "alta" | "media" | "baja";
};

export type ResultadoGemini = {
  centro: string;
  fecha_visita: string;
  incidencias: IncidenciaGemini[];
  texto_original_detectado: string;
  avisos: string[];
};

const GEMINI_MODEL = "gemini-2.5-flash";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export async function analizarParteConGemini(file: File): Promise<ResultadoGemini> {
  if (!API_KEY) {
    throw new Error("Falta VITE_GEMINI_API_KEY en el archivo .env");
  }

  if (!file) {
    throw new Error("No se ha seleccionado ningún archivo");
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
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
              {
                text: `Analiza este parte de trabajo manuscrito o escaneado.

Extrae:
- centro
- fecha_visita
- todas las líneas del parte como incidencias revisables

Reglas:
- Devuelve SOLO JSON válido.
- Sin markdown.
- Sin explicaciones fuera del JSON.
- No ignores ninguna línea del parte manuscrito.
- Incluye también CHECKLIST si aparece.
- Si detectas CHECKLIST, créalo como incidencia revisable con:
  titulo: "Checklist"
  descripcion: texto original detectado
  incluirEnSIEC: false
  confianza: "alta"
- Las incidencias reales deben tener incluirEnSIEC: true por defecto.
- La decisión final de incluir o no cada línea la toma el usuario revisor.
- Genera un título breve por incidencia.
- Conserva la descripción lo más fiel posible al texto original.

Formato:
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
}`,
              },
              {
                inlineData: {
                  mimeType: file.type || "image/jpeg",
                  data: base64,
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
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || `Error Gemini ${response.status}`;
    throw new Error(message);
  }

  const respuestaGemini = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!respuestaGemini) {
    throw new Error("Gemini no devolvió respuesta válida");
  }

  return normalizarRespuestaGemini(respuestaGemini);
}

export function normalizarRespuestaGemini(respuesta: unknown): ResultadoGemini {
  let parsed: unknown = respuesta;

  if (typeof respuesta === "string") {
    const limpio = limpiarJsonGemini(respuesta);

    try {
      parsed = JSON.parse(limpio);
    } catch {
      throw new Error("Error parseando JSON de Gemini");
    }
  }

  if (!isObject(parsed)) {
    throw new Error("Respuesta de Gemini inválida");
  }

  const incidenciasRaw = Array.isArray(parsed.incidencias)
    ? parsed.incidencias
    : [];

  return {
    centro: stringSeguro(parsed.centro),
    fecha_visita: stringSeguro(parsed.fecha_visita),
    incidencias: incidenciasRaw.map(normalizarIncidencia),
    texto_original_detectado: stringSeguro(parsed.texto_original_detectado),
    avisos: Array.isArray(parsed.avisos)
      ? parsed.avisos.map((a) => String(a))
      : [],
  };
}

function normalizarIncidencia(item: unknown): IncidenciaGemini {
  if (!isObject(item)) {
    return {
      titulo: "Incidencia sin título",
      descripcion: "",
      incluirEnSIEC: true,
      confianza: "baja",
    };
  }

  const titulo = stringSeguro(item.titulo);
  const descripcion = stringSeguro(item.descripcion);
  const esChecklist =
    titulo.toLowerCase().includes("checklist") ||
    descripcion.toLowerCase().includes("checklist");

  return {
    titulo: titulo || (esChecklist ? "Checklist" : "Incidencia sin título"),
    descripcion,
    incluirEnSIEC:
      typeof item.incluirEnSIEC === "boolean"
        ? item.incluirEnSIEC
        : !esChecklist,
    confianza: normalizarConfianza(item.confianza),
  };
}

function normalizarConfianza(valor: unknown): "alta" | "media" | "baja" {
  if (valor === "alta" || valor === "media" || valor === "baja") {
    return valor;
  }

  return "media";
}

function limpiarJsonGemini(texto: string): string {
  return texto
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function stringSeguro(valor: unknown): string {
  return typeof valor === "string"
    ? valor
    : valor == null
    ? ""
    : String(valor);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Error convirtiendo archivo"));
        return;
      }

      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("Base64 inválido"));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Error leyendo archivo"));

    reader.readAsDataURL(file);
  });
}