import { EstadoAutomatizacion } from "./enums";

export interface Centro {
  id: string;
  nombre: string;
  codigo: string;
  direccion?: string;
  ciudad: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "tecnico" | "visor";
  centroId?: string;
  activo: boolean;
  ultimoAcceso?: string;
  avatarUrl?: string;
}

export interface Automatizacion {
  id: string;
  codigo: string;
  fechaCreacion: string;
  fechaEnvio?: string;
  estado: EstadoAutomatizacion;
  incidenciasIds: string[];
  usuarioId: string;
  logs?: string;
}

export interface Foto {
  id: string;
  parteId?: string;
  incidenciaId?: string;
  url: string;
  descripcion?: string;
  fechaCreacion?: string;
}

export interface ActividadItem {
  id: string;
  tipo: "envio" | "edicion" | "error" | "creacion" | "login";
  texto: string;
  usuario: string;
  hora: string;
}
