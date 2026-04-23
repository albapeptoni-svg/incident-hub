import { Parte } from "@/types";

export const partes: Parte[] = [
  { id: "p-001", codigo: "PT-2025-00142", fecha: "2025-04-22", centroId: "c-1", tecnicoId: "u-1", estado: "en_revision", numIncidencias: 8 },
  { id: "p-002", codigo: "PT-2025-00141", fecha: "2025-04-22", centroId: "c-2", tecnicoId: "u-2", estado: "borrador", numIncidencias: 12 },
  { id: "p-003", codigo: "PT-2025-00140", fecha: "2025-04-21", centroId: "c-3", tecnicoId: "u-3", estado: "procesado", numIncidencias: 5 },
  { id: "p-004", codigo: "PT-2025-00139", fecha: "2025-04-21", centroId: "c-4", tecnicoId: "u-4", estado: "enviado", numIncidencias: 7 },
];
