export type SiecBatch = {
  id: string;
  incidenciasIds: string[];
  estado: "pendiente" | "simulado_ok" | "bloqueado";
  creadoPor: string;
  fechaCreacion: string;
  errores?: string[];
};