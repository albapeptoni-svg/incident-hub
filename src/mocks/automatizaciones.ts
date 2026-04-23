import { Automatizacion } from "@/types";

export const automatizaciones: Automatizacion[] = [
  { id: "aut-1", codigo: "LOTE-2025-0042", fechaCreacion: "2025-04-22 14:30", estado: "completado", incidenciasIds: ["i-001", "i-002"], usuarioId: "u-1" },
  { id: "aut-2", codigo: "LOTE-2025-0041", fechaCreacion: "2025-04-22 11:05", estado: "en_proceso", incidenciasIds: ["i-008"], usuarioId: "u-2" },
  { id: "aut-3", codigo: "LOTE-2025-0040", fechaCreacion: "2025-04-22 09:48", estado: "error", incidenciasIds: ["i-003"], usuarioId: "u-3", logs: "Error inesperado en el servidor SIEC" },
];
