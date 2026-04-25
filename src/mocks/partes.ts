import { Parte } from "@/types";

export const partes: Parte[] = [
  {
    id: "parte-001",
    codigo: "PAR-2026-001",
    fecha: "2026-04-25",
    centroId: "centro-norte",
    tecnicoId: "mock-admin-id",
    estado: "en_revision",
    numIncidencias: 3,
    notas: "Parte de demostracion para modo preview.",
  },
  {
    id: "parte-002",
    codigo: "PAR-2026-002",
    fecha: "2026-04-24",
    centroId: "centro-sur",
    tecnicoId: "tecnico-ana",
    estado: "borrador",
    numIncidencias: 1,
  },
  {
    id: "parte-003",
    codigo: "PAR-2026-003",
    fecha: "2026-04-23",
    centroId: "centro-norte",
    tecnicoId: "tecnico-ana",
    estado: "listo_para_enviar",
    numIncidencias: 2,
  },
];
