import { Incidencia } from "@/types";

export function validateSiecIncidencias(incidencias: Incidencia[]) {
  const errores: string[] = [];

  incidencias.forEach((incidencia) => {
    if (!incidencia.textoCorregido?.trim()) {
      errores.push(`Incidencia ${incidencia.id}: falta texto corregido.`);
    }

    if (!incidencia.descripcion?.trim()) {
      errores.push(`Incidencia ${incidencia.id}: falta descripción.`);
    }

    if (!incidencia.tema?.trim()) {
      errores.push(`Incidencia ${incidencia.id}: falta tema.`);
    }

    if (!incidencia.categoria?.trim()) {
      errores.push(`Incidencia ${incidencia.id}: falta categoría.`);
    }

    if (!incidencia.grupo?.trim()) {
      errores.push(`Incidencia ${incidencia.id}: falta grupo.`);
    }

    if (incidencia.textoCorregido && incidencia.textoCorregido.length > 250) {
      errores.push(`Incidencia ${incidencia.id}: texto corregido demasiado largo.`);
    }

    if (incidencia.estado !== "aprobada") {
      errores.push(`Incidencia ${incidencia.id}: no está aprobada.`);
    }
  });

  return {
    ok: errores.length === 0,
    errores,
  };
}