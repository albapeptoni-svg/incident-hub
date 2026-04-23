import { Automatizacion } from "@/types";

export interface AutomatizacionExtended extends Automatizacion {
  parteCodigo: string;
  responsable: string;
  numIncidencias: number;
  duracion?: string;
}

export const automatizaciones: AutomatizacionExtended[] = [
  { id: "aut-1", codigo: "LOTE-2025-0042", fechaCreacion: "2025-04-22 14:30", estado: "completado", incidenciasIds: ["i-001", "i-002"], usuarioId: "u-1", parteCodigo: "PT-2025-00142", responsable: "Marta Ribas", numIncidencias: 3, duracion: "1.2s" },
  { id: "aut-2", codigo: "LOTE-2025-0041", fechaCreacion: "2025-04-22 11:05", estado: "en_proceso", incidenciasIds: ["i-008"], usuarioId: "u-2", parteCodigo: "PT-2025-00141", responsable: "Jordi Vila", numIncidencias: 1 },
  { id: "aut-3", codigo: "LOTE-2025-0040", fechaCreacion: "2025-04-22 09:48", estado: "error", incidenciasIds: ["i-003"], usuarioId: "u-3", parteCodigo: "PT-2025-00140", responsable: "Lucía Hernández", numIncidencias: 5, logs: "Error inesperado en el servidor SIEC" },
];
