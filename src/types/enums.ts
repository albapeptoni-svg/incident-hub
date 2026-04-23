export type EstadoParte =
  | "borrador"
  | "procesado"
  | "en_revision"
  | "aprobado"
  | "listo_para_enviar"
  | "enviado"
  | "completado"
  | "error";

export type EstadoIncidencia =
  | "pendiente"
  | "corregida"
  | "aprobada"
  | "descartada"
  | "enviada"
  | "confirmada"
  | "error"
  | "reenviada";

export type EstadoAutomatizacion =
  | "pendiente"
  | "en_cola"
  | "en_proceso"
  | "completado"
  | "error"
  | "reintentado";
