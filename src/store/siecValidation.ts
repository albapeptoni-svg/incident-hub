import { Incidencia } from "@/types";

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