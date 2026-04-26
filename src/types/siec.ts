import { SiecPayloadItem } from "@/store/siecPayload";

export type SiecBatch = {
  id: string;
  incidenciasIds: string[];

  estado:
    | "pendiente"
    | "simulado_ok"
    | "bloqueado"
    | "aprobado_para_envio"
    | "listo_para_envio"
    | "enviando_simulado"
    | "enviado_simulado"
    | "error_envio_simulado";

  creadoPor: string;
  fechaCreacion: string;

  errores?: string[];
  warnings?: string[];

  payloadPreview?: SiecPayloadItem[];

  aprobadoPor?: string;
  fechaAprobacion?: string;
  fechaPreEnvioOk?: string;

  fechaEnvioSimulado?: string;
  respuestaSimulada?: string;
};