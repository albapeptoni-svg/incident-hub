import { Incidencia } from "@/types";
import { SiecBatch } from "@/types/siec";
import { validateIncidencia } from "@/store/siecValidation";
import { buildSiecPayload } from "@/store/siecPayload";

const STORAGE_KEY = "siec_batches";

export function getBatches(): SiecBatch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveBatches(batches: SiecBatch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  window.dispatchEvent(new Event("siec-batches-updated"));
}

export function addBatch(batch: SiecBatch) {
  const batches = getBatches();
  saveBatches([batch, ...batches]);
}

export function updateBatch(batchId: string, patch: Partial<SiecBatch>) {
  const batches = getBatches();
  const updated = batches.map((batch) =>
    batch.id === batchId ? { ...batch, ...patch } : batch
  );

  saveBatches(updated);
}

export function simulateBatches(allIncidencias: Incidencia[]) {
  const batches = getBatches();

  const updated = batches.map((batch) => {
    const errores: string[] = [];

    const incidenciasDelLote = batch.incidenciasIds
      .map((id) => {
        const incidencia = allIncidencias.find((item) => item.id === id);

        if (!incidencia) {
          errores.push(`Incidencia ${id}: no encontrada`);
          return null;
        }

        const incidenciaErrores = validateIncidencia(incidencia);
        errores.push(...incidenciaErrores.map((error) => `Incidencia ${id}: ${error}`));

        return incidencia;
      })
      .filter((item): item is Incidencia => item !== null);

    return {
      ...batch,
      estado: errores.length > 0 ? "bloqueado" as const : "simulado_ok" as const,
      errores,
      payloadPreview: errores.length === 0 ? buildSiecPayload(incidenciasDelLote) : undefined,
    };
  });

  saveBatches(updated);
}