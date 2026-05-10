import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Usuario } from "@/types";
import {
  generarTituloFallback,
  normalizarTituloIncidencia,
} from "@/services/geminiParteService";
import { formatFechaES } from "@/utils";
import { logger } from "@/lib/logger";

type ParteInsert = Database["public"]["Tables"]["partes"]["Insert"];
type ParteUpdate = Database["public"]["Tables"]["partes"]["Update"];
type IncidenciaInsert = Database["public"]["Tables"]["incidencias"]["Insert"];
type IncidenciaUpdate = Database["public"]["Tables"]["incidencias"]["Update"];

export type IncidenciaParte = {
  id: string;
  titulo: string;
  texto: string;
  incluirEnSIEC: boolean;
  estado?: string;
  motivoExclusion?: string;
  ordenLinea?: number;
  actualizadoEn?: string;
};

export type ParteOperativo = {
  id: string;
  titulo: string;
  centro: string;
  fecha: string;
  incidencias: IncidenciaParte[];
  origen?: string;
  estado?: string;
  creadoEn: string;
  actualizadoEn?: string;
  gestionadoEn?: string;
};

export type IncidenciaColaSIEC = {
  id: string;
  parteId: string;
  parteTitulo: string;
  centro: string;
  fecha: string;
  titulo: string;
  texto: string;
  descripcion: string;
  estado: "aprobada";
  origen: string;
  creadoEn: string;
};

export type RegistroHistorialSIEC = {
  id: string;
  loteId?: string;
  lote_id?: string;
  batchId?: string;
  batch_id?: string;
  envioId?: string;
  envio_id?: string;
  parteId?: string;
  parteTitulo?: string;
  centro?: string;
  fecha?: string;
  texto?: string;
  descripcion?: string;
  titulo?: string;
  estado?: "gestionado";
  origen?: string;
  enviadoEn?: string;
  accion?: "envio_siec_simulado" | "gestionado_siec";
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  usuarioRol?: string;
};

export type AppConfig = {
  nombreEmpresa: string;
  entorno: "pruebas" | "produccion";
  modoSiec: "simulado" | "manual" | "api_futura";
  emailResponsable?: string;
};

export type OcrIncidenciaInput = {
  titulo?: string;
  texto: string;
  incluirEnSIEC: boolean;
  grupo?: string;
};

export type UsuarioAuditoria = {
  id?: string;
  email?: string;
  profile?: Usuario | null;
};

export type ResultadoEnvioSiecSimulado = {
  ok: true;
  modo: "simulado";
  total: number;
  enviados: {
    id: string;
    titulo: string;
    estado: "enviada";
    fechaEnvioSimulado: string;
  }[];
};

export type DashboardParteRow = {
  id: string;
  titulo: string;
  centro: string;
  fecha: string;
  estado: string;
  numIncidencias?: number;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type DashboardIncidenciaRow = {
  id: string;
  parteId: string;
  titulo: string;
  texto: string;
  estado: string;
  crearEnSIEC: boolean;
  motivoExclusion?: string;
  ordenLinea?: number;
  creadoEn?: string;
  actualizadoEn?: string;
};

const DEFAULT_CONFIG: AppConfig = {
  nombreEmpresa: "",
  entorno: "pruebas",
  modoSiec: "simulado",
  emailResponsable: "",
};
const MAX_TITULO_LENGTH = 160;
const MAX_CENTRO_LENGTH = 160;
const MAX_INCIDENCIA_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const ESTADOS_PARTE = new Set([
  "procesado",
  "listo_para_enviar",
  "enviado",
  "completado",
]);
const ESTADOS_VALIDOS_INCIDENCIA = [
  "pendiente",
  "corregida",
  "aprobada",
  "descartada",
  "enviada",
  "confirmada",
  "error",
  "reenviada",
] as const;
const ESTADO_PARTE_LISTO_PARA_COLA = "listo_para_enviar";
const ESTADO_INCIDENCIA_EN_COLA: (typeof ESTADOS_VALIDOS_INCIDENCIA)[number] = "aprobada";
const ESTADO_INCIDENCIA_ENVIADA: (typeof ESTADOS_VALIDOS_INCIDENCIA)[number] = "enviada";
const ESTADO_PARTE_ENVIADO = "enviado";
export const SIEC_SIMULATION_MODE = true;
const ESTADOS_PARTE_HISTORICO = ["enviado", "completado"] as const;
const ESTADOS_VALIDOS_PARTE = [
  "borrador",
  "procesado",
  "en_revision",
  "aprobado",
  "listo_para_enviar",
  "enviado",
  "completado",
  "error",
] as const;
const ESTADOS_VALIDOS_PARTE_OCR = [
  "borrador",
  "procesado",
  "en_revision",
  "aprobado",
  "listo_para_enviar",
  "enviado",
  "completado",
  "error",
] as const;
const ESTADO_PARTE_OCR: (typeof ESTADOS_VALIDOS_PARTE_OCR)[number] = "procesado";

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function assertSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
}

function isMissingColumnError(error: SupabaseErrorLike | null | undefined) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    (text.includes("column") && text.includes("schema cache")) ||
    text.includes("does not exist")
  );
}

function throwSupabaseError(context: string, error: SupabaseErrorLike): never {
  logger.error("Supabase operation failed", {
    context,
    code: error.code,
    hasDetails: Boolean(error.details),
    hasHint: Boolean(error.hint),
  });
  const enriched = new Error(`${context}: ${error.message || "Error desconocido de Supabase."}`) as Error &
    SupabaseErrorLike;
  enriched.code = error.code;
  enriched.details = error.details;
  enriched.hint = error.hint;
  throw enriched;
}

function assertEstadoParteValido(estado: string) {
  if (!ESTADOS_VALIDOS_PARTE.includes(estado as (typeof ESTADOS_VALIDOS_PARTE)[number])) {
    throw new Error(`Estado inválido para parte: ${estado}`);
  }
}

function assertEstadoIncidenciaValido(estado: string) {
  if (!ESTADOS_VALIDOS_INCIDENCIA.includes(estado as (typeof ESTADOS_VALIDOS_INCIDENCIA)[number])) {
    throw new Error(`Estado inválido para incidencia: ${estado}`);
  }
}

function crearCodigo(prefix = "PAR") {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(16)
    .slice(2, 8)
    .toUpperCase()}`;
}

function normalizarTexto(texto: string) {
  return texto.trim().replace(/\s+/g, " ");
}

function esLineaChecklistSinIncidencia(texto: string) {
  return /^checklist\s*[:.\-–—]?\s*$/i.test(texto.trim());
}

function assertLength(value: string, max: number, field: string) {
  if (value.length > max) {
    throw new Error(`${field} supera la longitud máxima de ${max} caracteres.`);
  }
}

function normalizarFecha(fecha: string) {
  const value = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (!match) return value;

  const [, dia, mes, anio] = match;
  const year = anio.length === 2 ? `20${anio}` : anio;
  return `${year}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function assertFechaValida(fecha: string) {
  const normalizada = normalizarFecha(fecha);
  const date = new Date(normalizada);
  if (!normalizada || Number.isNaN(date.getTime())) {
    throw new Error("La fecha del parte no es válida.");
  }
  return normalizada;
}

function getParteTitulo(centro: string, fecha: string) {
  return `Parte ${centro} - ${formatFechaES(fecha) || fecha}`;
}

function getTextoIncidenciaRow(inc: any) {
  return (inc?.texto_corregido || inc?.descripcion || inc?.texto_ocr || "").trim();
}

function getTituloIncidenciaRow(inc: any) {
  return normalizarTituloIncidencia((inc?.titulo || "").trim(), getTextoIncidenciaRow(inc));
}

function incidenciaEsValidaParaCola(inc: any) {
  return Boolean(inc?.parte_id) && inc?.crear_en_siec !== false && getTextoIncidenciaRow(inc).length > 0;
}

function incidenciaEstaVisibleEnCola(inc: any, parte?: any) {
  return (
    incidenciaEsValidaParaCola(inc) &&
    inc.estado === ESTADO_INCIDENCIA_EN_COLA &&
    (!parte || parte.estado === ESTADO_PARTE_LISTO_PARA_COLA)
  );
}

function getParteFromIncidenciaRow(inc: any) {
  return Array.isArray(inc?.partes) ? inc.partes[0] : inc?.partes;
}

function getCentroFromParteRow(parte: any) {
  const centro = Array.isArray(parte?.centros) ? parte.centros[0] : parte?.centros;
  return centro?.nombre || "Centro sin indicar";
}

function validarIncidenciasParaEnvioSimulado(incidencias: any[]) {
  if (!incidencias.length) {
    throw new Error("No hay incidencias seleccionadas para enviar.");
  }

  const incompletas = incidencias.filter((inc) => {
    const parte = getParteFromIncidenciaRow(inc);
    const titulo = getTituloIncidenciaRow(inc);
    const texto = getTextoIncidenciaRow(inc);
    return !inc?.id || !inc?.parte_id || !parte?.id || !titulo || !texto;
  });

  if (incompletas.length > 0) {
    throw new Error("Algunas incidencias no tienen título o descripción. Revísalas antes de enviarlas.");
  }
}

async function insertarParteOcr(input: {
  centroId: string;
  centroNombre: string;
  fecha: string;
  tecnicoId: string;
  titulo: string;
  totalIncidencias: number;
}) {
  assertEstadoParteValido(ESTADO_PARTE_OCR);

  const payload: ParteInsert = {
    codigo: crearCodigo(),
    fecha_visita: input.fecha,
    centro_id: input.centroId,
    tecnico_id: input.tecnicoId,
    estado: ESTADO_PARTE_OCR,
    num_incidencias: input.totalIncidencias,
  };

  logger.info("Creating OCR part", {
    estado: payload.estado,
    totalIncidencias: input.totalIncidencias,
  });

  const result = await supabase
    .from("partes")
    .insert(payload)
    .select("id")
    .single();

  if (result.error) {
    throwSupabaseError("No se pudo insertar el parte OCR en public.partes", result.error);
  }

  return result.data;
}

async function registrarAuditoriaOcr(input: {
  tecnicoId: string;
  parteId: string;
  totalIncidencias: number;
  centro: string;
  fecha: string;
}) {
  const payload = {
    user_id: input.tecnicoId,
    accion: "crear_parte_ocr",
    entidad: "partes",
    entidad_id: input.parteId,
    payload: {
      totalIncidencias: input.totalIncidencias,
      centro: input.centro,
      fecha: input.fecha,
    },
  };

  const enrichedResult = await supabase.from("audit_log" as any).insert({
    ...payload,
    resultado: "exito",
  });

  if (!enrichedResult.error) return;

  if (isMissingColumnError(enrichedResult.error)) {
    const baseResult = await supabase.from("audit_log" as any).insert(payload);
    if (!baseResult.error) return;
  }

  logger.warn("OCR audit registration failed", {
    code: enrichedResult.error.code,
  });
}

async function ensureCentro(nombre: string) {
  assertSupabase();
  const limpio = normalizarTexto(nombre);
  if (!limpio) throw new Error("El centro es obligatorio.");
  assertLength(limpio, MAX_CENTRO_LENGTH, "Centro");

  const { data: existente, error: errorBusqueda } = await supabase
    .from("centros")
    .select("id,nombre")
    .ilike("nombre", limpio)
    .maybeSingle();

  if (errorBusqueda) throw errorBusqueda;
  if (existente) return existente;

  const codigo = limpio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 24) || crearCodigo("CTR");

  const { data, error } = await supabase
    .from("centros")
    .insert({
      nombre: limpio,
      codigo,
      ciudad: "",
    })
    .select("id,nombre")
    .single();

  if (error) throw error;
  return data;
}

function mapParte(row: any, incidencias: any[]): ParteOperativo {
  const centro = row.centros?.nombre || "Centro sin indicar";
  const fecha = row.fecha_visita || "";

  return {
    id: row.id,
    titulo: row.codigo || getParteTitulo(centro, fecha),
    centro,
    fecha,
    origen: "OCR/Gemini",
    estado: row.estado || "procesado",
    creadoEn: row.fecha_visita || new Date().toISOString(),
    actualizadoEn: row.updated_at || row.fecha_visita || "",
    gestionadoEn: row.updated_at || row.fecha_visita || "",
    incidencias: incidencias
      .slice()
      .sort((a, b) => (a.orden_linea ?? 0) - (b.orden_linea ?? 0))
      .map((inc) => ({
        id: inc.id,
        titulo: getTituloIncidenciaRow(inc),
        texto: inc.texto_corregido || inc.descripcion || inc.texto_ocr || "",
        incluirEnSIEC: inc.crear_en_siec !== false,
        estado: inc.estado || "",
        motivoExclusion: inc.motivo_exclusion || "",
        ordenLinea: inc.orden_linea,
        actualizadoEn: inc.updated_at || inc.created_at || "",
      })),
  };
}

export const operationalDataService = {
  async crearParteDesdeOcr(input: {
    centro: string;
    fecha: string;
    incidencias: OcrIncidenciaInput[];
    tecnicoId: string;
  }) {
    assertSupabase();

    if (!input.tecnicoId) throw new Error("No hay usuario autenticado.");
    if (!input.centro || !input.centro.trim()) throw new Error("El centro es obligatorio.");
    if (!input.fecha || !input.fecha.trim()) throw new Error("La fecha del parte es obligatoria.");
    if (!Array.isArray(input.incidencias)) throw new Error("Las incidencias OCR no son válidas.");

    const centro = await ensureCentro(input.centro);
    const fecha = assertFechaValida(input.fecha);
    const titulo = getParteTitulo(centro.nombre, fecha);
    assertLength(titulo, MAX_TITULO_LENGTH, "Título");
    const incidencias = input.incidencias
      .map((inc) => {
        const texto = normalizarTexto(inc.texto);
        return {
          titulo: normalizarTituloIncidencia(inc.titulo || "", texto),
          texto,
          incluirEnSIEC: inc.incluirEnSIEC,
          grupo: typeof inc.grupo === "string" ? inc.grupo.trim() : "",
        };
      })
      .filter((inc) => inc.texto && !esLineaChecklistSinIncidencia(inc.texto));

    incidencias.forEach((inc) => {
      assertLength(inc.titulo, MAX_TITULO_LENGTH, "Título de incidencia");
      assertLength(inc.texto, MAX_INCIDENCIA_LENGTH, "Incidencia");
    });
    if (incidencias.length === 0) throw new Error("No hay incidencias OCR válidas para guardar.");

    const parte = await insertarParteOcr({
      centroId: centro.id,
      centroNombre: centro.nombre,
      fecha,
      tecnicoId: input.tecnicoId,
      titulo,
      totalIncidencias: incidencias.length,
    });

    const incidenciasPayload: IncidenciaInsert[] = incidencias.map((inc, index) => ({
      parte_id: parte.id,
      orden_linea: index + 1,
      titulo: inc.titulo || generarTituloFallback(inc.texto),
      texto_ocr: inc.texto,
      texto_corregido: inc.texto,
      tema: "",
      descripcion: inc.texto,
      categoria: "",
      grupo: inc.grupo || "",
      crear_en_siec: inc.incluirEnSIEC,
      estado: "pendiente",
    }));

    logger.info("Creating OCR incidences", {
      count: incidenciasPayload.length,
    });

    const { error: incidenciasError } = await supabase.from("incidencias").insert(incidenciasPayload);
    if (incidenciasError) {
      throwSupabaseError("No se pudieron insertar las incidencias OCR en public.incidencias", incidenciasError);
    }

    await registrarAuditoriaOcr({
      tecnicoId: input.tecnicoId,
      parteId: parte.id,
      totalIncidencias: incidencias.length,
      centro: centro.nombre,
      fecha,
    });

    return parte.id;
  },

  async listarPartes(includeDeleted = false): Promise<ParteOperativo[]> {
    assertSupabase();

    let partes: any[] | null = null;
    let query = supabase
      .from("partes")
      .select("*, centros(nombre)");

    const { data, error } = await query.order("fecha_visita", { ascending: false });
    if (error) {
      if (!isMissingColumnError(error)) {
        throwSupabaseError("No se pudieron cargar los partes desde public.partes", error);
      }

      const fallback = await supabase
        .from("partes")
        .select("*, centros(nombre)")
        .order("fecha_visita", { ascending: false });

      if (fallback.error) {
        throwSupabaseError("No se pudieron cargar los partes desde public.partes", fallback.error);
      }
      partes = fallback.data;
    } else {
      partes = data;
    }

    if (!partes?.length) return [];

    const parteIds = partes.map((parte: any) => parte.id);
    const { data: incidencias, error: incError } = await supabase
      .from("incidencias")
      .select("*")
      .in("parte_id", parteIds);

    if (incError) {
      throwSupabaseError("No se pudieron cargar las incidencias de los partes", incError);
    }

    return partes.map((parte: any) =>
      mapParte(
        parte,
        (incidencias || []).filter((inc: any) => inc.parte_id === parte.id)
      )
    );
  },

  async listarPapelera(): Promise<ParteOperativo[]> {
    return [];
  },

  async listarPartesHistoricos(): Promise<ParteOperativo[]> {
    assertSupabase();

    let partes: any[] | null = null;
    const query = supabase
      .from("partes")
      .select("*, centros(nombre)")
      .in("estado", [...ESTADOS_PARTE_HISTORICO]);

    const { data, error } = await query.order("updated_at" as any, { ascending: false } as any);
    if (error) {
      if (!isMissingColumnError(error)) {
        throwSupabaseError("No se pudieron cargar los partes históricos desde Supabase", error);
      }

      const fallback = await supabase
        .from("partes")
        .select("*, centros(nombre)")
        .in("estado", [...ESTADOS_PARTE_HISTORICO])
        .order("fecha_visita", { ascending: false });

      if (fallback.error) {
        throwSupabaseError("No se pudieron cargar los partes históricos desde Supabase", fallback.error);
      }

      partes = fallback.data;
    } else {
      partes = data;
    }

    if (!partes?.length) return [];

    const parteIds = partes.map((parte: any) => parte.id);
    const { data: incidencias, error: incidenciasError } = await supabase
      .from("incidencias")
      .select("*")
      .in("parte_id", parteIds)
      .order("orden_linea", { ascending: true });

    if (incidenciasError) {
      throwSupabaseError("No se pudieron cargar las incidencias del histórico desde Supabase", incidenciasError);
    }

    return partes.map((parte: any) =>
      mapParte(
        parte,
        (incidencias || []).filter((inc: any) => inc.parte_id === parte.id)
      )
    );
  },

  async actualizarParte(parteId: string, cambios: Partial<Pick<ParteOperativo, "titulo" | "centro" | "fecha">>) {
    assertSupabase();

    const patch: ParteUpdate = {};
    if (typeof cambios.titulo === "string") {
      const codigo = cambios.titulo.trim();
      assertLength(codigo, MAX_TITULO_LENGTH, "Título");
      patch.codigo = codigo;
    }
    if (typeof cambios.fecha === "string") patch.fecha_visita = assertFechaValida(cambios.fecha);
    if (typeof cambios.centro === "string") {
      const centro = await ensureCentro(cambios.centro);
      patch.centro_id = centro.id;
    }

    const { error } = await supabase.from("partes").update(patch).eq("id", parteId);
    if (error) throw error;
  },

  async actualizarIncidencia(incidenciaId: string, cambios: Partial<IncidenciaParte>) {
    assertSupabase();
    const patch: IncidenciaUpdate = {};

    if (typeof cambios.titulo === "string") {
      const titulo = normalizarTituloIncidencia(cambios.titulo, cambios.titulo);
      assertLength(titulo, MAX_TITULO_LENGTH, "Título de incidencia");
      patch.titulo = titulo;
    }

    if (typeof cambios.texto === "string") {
      const texto = normalizarTexto(cambios.texto);
      if (!texto) throw new Error("La incidencia no puede quedar vacía.");
      assertLength(texto, MAX_INCIDENCIA_LENGTH, "Incidencia");
      patch.texto_corregido = texto;
      patch.descripcion = texto;
    }
    if (typeof cambios.incluirEnSIEC === "boolean") patch.crear_en_siec = cambios.incluirEnSIEC;

    const { error } = await supabase.from("incidencias").update(patch).eq("id", incidenciaId);
    if (error) throw error;
  },

  async moverParteAPapelera(parteId: string) {
    assertSupabase();
    logger.info("Moving part to trash");
    const { error: incidenciasError } = await supabase
      .from("incidencias")
      .delete()
      .eq("parte_id", parteId);
    if (incidenciasError) {
      throwSupabaseError("No se pudieron borrar las incidencias asociadas al parte", incidenciasError);
    }

    const { error: parteError } = await supabase
      .from("partes")
      .delete()
      .eq("id", parteId);
    if (parteError) {
      throwSupabaseError("No se pudo borrar el parte", parteError);
    }
  },

  async vaciarListado() {
    assertSupabase();
    const { data: partes, error: partesError } = await supabase
      .from("partes")
      .select("id");

    if (partesError) {
      throwSupabaseError("No se pudieron cargar los partes antes de vaciar el listado", partesError);
    }

    const parteIds = (partes || []).map((parte: any) => parte.id);
    if (parteIds.length === 0) return;

    const { error: incidenciasError } = await supabase
      .from("incidencias")
      .delete()
      .in("parte_id", parteIds);
    if (incidenciasError) {
      throwSupabaseError("No se pudieron borrar las incidencias antes de vaciar el listado", incidenciasError);
    }

    const { error: partesDeleteError } = await supabase
      .from("partes")
      .delete()
      .in("id", parteIds);
    if (partesDeleteError) {
      throwSupabaseError("No se pudieron borrar los partes del listado", partesDeleteError);
    }
  },

  async recuperarPapelera() {
    return;
  },

  async enviarParteAColaSiec(parteId: string) {
    assertSupabase();
    if (!parteId) throw new Error("Falta el id del parte.");
    assertEstadoParteValido(ESTADO_PARTE_LISTO_PARA_COLA);
    assertEstadoIncidenciaValido(ESTADO_INCIDENCIA_EN_COLA);
    logger.info("Preparing part for SIEC queue");

    const { data: parte, error: parteLookupError } = await supabase
      .from("partes")
      .select("id,estado")
      .eq("id", parteId)
      .maybeSingle();

    if (parteLookupError) {
      throwSupabaseError("No se pudo cargar el parte antes de enviarlo a Cola SIEC", parteLookupError);
    }
    if (!parte) {
      throw new Error("No se encontró el parte que se quiere enviar a Cola SIEC.");
    }

    logger.debug("Loaded part before SIEC queue", {
      estado: parte.estado,
    });

    const { data: incidenciasParte, error: incidenciasParteError } = await supabase
      .from("incidencias")
      .select("id,parte_id,estado,crear_en_siec,titulo,texto_corregido,descripcion,texto_ocr,orden_linea")
      .eq("parte_id", parteId);

    if (incidenciasParteError) {
      throwSupabaseError("No se pudieron cargar las incidencias del parte para enviarlo a Cola SIEC", incidenciasParteError);
    }

    logger.debug("Loaded incidences before SIEC queue", {
      count: incidenciasParte?.length || 0,
    });

    const condicion = {
      tabla: "public.incidencias",
      campoEstado: "estado",
      estadoVisibleEnCola: ESTADO_INCIDENCIA_EN_COLA,
      estadoParteVisibleEnCola: ESTADO_PARTE_LISTO_PARA_COLA,
      campoIncluirEnSiec: "crear_en_siec",
      requiereCrearEnSiec: true,
      requiereParteId: parteId,
      requiereTexto: true,
    };
    logger.debug("SIEC queue visibility condition checked", {
      estadoVisibleEnCola: condicion.estadoVisibleEnCola,
      requiereCrearEnSiec: condicion.requiereCrearEnSiec,
    });

    const candidatas = (incidenciasParte || []).filter(incidenciaEsValidaParaCola);
    logger.info("Valid incidences for SIEC queue", {
      count: candidatas.length,
    });

    if (candidatas.length === 0) {
      throw new Error("No hay incidencias válidas para enviar a Cola SIEC.");
    }

    const parteEnEstadoCola = parte.estado === ESTADO_PARTE_LISTO_PARA_COLA;
    const yaEnCola = candidatas.every((inc: any) => incidenciaEstaVisibleEnCola(inc, parte));
    if (yaEnCola) {
      const result = {
        parteId,
        incidenciasEnviadas: 0,
        totalIncidenciasEnCola: candidatas.length,
        estadoColaAplicado: ESTADO_INCIDENCIA_EN_COLA,
        yaEstabaEnCola: true,
      };
      logger.info("Part was already in SIEC queue", {
        totalIncidenciasEnCola: result.totalIncidenciasEnCola,
      });
      return result;
    }

    const idsEnviar = candidatas
      .filter((inc: any) => inc.estado !== ESTADO_INCIDENCIA_EN_COLA)
      .map((inc: any) => inc.id);

    logger.info("Updating incidences for SIEC queue", {
      estado: ESTADO_INCIDENCIA_EN_COLA,
      count: idsEnviar.length,
    });

    if (idsEnviar.length > 0) {
      const payloadIncidencias: IncidenciaUpdate = { estado: ESTADO_INCIDENCIA_EN_COLA };
      const { error: incError } = await supabase
        .from("incidencias")
        .update(payloadIncidencias)
        .in("id", idsEnviar);

      if (incError) {
        throwSupabaseError("No se pudieron marcar incidencias como pendientes de SIEC", incError);
      }
    }

    const payloadParte: ParteUpdate = { estado: ESTADO_PARTE_LISTO_PARA_COLA };
    logger.info("Updating part for SIEC queue", {
      estado: payloadParte.estado,
    });

    if (!parteEnEstadoCola) {
      const { error: parteError } = await supabase
        .from("partes")
        .update(payloadParte)
        .eq("id", parteId);
      if (parteError) {
        throwSupabaseError("No se pudo actualizar el estado del parte tras enviar a Cola SIEC", parteError);
      }
    }

    const result = {
      parteId,
      incidenciasEnviadas: idsEnviar.length,
      totalIncidenciasEnCola: candidatas.length,
      estadoColaAplicado: ESTADO_INCIDENCIA_EN_COLA,
      yaEstabaEnCola: false,
    };
    logger.info("Part sent to SIEC queue", {
      incidenciasEnviadas: result.incidenciasEnviadas,
      totalIncidenciasEnCola: result.totalIncidenciasEnCola,
    });
    return result;
  },

  async enviarParteACola(parte: ParteOperativo) {
    const result = await this.enviarParteAColaSiec(parte.id);
    return result.incidenciasEnviadas;
  },

  async listarCola(): Promise<IncidenciaColaSIEC[]> {
    assertSupabase();
    assertEstadoParteValido(ESTADO_PARTE_LISTO_PARA_COLA);
    assertEstadoIncidenciaValido(ESTADO_INCIDENCIA_EN_COLA);
    const filtros = {
      tabla: "public.incidencias",
      estado: ESTADO_INCIDENCIA_EN_COLA,
      crear_en_siec: true,
      estadoParte: ESTADO_PARTE_LISTO_PARA_COLA,
    };
    logger.debug("Loading SIEC queue", {
      estado: filtros.estado,
      estadoParte: filtros.estadoParte,
    });

    const { data: incidencias, error } = await supabase
      .from("incidencias")
      .select("*")
      .eq("estado", ESTADO_INCIDENCIA_EN_COLA)
      .eq("crear_en_siec", true)
      .order("orden_linea", { ascending: true });

    logger.info("SIEC queue incidences loaded", {
      count: incidencias?.length || 0,
    });
    if (error) {
      logger.error("SIEC queue load failed", {
        code: error.code,
      });
      throw error;
    }

    const incidenciasCandidatas = (incidencias || []).filter(incidenciaEsValidaParaCola);
    if (!incidenciasCandidatas.length) return [];

    const parteIds = Array.from(new Set(incidenciasCandidatas.map((inc: any) => inc.parte_id)));
    const { data: partes, error: partesError } = await supabase
      .from("partes")
      .select("id,codigo,fecha_visita,estado,centros(nombre)")
      .in("id", parteIds);
    if (partesError) throw partesError;

    const partesById = new Map((partes || []).map((parte: any) => [parte.id, parte]));
    const incidenciasVisibles = incidenciasCandidatas.filter((inc: any) =>
      incidenciaEstaVisibleEnCola(inc, partesById.get(inc.parte_id))
    );

    const cola = incidenciasVisibles.map((inc: any) => {
      const parte: any = partesById.get(inc.parte_id);
      const centro = parte?.centros?.nombre || "Centro sin indicar";
      const fecha = parte?.fecha_visita || "";
      const texto = getTextoIncidenciaRow(inc);
      const titulo = getTituloIncidenciaRow(inc);

      return {
        id: inc.id,
        parteId: inc.parte_id,
        parteTitulo: parte?.codigo || getParteTitulo(centro, fecha),
        centro,
        fecha,
        titulo,
        texto,
        descripcion: texto,
        estado: ESTADO_INCIDENCIA_EN_COLA,
        origen: "parte_trabajo_ocr",
        creadoEn: parte?.fecha_visita || new Date().toISOString(),
      };
    });

    logger.info("SIEC queue parts loaded", {
      count: cola.length,
    });
    return cola;
  },

  async enviarIncidenciasASiec(
    incidenciaIds: string[],
    usuario: UsuarioAuditoria
  ): Promise<ResultadoEnvioSiecSimulado | void> {
    assertSupabase();
    if (incidenciaIds.length === 0) {
      throw new Error("No hay incidencias seleccionadas para enviar.");
    }
    if (!usuario.id) throw new Error("No hay usuario autenticado.");
    if (usuario.email) assertLength(usuario.email, MAX_EMAIL_LENGTH, "Email");

    if (!SIEC_SIMULATION_MODE) {
      const { error } = await supabase.rpc("gestionar_incidencias_siec" as any, {
        incidencia_ids: incidenciaIds,
      });
      if (error) throw error;
      return;
    }

    assertEstadoIncidenciaValido(ESTADO_INCIDENCIA_ENVIADA);
    assertEstadoParteValido(ESTADO_PARTE_ENVIADO);

    const now = new Date().toISOString();
    const idsUnicos = Array.from(new Set(incidenciaIds));
    const { data: incidencias, error: incidenciasError } = await supabase
      .from("incidencias")
      .select("*, partes(id,codigo,fecha_visita,estado,centros(nombre))")
      .in("id", idsUnicos);

    if (incidenciasError) {
      throwSupabaseError("No se pudieron leer las incidencias seleccionadas para simular el envío", incidenciasError);
    }

    const seleccionadas = incidencias || [];
    if (seleccionadas.length !== idsUnicos.length) {
      throw new Error("No se encontraron todas las incidencias seleccionadas.");
    }

    validarIncidenciasParaEnvioSimulado(seleccionadas);

    const noPreparadas = seleccionadas.filter((inc: any) => {
      const parte = getParteFromIncidenciaRow(inc);
      return (
        inc.estado !== ESTADO_INCIDENCIA_EN_COLA ||
        inc.crear_en_siec === false ||
        parte?.estado !== ESTADO_PARTE_LISTO_PARA_COLA
      );
    });

    if (noPreparadas.length > 0) {
      throw new Error("Algunas incidencias ya no están pendientes para SIEC. Actualiza la cola y revisa la selección.");
    }

    let updateError: SupabaseErrorLike | null = null;
    const updateResult = await supabase
      .from("incidencias")
      .update({ estado: ESTADO_INCIDENCIA_ENVIADA, updated_at: now } as any)
      .in("id", idsUnicos);
    updateError = updateResult.error;

    if (updateError && isMissingColumnError(updateError)) {
      const fallbackUpdate = await supabase
        .from("incidencias")
        .update({ estado: ESTADO_INCIDENCIA_ENVIADA } as any)
        .in("id", idsUnicos);
      updateError = fallbackUpdate.error;
    }

    if (updateError) {
      throwSupabaseError("No se pudo actualizar el estado de las incidencias en Supabase", updateError);
    }

    const loteId = `SIM-${now.slice(0, 19).replace(/\D/g, "")}`;
    const historialPayload = seleccionadas.map((inc: any) => {
      const parte = getParteFromIncidenciaRow(inc);
      const centro = getCentroFromParteRow(parte);
      const fecha = parte?.fecha_visita || "";
      const texto = getTextoIncidenciaRow(inc);
      const titulo = getTituloIncidenciaRow(inc);

      return {
        lote_id: loteId,
        parte_id: inc.parte_id,
        parte_titulo: parte?.codigo || getParteTitulo(centro, fecha),
        centro,
        fecha,
        titulo,
        descripcion: texto,
        estado: "enviada",
        origen: "parte_trabajo_ocr",
        accion: "envio_siec_simulado",
        usuario_id: usuario.id,
        usuario_nombre: usuario.profile?.nombre || usuario.email || null,
        usuario_email: usuario.email || usuario.profile?.email || null,
        usuario_rol: usuario.profile?.rol || null,
        enviado_en: now,
      };
    });

    const historial = await supabase.from("siec_history" as any).insert(historialPayload);
    if (historial.error) {
      if (isMissingColumnError(historial.error)) {
        const payloadSinTitulo = historialPayload.map(({ titulo: _titulo, ...row }) => row);
        const fallbackHistorial = await supabase.from("siec_history" as any).insert(payloadSinTitulo);
        if (fallbackHistorial.error) {
          logger.warn("Simulated SIEC history fallback failed", {
            code: fallbackHistorial.error.code,
          });
        }
      } else {
        logger.warn("Simulated SIEC history registration failed", {
          code: historial.error.code,
        });
      }
    }

    const parteIds = Array.from(new Set(seleccionadas.map((inc: any) => inc.parte_id).filter(Boolean)));
    if (parteIds.length > 0) {
      const { data: incidenciasPartes, error: partesIncidenciasError } = await supabase
        .from("incidencias")
        .select("id,parte_id,estado,crear_en_siec")
        .in("parte_id", parteIds);

      if (!partesIncidenciasError) {
        const partesEnviadas = parteIds.filter((parteId) => {
          const activas = (incidenciasPartes || []).filter(
            (inc: any) => inc.parte_id === parteId && inc.crear_en_siec !== false
          );
          return activas.length > 0 && activas.every((inc: any) => inc.estado === ESTADO_INCIDENCIA_ENVIADA);
        });

        if (partesEnviadas.length > 0) {
          const { error: partesUpdateError } = await supabase
            .from("partes")
            .update({ estado: ESTADO_PARTE_ENVIADO } as any)
            .in("id", partesEnviadas);
          if (partesUpdateError) {
            logger.warn("Sent part status update failed", {
              code: partesUpdateError.code,
            });
          }
        }
      } else {
        logger.warn("Final part status check failed", {
          code: partesIncidenciasError.code,
        });
      }
    }

    const enviados = seleccionadas.map((inc: any) => ({
      id: inc.id,
      titulo: getTituloIncidenciaRow(inc),
      estado: ESTADO_INCIDENCIA_ENVIADA,
      fechaEnvioSimulado: now,
    }));

    console.info("Envío simulado a SIEC completado:", {
      loteId,
      total: enviados.length,
      incidencias: enviados,
    });

    return {
      ok: true,
      modo: "simulado",
      total: enviados.length,
      enviados,
    };
  },

  async listarHistorial(): Promise<RegistroHistorialSIEC[]> {
    assertSupabase();
    const { data, error } = await supabase
      .from("siec_history" as any)
      .select("*")
      .order("enviado_en", { ascending: false });
    if (error) throw error;

    return ((data || []) as any[]).map((row) => ({
      id: row.id,
      loteId: row.lote_id,
      lote_id: row.lote_id,
      parteId: row.parte_id,
      parteTitulo: row.parte_titulo,
      centro: row.centro,
      fecha: row.fecha,
      titulo: row.titulo || generarTituloFallback(row.descripcion || ""),
      texto: row.descripcion,
      descripcion: row.descripcion,
      estado: row.estado,
      origen: row.origen,
      enviadoEn: row.enviado_en,
      accion: row.accion,
      usuarioId: row.usuario_id,
      usuarioNombre: row.usuario_nombre,
      usuarioEmail: row.usuario_email,
      usuarioRol: row.usuario_rol,
    }));
  },

  async getDashboardData() {
    assertSupabase();

    const [partesResult, incidenciasResult] = await Promise.all([
      supabase
        .from("partes")
        .select("*, centros(nombre)")
        .order("fecha_visita", { ascending: false }),
      supabase
        .from("incidencias")
        .select("*")
        .order("orden_linea", { ascending: true }),
    ]);

    if (partesResult.error) {
      throwSupabaseError("No se pudieron cargar los partes del Dashboard", partesResult.error);
    }

    if (incidenciasResult.error) {
      throwSupabaseError("No se pudieron cargar las incidencias del Dashboard", incidenciasResult.error);
    }

    const partes: DashboardParteRow[] = ((partesResult.data || []) as any[]).map((parte) => {
      const centro = Array.isArray(parte.centros) ? parte.centros[0] : parte.centros;
      return {
        id: parte.id,
        titulo: parte.codigo || getParteTitulo(centro?.nombre || "Centro sin indicar", parte.fecha_visita || ""),
        centro: centro?.nombre || "Centro sin indicar",
        fecha: parte.fecha_visita || "",
        estado: parte.estado || "",
        numIncidencias: parte.num_incidencias || 0,
        creadoEn: parte.created_at || parte.fecha_visita || "",
        actualizadoEn: parte.updated_at || parte.fecha_visita || "",
      };
    });

    const incidencias: DashboardIncidenciaRow[] = ((incidenciasResult.data || []) as any[]).map((inc) => ({
      id: inc.id,
      parteId: inc.parte_id,
      titulo: getTituloIncidenciaRow(inc),
      texto: getTextoIncidenciaRow(inc),
      estado: inc.estado || "",
      crearEnSIEC: inc.crear_en_siec !== false,
      motivoExclusion: inc.motivo_exclusion || "",
      ordenLinea: inc.orden_linea,
      creadoEn: inc.created_at || "",
      actualizadoEn: inc.updated_at || "",
    }));

    if (import.meta.env.DEV) {
      console.info("Dashboard partes:", partes.length);
      console.info("Dashboard incidencias:", incidencias.length);
    }

    return { partes, incidencias };
  },

  async getAppConfig(): Promise<AppConfig> {
    assertSupabase();
    const { data, error } = await supabase
      .from("app_config" as any)
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    if (error) throw error;
    if (!data) return DEFAULT_CONFIG;

    const row = data as any;
    return {
      nombreEmpresa: row.nombre_empresa || "",
      entorno: row.entorno === "produccion" ? "produccion" : "pruebas",
      modoSiec:
        row.modo_siec === "manual" || row.modo_siec === "api_futura"
          ? row.modo_siec
          : "simulado",
      emailResponsable: row.email_responsable || "",
    };
  },

  async saveAppConfig(config: AppConfig) {
    assertSupabase();
    assertLength(config.nombreEmpresa, 160, "Nombre de empresa");
    if (config.emailResponsable) assertLength(config.emailResponsable, MAX_EMAIL_LENGTH, "Email responsable");
    const { error } = await supabase.from("app_config" as any).upsert({
      id: "global",
      nombre_empresa: config.nombreEmpresa,
      entorno: config.entorno,
      modo_siec: config.modoSiec,
      email_responsable: config.emailResponsable || null,
      actualizado_en: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async resetOperationalTestingData() {
    assertSupabase();
    const { error } = await supabase.rpc("reset_operational_testing_data" as any);
    if (error) throw error;
  },
};
