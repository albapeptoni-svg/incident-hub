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

const GEMINI_API_URL =
  (import.meta.env.VITE_GEMINI_API_URL as string | undefined) ||
  "/api/analizar-parte";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function analizarParteConGemini(file: File): Promise<ResultadoGemini> {
  if (!file) {
    throw new Error("No se ha seleccionado ningún archivo");
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, PNG o WEBP.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el tamaño máximo de 8 MB.");
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : data?.error?.message || mapGeminiHttpError(response.status);
    throw new Error(message);
  }

  if (!data) {
    throw new Error("Gemini no devolvió respuesta válida");
  }

  return normalizarRespuestaGemini(data);
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
  if (typeof item === "string") {
    return {
      titulo: item.trim().slice(0, 80) || "Incidencia sin título",
      descripcion: item.trim(),
      incluirEnSIEC: true,
      confianza: "media",
    };
  }

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

function mapGeminiHttpError(status: number): string {
  if (status === 404) {
    return "Modelo Gemini no encontrado o no compatible. Revisa el modelo configurado.";
  }

  if (status === 401 || status === 403) {
    return "API key no válida o sin permisos.";
  }

  if (status === 429) {
    return "Límite de uso de Gemini alcanzado.";
  }

  return `Error analizando parte con Gemini (${status}).`;
}
