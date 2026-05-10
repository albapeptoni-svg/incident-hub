import { Incidencia } from "@/types";

export type SiecPayloadItem = {
  incidenciaId: string;
  asunto: string;
  descripcion: string;
  tema: string;
  categoria: string;
  grupo: string;
};

export function buildSiecPayload(incidencias: Incidencia[]): SiecPayloadItem[] {
  return incidencias.map((incidencia) => ({
    incidenciaId: incidencia.id,
    asunto: incidencia.titulo || incidencia.textoCorregido,
    descripcion: incidencia.descripcion,
    tema: incidencia.tema,
    categoria: incidencia.categoria,
    grupo: incidencia.grupo,
  }));
}
