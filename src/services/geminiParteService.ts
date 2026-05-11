import { supabase } from "@/integrations/supabase/client";
import { SAFE_MESSAGES } from "@/lib/safeError";

export type IncidenciaGemini = {
  titulo: string;
  texto: string;
  incluirEnSIEC: boolean;
  confianza: "alta" | "media" | "baja";
  grupo?: string;
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sesión no válida. Vuelve a iniciar sesión.");
  }

  const base64 = await fileToBase64(file);

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(mapGeminiHttpError(response.status));
  }

  if (!data) {
    throw new Error("Gemini no devolvió respuesta válida");
  }

  const payload = isObject(data) && "data" in data ? data.data : data;

  return normalizarRespuestaGemini(payload);
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
    const texto = item.trim();
    const titulo = generarTituloFallback(texto);

    return {
      titulo,
      texto,
      incluirEnSIEC: true,
      confianza: "media",
    };
  }

  if (!isObject(item)) {
    return {
      titulo: "Incidencia sin título",
      texto: "",
      incluirEnSIEC: true,
      confianza: "baja",
    };
  }

  const titulo = stringSeguro(item.titulo);
  const descripcion = stringSeguro(item.descripcion);
  const textoAlternativo = stringSeguro(item.texto);
  const textoOriginal = stringSeguro(item.texto_original_detectado);

  const textoFinal = textoAlternativo || descripcion || textoOriginal || titulo;
  const tituloFinal = normalizarTituloIncidencia(titulo, textoFinal);

  const esChecklist =
    tituloFinal.toLowerCase().includes("checklist") ||
    textoFinal.toLowerCase().includes("checklist");

  return {
    titulo: tituloFinal || (esChecklist ? "Checklist" : "Incidencia sin título"),
    texto: textoFinal,
    incluirEnSIEC:
      typeof item.incluirEnSIEC === "boolean"
        ? item.incluirEnSIEC
        : !esChecklist,
    confianza: normalizarConfianza(item.confianza),
    grupo: stringSeguro(item.grupo) || undefined,
  };
}

export function normalizarTituloIncidencia(titulo: string, texto: string): string {
  const tituloLimpio = validarTituloTecnico(titulo, texto);
  const tituloEsRecorteDebil = esRecorteDebil(tituloLimpio, texto);

  if (
    tituloLimpio &&
    tituloLimpio.split(/\s+/).length <= 7 &&
    !tituloEsRecorteDebil
  ) {
    return tituloLimpio;
  }

  return generarTituloFallback(texto);
}

export function validarTituloTecnico(titulo: string, textoOriginal: string): string {
  const limpio = normalizarTituloTecnico(titulo, textoOriginal);

  if (!tituloEsInvalido(limpio)) {
    return limpio;
  }

  const fallback = generarTituloFallback(textoOriginal);
  return tituloEsInvalido(fallback) ? "Incidencia sin título" : fallback;
}

export function generarTituloFallback(texto: string): string {
  const limpio = construirTituloDesdeTexto(texto);
  if (!limpio) return "Incidencia sin título";

  const palabras = quitarConectoresFinales(limpio.split(/\s+/).filter(Boolean));
  if (palabras.length <= 6) return limpio;

  return quitarConectoresFinales(palabras.slice(0, 6)).join(" ");
}

const CONECTORES_FINALES = new Set([
  "Y",
  "DE",
  "EN",
  "CON",
  "PARA",
  "POR",
  "A",
  "DEL",
  "LA",
  "EL",
  "LOS",
  "LAS",
  "UN",
  "UNA",
]);

const VERBOS_SOLOS_INVALIDOS = new Set([
  "REPARAR",
  "AJUSTAR",
  "REAPRETAR",
  "ATORNILLAR",
  "REMACHAR",
  "COLOCAR",
  "MONTAR",
  "DESMONTAR",
  "SUSTITUIR",
  "CAMBIAR",
  "LIMPIAR",
  "LIMPIEZA",
  "REVISAR",
  "COMPROBAR",
  "PROBAR",
  "PRUEBA",
  "DESATASCAR",
  "MASILLAR",
  "SELLAR",
  "PINTAR",
  "INSTALAR",
  "RETIRAR",
]);

const PALABRAS_DESCARTABLES = new Set([
  ...CONECTORES_FINALES,
  "LAS",
  "LOS",
  "UN",
  "UNA",
  "E",
  "PESCADERÍA",
  "PESCADERIA",
  "CARNICERÍA",
  "CARNICERIA",
  "FRUTERÍA",
  "FRUTERIA",
  "PANADERÍA",
  "PANADERIA",
  "CHARCUTERÍA",
  "CHARCUTERIA",
  "ALMACÉN",
  "ALMACEN",
  "OBRADOR",
  "OBR",
  "EXT",
  "INT",
  "EXTERIOR",
  "INTERIOR",
  "ACCESO",
  "ACCESOS",
  "ESCALÓN",
  "ESCALON",
  "JUNTO",
  "LADO",
  "ZONA",
  "SALIDA",
  "EMERG",
  "EMERGENCIA",
  "BASURA",
  "TIERRA",
  "PARED",
  "SUELO",
  "DOS",
  "SEGURIDAD",
  "NEGRA",
  "AMARILLA",
  "TORN",
  "TORNILLO",
  "TORNILLOS",
  "REMACHE",
  "REMACHES",
  "ARANDELA",
  "ARANDELAS",
  "TACO",
  "TACOS",
  "CINTA",
  "SILICONA",
  "MASILLA",
  "LUBRICANTE",
  "LUBRIC",
  "MATERIAL",
  "MATERIALES",
  "HERRAMIENTA",
  "HERRAMIENTAS",
  "INICIO",
  "PARADA",
]);

const ACCIONES_PRIORITARIAS = [
  "DESATASCAR",
  "REPARAR",
  "SUSTITUIR",
  "CAMBIAR",
  "COLOCAR",
  "ATORNILLAR",
  "REMACHAR",
  "MASILLAR",
  "SELLAR",
  "PINTAR",
  "AJUSTAR",
  "REVISAR",
  "COMPROBAR",
  "MONTAR",
  "INSTALAR",
  "REAPRETAR",
  "RETIRAR",
  "PRUEBA",
  "PROBAR",
  "LIMPIEZA",
  "LIMPIAR",
  "DESMONTAR",
  "LUBRICAR",
];

export function limpiarTituloTecnico(titulo: string, textoOriginal = ""): string {
  return normalizarTituloTecnico(titulo, textoOriginal);
}

export function normalizarTituloTecnico(titulo: string, textoOriginal = ""): string {
  const limpio = normalizarTextoTitulo(titulo);
  const sintetizado = construirTituloDesdeTexto(limpio);
  const palabras = quitarConectoresFinales((sintetizado || limpio).split(/\s+/).filter(Boolean));

  if (palabras.length < 2 && textoOriginal) {
    return construirTituloDesdeTexto(textoOriginal);
  }

  const acortado = palabras.length > 6 ? acortarTitulo(palabras, textoOriginal) : palabras;
  const resultado = quitarConectoresFinales(acortado).join(" ");

  return resultado || (textoOriginal ? construirTituloDesdeTexto(textoOriginal) : "");
}

function construirTituloDesdeTexto(texto: string): string {
  const limpio = normalizarTextoTitulo(texto);
  if (!limpio) return "";

  const accion = detectarAccionPrincipal(limpio);

  if ((accion === "REPARAR" || accion === "ATORNILLAR") && contieneTodos(limpio, ["PANEL", "ESTANTERÍA"])) {
    return limpio.includes("PILAS")
      ? `${accion} PANEL ESTANTERÍA PILAS`
      : `${accion} PANEL ESTANTERÍA`;
  }

  if ((accion === "AJUSTAR" || accion === "REAPRETAR") && contieneTodos(limpio, ["TAPA", "SANITARIO"])) {
    return limpio.includes("WC") ? `${accion} TAPA SANITARIO WC` : `${accion} TAPA SANITARIO`;
  }

  if (accion === "REAPRETAR" && limpio.includes("TORNILLERÍA") && limpio.includes("TAPA")) {
    return limpio.includes("WC") ? "REAPRETAR TORNILLERÍA TAPA WC" : "REAPRETAR TORNILLERÍA TAPA";
  }

  if (accion === "COLOCAR" && limpio.includes("CINTA") && limpio.includes("SEÑALIZACIÓN")) {
    return "COLOCAR CINTA SEÑALIZACIÓN";
  }

  if (accion === "REMACHAR" && limpio.includes("PLANCHA")) {
    if (contieneTodos(limpio, ["MESA", "CORTE"])) return "REMACHAR PLANCHA MESA CORTE";
    return "REMACHAR PLANCHA";
  }

  if (accion === "ATORNILLAR" && limpio.includes("PORTAROLLOS")) {
    return limpio.includes("PAPEL") ? "ATORNILLAR PORTAROLLOS PAPEL" : "ATORNILLAR PORTAROLLOS";
  }

  if (accion === "MASILLAR" && limpio.includes("PARED")) {
    return limpio.includes("DESPERFECTOS") ? "MASILLAR DESPERFECTOS PARED" : "MASILLAR PARED";
  }

  if ((accion === "LIMPIEZA" || accion === "LIMPIAR") && contieneTodos(limpio, ["GRUPO", "PRESIÓN", "CONTRAINCENDIOS"])) {
    return "LIMPIEZA GRUPO PRESIÓN CONTRAINCENDIOS";
  }

  if (accion === "DESATASCAR" && contieneTodos(limpio, ["CANALÓN", "DESAGÜE"])) {
    return "DESATASCAR CANALÓN DESAGÜE";
  }

  if ((accion === "PRUEBA" || accion === "PROBAR") && contieneTodos(limpio, ["GRUPO", "ELECTRÓGENO"])) {
    return "PRUEBA GRUPO ELECTRÓGENO";
  }

  if (accion === "REPARAR" && limpio.includes("PLANCHA")) {
    return limpio.includes("ALMACÉN") ? "REPARAR PLANCHA ALMACÉN" : "REPARAR PLANCHA";
  }

  if (accion === "MONTAR" && limpio.includes("MANGUERA") && limpio.includes("CONECTOR")) {
    return "MONTAR CONECTOR MANGUERA";
  }

  const clausula = seleccionarClausulaPrincipal(limpio);
  const palabras = clausula
    .split(/\s+/)
    .filter(Boolean)
    .filter((palabra, index, arr) => {
      if (index === 0) return true;
      if (palabra === "PARED" && (arr[0] === "MASILLAR" || arr.includes("DESPERFECTOS"))) return true;
      if (palabra === "SUELO" && (arr[0] === "REPARAR" || arr[0] === "PINTAR")) return true;
      if (palabra === "CINTA" && arr[0] === "COLOCAR") return true;
      return !PALABRAS_DESCARTABLES.has(palabra);
    });

  const titulo = quitarConectoresFinales(palabras.slice(0, 6)).join(" ");
  if (!tituloEsInvalido(titulo)) return titulo;

  const fallbackObjeto = construirTituloPorObjetoCompuesto(limpio, accion);
  return fallbackObjeto || titulo;
}

function construirTituloPorObjetoCompuesto(texto: string, accion: string) {
  const verbo = accion || detectarAccionPrincipal(texto);
  if (!verbo) return "";

  const objetos: Array<[string[], string]> = [
    [["PANEL", "ESTANTERÍA", "PILAS"], "PANEL ESTANTERÍA PILAS"],
    [["PANEL", "ESTANTERÍA"], "PANEL ESTANTERÍA"],
    [["TAPA", "SANITARIO", "WC"], "TAPA SANITARIO WC"],
    [["TAPA", "SANITARIO"], "TAPA SANITARIO"],
    [["TORNILLERÍA", "SUJECIÓN", "TAPA", "WC"], "TORNILLERÍA SUJECIÓN TAPA WC"],
    [["PORTAROLLOS", "PAPEL"], "PORTAROLLOS PAPEL"],
    [["PLANCHA", "MESA", "CORTE"], "PLANCHA MESA CORTE"],
    [["CINTA", "SEÑALIZACIÓN"], "CINTA SEÑALIZACIÓN"],
    [["GRUPO", "ELECTRÓGENO"], "GRUPO ELECTRÓGENO"],
    [["GRUPO", "PRESIÓN", "CONTRAINCENDIOS"], "GRUPO PRESIÓN CONTRAINCENDIOS"],
    [["GRUPO", "PRESIÓN"], "GRUPO PRESIÓN"],
    [["BOMBA", "SUMERGIDA"], "BOMBA SUMERGIDA"],
    [["CANALÓN", "DESAGÜE"], "CANALÓN DESAGÜE"],
  ];

  const match = objetos.find(([palabras]) => contieneTodos(texto, palabras));
  return match ? `${verbo} ${match[1]}` : "";
}

function normalizarTextoTitulo(texto: string): string {
  return aplicarAcentosTecnicos(stringSeguro(texto))
    .replace(/\([^)]*(\)|$)/g, " ")
    .replace(/\[[^\]]*(\]|$)/g, " ")
    .replace(/\b\d{1,2}:\d{2}\s*h?\b/gi, " ")
    .replace(/\b\d+\s*x\s*\d+\s*mm\b/gi, " ")
    .replace(/\b\d+\/\d+\s*(kg|kgr|g|gr|m|cm|mm|l|ml)\b/gi, " ")
    .replace(/\b\d+([,.]\d+)?\s*(cm|mm|m|ml|ud|uds|unid|unidades|kg|kgr|l|litros?)\b/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[>\[\]()/\\:;]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/[+.,]+/g, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function aplicarAcentosTecnicos(texto: string): string {
  return texto
    .replace(/\bPRESION\b/gi, "PRESIÓN")
    .replace(/\bELECTROGENO\b/gi, "ELECTRÓGENO")
    .replace(/\bCANALON\b/gi, "CANALÓN")
    .replace(/\bDESAGUE\b/gi, "DESAGÜE")
    .replace(/\bRAPIDO\b/gi, "RÁPIDO")
    .replace(/\bALMACEN\b/gi, "ALMACÉN")
    .replace(/\bESTANTERIA\b/gi, "ESTANTERÍA")
    .replace(/\bTORNILLERIA\b/gi, "TORNILLERÍA")
    .replace(/\bSUJECION\b/gi, "SUJECIÓN")
    .replace(/\bSENALIZACION\b/gi, "SEÑALIZACIÓN")
    .replace(/\bSEÑALIZACION\b/gi, "SEÑALIZACIÓN")
    .replace(/\bFRUTERIA\b/gi, "FRUTERÍA")
    .replace(/\bFUNC\b/gi, "FUNC.");
}

function tituloEsInvalido(titulo: string): boolean {
  const limpio = normalizarTextoTitulo(titulo);
  if (!limpio) return true;
  if (/[\[\]()>/:;+\-]/.test(titulo)) return true;
  if (/\b\d+([,.]\d+)?\s*(cm|mm|m|ml|kg|kgr|l|litros?)\b/i.test(titulo)) return true;

  const palabras = quitarConectoresFinales(limpio.split(/\s+/).filter(Boolean));
  if (palabras.length < 2) return true;
  if (palabras.length > 8) return true;
  if (VERBOS_SOLOS_INVALIDOS.has(palabras.join(" "))) return true;
  if (CONECTORES_FINALES.has(palabras[palabras.length - 1])) return true;

  const accion = detectarAccionPrincipal(limpio);
  return Boolean(accion) && palabras.length === 1;
}

function quitarConectoresFinales(palabras: string[]) {
  const resultado = [...palabras];
  while (resultado.length > 0 && CONECTORES_FINALES.has(resultado[resultado.length - 1])) {
    resultado.pop();
  }
  return resultado;
}

function acortarTitulo(palabras: string[], textoOriginal: string) {
  if (textoOriginal) return construirTituloDesdeTexto(textoOriginal).split(/\s+/).filter(Boolean);
  return palabras.slice(0, 6);
}

function seleccionarClausulaPrincipal(texto: string) {
  const clausulas = texto
    .split(/\s+Y\s+|\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (clausulas.length === 0) return texto;

  return clausulas
    .slice()
    .sort((a, b) => prioridadAccion(detectarAccionPrincipal(a)) - prioridadAccion(detectarAccionPrincipal(b)))[0];
}

function detectarAccionPrincipal(texto: string) {
  const limpio = normalizarTextoTitulo(texto);
  return ACCIONES_PRIORITARIAS.find((accion) => new RegExp(`\\b${accion}\\b`).test(limpio)) || "";
}

function prioridadAccion(accion: string) {
  const index = ACCIONES_PRIORITARIAS.indexOf(accion);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function contieneTodos(texto: string, palabras: string[]) {
  return palabras.every((palabra) => texto.includes(palabra));
}

function esRecorteDebil(titulo: string, textoOriginal: string) {
  if (!titulo || !textoOriginal) return false;

  const tituloNormalizado = normalizarTextoTitulo(titulo);
  const textoNormalizado = normalizarTextoTitulo(textoOriginal);
  const accionTitulo = detectarAccionPrincipal(tituloNormalizado);
  const accionTexto = detectarAccionPrincipal(textoNormalizado);

  if (accionTexto && accionTitulo && prioridadAccion(accionTexto) < prioridadAccion(accionTitulo)) {
    return true;
  }

  return (
    textoNormalizado.startsWith(tituloNormalizado) &&
    textoNormalizado.length > tituloNormalizado.length + 8 &&
    tituloNormalizado.split(/\s+/).length >= 5
  );
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
  if (status === 400 || status === 413) {
    return SAFE_MESSAGES.invalidFile;
  }

  if (status === 401 || status === 403) {
    return status === 401 ? SAFE_MESSAGES.auth : SAFE_MESSAGES.forbidden;
  }

  if (status === 429) {
    return "Demasiadas solicitudes. Inténtalo de nuevo más tarde.";
  }

  return SAFE_MESSAGES.ocr;
}
