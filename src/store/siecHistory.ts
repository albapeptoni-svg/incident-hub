import { Incidencia } from "@/types";

type SiecHistoryItem = {
  hash: string;
  incidenciaId: string;
  fecha: string;
};

let sessionHistory: SiecHistoryItem[] = [];

function normalizar(texto?: string) {
  return (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function buildIncidenciaHash(incidencia: Incidencia) {
  return [
    normalizar(incidencia.textoCorregido),
    normalizar(incidencia.descripcion),
    normalizar(incidencia.tema),
    normalizar(incidencia.categoria),
    normalizar(incidencia.grupo),
  ].join("|");
}

export function getSiecHistory(): SiecHistoryItem[] {
  return sessionHistory;
}

/**
 * 🔒 IDEMPOTENTE:
 * Solo guarda incidencias nuevas (no duplica histórico)
 */
export function addToSiecHistory(incidencias: Incidencia[]) {
  const current = getSiecHistory();

  const existentes = new Set(current.map((item) => item.hash));

  const nuevos = incidencias
    .map((incidencia) => ({
      hash: buildIncidenciaHash(incidencia),
      incidenciaId: incidencia.id,
      fecha: new Date().toISOString(),
    }))
    .filter((item) => !existentes.has(item.hash)); // 🔴 evita duplicados

  if (nuevos.length === 0) return;

  sessionHistory = [...nuevos, ...current];
}

/**
 * ⚠️ Detecta duplicados contra histórico
 */
export function detectHistoricalDuplicateWarnings(incidencias: Incidencia[]) {
  const history = getSiecHistory();
  const warnings: string[] = [];

  incidencias.forEach((incidencia) => {
    const hash = buildIncidenciaHash(incidencia);
    const match = history.find((item) => item.hash === hash);

    if (match) {
      warnings.push(
        `Posible duplicado histórico: ${incidencia.id} coincide con ${match.incidenciaId}, registrado el ${match.fecha}.`
      );
    }
  });

  return warnings;
}
