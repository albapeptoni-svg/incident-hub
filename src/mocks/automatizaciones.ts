import { Automatizacion } from "@/types";

export const automatizaciones: Automatizacion[] = [
  {
    id: "auto-001",
    codigo: "SIEC-2026-001",
    fechaCreacion: "2026-04-25T08:45:00Z",
    fechaEnvio: "2026-04-25T09:00:00Z",
    estado: "completado",
    incidenciasIds: ["inc-002", "inc-004"],
    usuarioId: "mock-admin-id",
    logs: "Lote enviado correctamente en modo preview.",
  },
  {
    id: "auto-002",
    codigo: "SIEC-2026-002",
    fechaCreacion: "2026-04-25T10:15:00Z",
    estado: "en_proceso",
    incidenciasIds: ["inc-001"],
    usuarioId: "tecnico-ana",
    logs: "Procesando lote de demostracion.",
  },
];
