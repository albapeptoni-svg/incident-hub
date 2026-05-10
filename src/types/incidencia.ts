import { EstadoIncidencia } from "./enums";

export interface IntentoIntegracion {
  id: string;
  incidenciaId: string;
  fecha: string;
  estado: "exito" | "error";
  mensaje?: string;
  payloadEnviado?: any;
  respuestaRecibida?: any;
}

export interface Incidencia {
  id: string;
  parteId: string;
  linea: number;
  titulo?: string;
  textoOcr: string;
  textoCorregido: string;
  tema: string;
  descripcion: string;
  categoria: string;
  grupo: string;
  crearEnSiec: boolean;
  motivoExclusion?: string;
  estado: EstadoIncidencia;
  intentos?: IntentoIntegracion[];
}
