import { Incidencia } from "@/types";

function normalizar(texto?: string) {
  return (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function validateIncidencia(i: Incidencia): string[] {
  const errores: string[] = [];

  if (!i.textoCorregido || i.textoCorregido.trim() === "") {
    errores.push("Texto corregido vacío");
  }

  if (!i.descripcion || i.descripcion.trim() === "") {
    errores.push("Descripción obligatoria");
  }

  if (!i.tema) {
    errores.push("Tema obligatorio");
  }

  if (!i.categoria) {
    errores.push("Categoría obligatoria");
  }

  if (!i.grupo) {
    errores.push("Grupo obligatorio");
  }

  if (!i.crearEnSiec) {
    errores.push("No marcada para SIEC");
  }

  if (i.estado !== "aprobada") {
    errores.push("No está aprobada");
  }

  return errores;
}

export function detectDuplicateWarnings(incidencias: Incidencia[]): string[] {
  const warnings: string[] = [];
  const vistos = new Map<string, string>();

  incidencias.forEach((incidencia) => {
    const clave = [
      normalizar(incidencia.textoCorregido),
      normalizar(incidencia.descripcion),
      normalizar(incidencia.tema),
      normalizar(incidencia.categoria),
    ].join("|");

    if (vistos.has(clave)) {
      warnings.push(
        `Posible duplicado interno: ${vistos.get(clave)} y ${incidencia.id} tienen texto, descripción, tema y categoría iguales.`
      );
    } else {
      vistos.set(clave, incidencia.id);
    }
  });

  return warnings;
}