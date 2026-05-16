import { hasSupabaseEnv } from "@/config/data-mode";
import { supabase } from "@/integrations/supabase/client";

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

const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL as string | undefined;

export async function analizarParteConGemini(file: File): Promise<ResultadoGemini> {
  if (!GEMINI_API_URL) {
    throw new Error("Falta configurar VITE_GEMINI_API_URL");
  }

  if (!file) {
    throw new Error("No se ha seleccionado ningún archivo");
  }

  const base64 = await fileToBase64(file);
  const accessToken = await getSupabaseAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type || "image/jpeg",
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      `Error OCR ${response.status}`;
    throw new Error(message);
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

export function generarTituloFallback(texto: string): string {
  const limpio = String(texto ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\d\s.\-:;]+/, "")
    .trim();

  if (!limpio) {
    return "Incidencia sin título";
  }

  const primeraFrase = limpio.split(/[.!?]/)[0]?.trim() || limpio;

  return primeraFrase.length > 80
    ? `${primeraFrase.slice(0, 77).trim()}...`
    : primeraFrase;
}

export function normalizarTituloIncidencia(
  titulo: string,
  texto?: string
): string {
  const tituloLimpio = String(titulo ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\d\s.\-:;]+/, "")
    .trim();

  if (tituloLimpio.length > 0) {
    return tituloLimpio.length > 80
      ? `${tituloLimpio.slice(0, 77).trim()}...`
      : tituloLimpio;
  }

  return generarTituloFallback(String(texto ?? ""));
}

function normalizarIncidencia(item: unknown): IncidenciaGemini {
  if (typeof item === "string") {
    const texto = item.trim();
    const esChecklist = texto.toLowerCase().includes("checklist");

    return {
      titulo: normalizarTituloIncidencia(texto, texto),
      descripcion: texto,
      incluirEnSIEC: !esChecklist,
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
    titulo: normalizarTituloIncidencia(
      titulo || (esChecklist ? "Checklist" : "Incidencia sin título"),
      descripcion
    ),
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

async function getSupabaseAccessToken(): Promise<string | null> {
  if (!hasSupabaseEnv || !supabase.auth?.getSession) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error("No se pudo obtener la sesión de Supabase");
  }

  return data.session?.access_token ?? null;
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
