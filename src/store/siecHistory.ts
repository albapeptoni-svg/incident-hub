import { Incidencia } from "@/types";

const STORAGE_KEY = "siec_history";

type SiecHistoryItem = {
  hash: string;
  incidenciaId: string;
  fecha: string;
};

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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
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

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...nuevos, ...current])
  );
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