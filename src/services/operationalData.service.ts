import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Usuario } from "@/types";

export type IncidenciaParte = {
  id: string;
  texto: string;
  incluirEnSIEC: boolean;
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
  enviadoEn?: string;
};

export type IncidenciaColaSIEC = {
  id: string;
  parteId: string;
  parteTitulo: string;
  centro: string;
  fecha: string;
  texto: string;
  descripcion: string;
  estado: "pendiente_siec" | "gestionado";
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
  texto: string;
  incluirEnSIEC: boolean;
};

export type UsuarioAuditoria = {
  id?: string;
  email?: string;
  profile?: Usuario | null;
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
  "revisado",
  "pendiente_siec",
  "preparado_siec",
  "enviado_a_siguiente_paso",
  "enviado_siec",
  "gestionado",
  "eliminado",
]);

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
  const enriched = new Error(`${context}: ${error.message || "Error desconocido de Supabase."}`) as Error &
    SupabaseErrorLike;
  enriched.code = error.code;
  enriched.details = error.details;
  enriched.hint = error.hint;
  throw enriched;
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
  return `Parte ${centro} - ${fecha}`;
}

async function insertarParteOcr(input: {
  centroId: string;
  centroNombre: string;
  fecha: string;
  tecnicoId: string;
  titulo: string;
  totalIncidencias: number;
}) {
  const basePayload = {
    codigo: crearCodigo(),
    fecha_visita: input.fecha,
    centro_id: input.centroId,
    tecnico_id: input.tecnicoId,
    estado: "revisado",
    num_incidencias: input.totalIncidencias,
  };

  const enrichedPayload = {
    ...basePayload,
    titulo: input.titulo,
    centro_nombre: input.centroNombre,
    origen: "OCR/Gemini",
  };

  const enrichedResult = await supabase
    .from("partes")
    .insert(enrichedPayload as any)
    .select("id")
    .single();

  if (!enrichedResult.error) return enrichedResult.data;
  if (!isMissingColumnError(enrichedResult.error)) {
    throwSupabaseError("No se pudo insertar el parte OCR en public.partes", enrichedResult.error);
  }

  const baseResult = await supabase
    .from("partes")
    .insert(basePayload)
    .select("id")
    .single();

  if (baseResult.error) {
    throwSupabaseError("No se pudo insertar el parte OCR en public.partes", baseResult.error);
  }

  return baseResult.data;
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

  console.warn("No se pudo registrar auditoría de creación OCR:", enrichedResult.error);
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
  const centro = row.centro_nombre || row.centros?.nombre || "Centro sin indicar";
  const fecha = row.fecha_visita || "";

  return {
    id: row.id,
    titulo: row.titulo || getParteTitulo(centro, fecha),
    centro,
    fecha,
    origen: row.origen || "OCR/Gemini",
    estado: row.estado || "revisado",
    creadoEn: row.creado_en || row.fecha_visita || new Date().toISOString(),
    enviadoEn: row.enviado_en || undefined,
    incidencias: incidencias
      .slice()
      .sort((a, b) => (a.linea ?? 0) - (b.linea ?? 0))
      .map((inc) => ({
        id: inc.id,
        texto: inc.texto_corregido || inc.descripcion || inc.texto_ocr || "",
        incluirEnSIEC: inc.crear_en_siec !== false,
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
      .map((inc) => ({
        texto: normalizarTexto(inc.texto),
        incluirEnSIEC: inc.incluirEnSIEC,
      }))
      .filter((inc) => inc.texto);

    incidencias.forEach((inc) => assertLength(inc.texto, MAX_INCIDENCIA_LENGTH, "Incidencia"));
    if (incidencias.length === 0) throw new Error("El parte debe tener al menos una incidencia.");

    const parte = await insertarParteOcr({
      centroId: centro.id,
      centroNombre: centro.nombre,
      fecha,
      tecnicoId: input.tecnicoId,
      titulo,
      totalIncidencias: incidencias.length,
    });

    const registros = incidencias.map((inc, index) => ({
      parte_id: parte.id,
      linea: index + 1,
      texto_ocr: inc.texto,
      texto_corregido: inc.texto,
      tema: "",
      descripcion: inc.texto,
      categoria: "",
      grupo: "",
      crear_en_siec: inc.incluirEnSIEC,
      estado: "revisado",
    }));

    const { error: incidenciasError } = await supabase.from("incidencias").insert(registros);
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

    if (!includeDeleted) {
      query = query.is("eliminado_en" as any, null);
    }

    const { data, error } = await query.order("creado_en", { ascending: false } as any);
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
    assertSupabase();
    const { data: partes, error } = await supabase
      .from("partes")
      .select("*, centros(nombre)")
      .not("eliminado_en" as any, "is", null)
      .order("eliminado_en", { ascending: false } as any);

    if (error) {
      if (isMissingColumnError(error)) return [];
      throwSupabaseError("No se pudo cargar la papelera de partes", error);
    }
    if (!partes?.length) return [];

    const parteIds = partes.map((parte: any) => parte.id);
    const { data: incidencias, error: incError } = await supabase
      .from("incidencias")
      .select("*")
      .in("parte_id", parteIds);

    if (incError) {
      throwSupabaseError("No se pudieron cargar las incidencias de la papelera", incError);
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

    const patch: Record<string, unknown> = {};
    if (typeof cambios.titulo === "string") patch.titulo = cambios.titulo.trim();
    if (typeof patch.titulo === "string") assertLength(patch.titulo, MAX_TITULO_LENGTH, "Título");
    if (typeof cambios.fecha === "string") patch.fecha_visita = assertFechaValida(cambios.fecha);
    if (typeof cambios.centro === "string") {
      const centro = await ensureCentro(cambios.centro);
      patch.centro_id = centro.id;
      patch.centro_nombre = centro.nombre;
    }

    const { error } = await supabase.from("partes").update(patch as any).eq("id", parteId);
    if (error) throw error;
  },

  async actualizarIncidencia(incidenciaId: string, cambios: Partial<IncidenciaParte>) {
    assertSupabase();
    const patch: Record<string, unknown> = {};

    if (typeof cambios.texto === "string") {
      const texto = normalizarTexto(cambios.texto);
      if (!texto) throw new Error("La incidencia no puede quedar vacía.");
      assertLength(texto, MAX_INCIDENCIA_LENGTH, "Incidencia");
      patch.texto_corregido = texto;
      patch.descripcion = texto;
    }
    if (typeof cambios.incluirEnSIEC === "boolean") patch.crear_en_siec = cambios.incluirEnSIEC;

    const { error } = await supabase.from("incidencias").update(patch as any).eq("id", incidenciaId);
    if (error) throw error;
  },

  async moverParteAPapelera(parteId: string) {
    assertSupabase();
    const { error } = await supabase
      .from("partes")
      .update({ estado: "eliminado", eliminado_en: new Date().toISOString() } as any)
      .eq("id", parteId);
    if (error) throw error;
  },

  async vaciarListado() {
    assertSupabase();
    const { error } = await supabase
      .from("partes")
      .update({ estado: "eliminado", eliminado_en: new Date().toISOString() } as any)
      .is("eliminado_en" as any, null);
    if (error) throw error;
  },

  async recuperarPapelera() {
    assertSupabase();
    const { error } = await supabase
      .from("partes")
      .update({ estado: "revisado", eliminado_en: null } as any)
      .not("eliminado_en" as any, "is", null);
    if (error) throw error;
  },

  async enviarParteACola(parte: ParteOperativo) {
    assertSupabase();
    const ids = parte.incidencias
      .filter((inc) => inc.incluirEnSIEC && inc.texto.trim())
      .map((inc) => inc.id);

    if (ids.length === 0) return 0;

    const { error: incError } = await supabase
      .from("incidencias")
      .update({ estado: "pendiente_siec" } as any)
      .in("id", ids);
    if (incError) throw incError;

    const nuevoEstado = "enviado_a_siguiente_paso";
    if (!ESTADOS_PARTE.has(nuevoEstado)) throw new Error("Estado de parte no permitido.");

    const { error: parteError } = await supabase
      .from("partes")
      .update({
        estado: nuevoEstado,
        enviado_en: new Date().toISOString(),
      } as any)
      .eq("id", parte.id);
    if (parteError) throw parteError;

    return ids.length;
  },

  async listarCola(): Promise<IncidenciaColaSIEC[]> {
    assertSupabase();
    const { data: incidencias, error } = await supabase
      .from("incidencias")
      .select("*")
      .eq("estado", "pendiente_siec")
      .order("linea", { ascending: true });

    if (error) throw error;
    if (!incidencias?.length) return [];

    const parteIds = Array.from(new Set(incidencias.map((inc: any) => inc.parte_id)));
    const { data: partes, error: partesError } = await supabase
      .from("partes")
      .select("id,titulo,fecha_visita,centro_nombre,origen,creado_en,centros(nombre)")
      .in("id", parteIds);
    if (partesError) throw partesError;

    const partesById = new Map((partes || []).map((parte: any) => [parte.id, parte]));

    return incidencias.map((inc: any) => {
      const parte: any = partesById.get(inc.parte_id);
      const centro = parte?.centro_nombre || parte?.centros?.nombre || "Centro sin indicar";
      const fecha = parte?.fecha_visita || "";
      const texto = inc.texto_corregido || inc.descripcion || inc.texto_ocr || "";

      return {
        id: inc.id,
        parteId: inc.parte_id,
        parteTitulo: parte?.titulo || getParteTitulo(centro, fecha),
        centro,
        fecha,
        texto,
        descripcion: texto,
        estado: "pendiente_siec",
        origen: parte?.origen || "parte_trabajo_ocr",
        creadoEn: parte?.creado_en || new Date().toISOString(),
      };
    });
  },

  async enviarIncidenciasASiec(incidenciaIds: string[], usuario: UsuarioAuditoria) {
    assertSupabase();
    if (incidenciaIds.length === 0) return;
    if (!usuario.id) throw new Error("No hay usuario autenticado.");
    if (usuario.email) assertLength(usuario.email, MAX_EMAIL_LENGTH, "Email");

    const { error } = await supabase.rpc("gestionar_incidencias_siec" as any, {
      incidencia_ids: incidenciaIds,
    });
    if (error) throw error;
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
    const [partes, cola, historial] = await Promise.all([
      this.listarPartes(false),
      this.listarCola(),
      this.listarHistorial(),
    ]);

    return { partes, cola, historial };
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
