export type IncidenciaEstado =
  | "pendiente"
  | "revision"
  | "lista"
  | "excluida"
  | "enviada"
  | "confirmada"
  | "error";

export type ParteEstado = "pendiente" | "revision" | "procesado" | "enviado" | "error";

export type LoteEstado = "pendiente" | "en_proceso" | "enviado" | "confirmado" | "error";

export interface Incidencia {
  id: string;
  parteId: string;
  linea: number;
  textoOcr: string;
  textoCorregido: string;
  tema: string;
  descripcion: string;
  categoria: string;
  grupo: string;
  crearEnSiec: boolean;
  motivoExclusion?: string;
  estado: IncidenciaEstado;
}

export interface Parte {
  id: string;
  codigo: string;
  fecha: string;
  centro: string;
  tecnico: string;
  estado: ParteEstado;
  numIncidencias: number;
  notas?: string;
}

export interface Lote {
  id: string;
  codigo: string;
  fecha: string;
  parteCodigo: string;
  numIncidencias: number;
  estado: LoteEstado;
  responsable: string;
  duracion?: string;
}

export interface ActividadItem {
  id: string;
  tipo: "envio" | "edicion" | "error" | "creacion" | "login";
  texto: string;
  usuario: string;
  hora: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "user";
  centro: string;
  activo: boolean;
  ultimoAcceso: string;
}
