import { Incidencia } from "@/types";
import { SiecBatch } from "@/types/siec";
import { detectDuplicateWarnings, validateIncidencia } from "@/store/siecValidation";
import { buildSiecPayload } from "@/store/siecPayload";
import {
  detectHistoricalDuplicateWarnings,
  addToSiecHistory,
} from "@/store/siecHistory";

const STORAGE_KEY = "siec_batches";
const MOCK_SEND_DELAY_MS = 1500;
const MOCK_ERROR_RATE = 0.2;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldSimulateSendError = () => Math.random() < MOCK_ERROR_RATE;

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

    const internalWarnings = detectDuplicateWarnings(incidenciasDelLote);
    const historicalWarnings = detectHistoricalDuplicateWarnings(incidenciasDelLote);
    const warnings = [...internalWarnings, ...historicalWarnings];

    const isOK = errores.length === 0;

    if (isOK) {
      addToSiecHistory(incidenciasDelLote);
    }

    return {
      ...batch,
      estado: isOK ? "simulado_ok" as const : "bloqueado" as const,
      errores,
      warnings,
      payloadPreview: isOK ? buildSiecPayload(incidenciasDelLote) : undefined,
    };
  });

  saveBatches(updated);
}

export function approveBatchForSend(batchId: string, userId = "mock-admin-id") {
  const batches = getBatches();

  const updated = batches.map((batch) => {
    const hasErrors = Boolean(batch.errores && batch.errores.length > 0);

    if (batch.id !== batchId) return batch;

    if (batch.estado !== "simulado_ok" || hasErrors) {
      return {
        ...batch,
        estado: "bloqueado" as const,
        errores: [
          ...(batch.errores ?? []),
          "No se puede aprobar para envío: el lote debe estar simulado OK y sin errores.",
        ],
      };
    }

    return {
      ...batch,
      estado: "aprobado_para_envio" as const,
      aprobadoPor: userId,
      fechaAprobacion: new Date().toISOString(),
    };
  });

  saveBatches(updated);
}

export function validateBatchBeforeSend(batchId: string) {
  const batches = getBatches();

  const updated = batches.map((batch) => {
    if (batch.id !== batchId) return batch;

    const erroresFinales: string[] = [];

    if (batch.estado !== "aprobado_para_envio") {
      erroresFinales.push("El lote debe estar aprobado manualmente antes del pre-envío.");
    }

    if (batch.errores && batch.errores.length > 0) {
      erroresFinales.push("El lote contiene errores de validación pendientes.");
    }

    if (!batch.payloadPreview || batch.payloadPreview.length === 0) {
      erroresFinales.push("El lote no tiene payload SIEC generado.");
    }

    if (!batch.incidenciasIds || batch.incidenciasIds.length === 0) {
      erroresFinales.push("El lote no contiene incidencias.");
    }

    if (erroresFinales.length > 0) {
      return {
        ...batch,
        estado: "bloqueado" as const,
        errores: [...(batch.errores ?? []), ...erroresFinales],
      };
    }

    return {
      ...batch,
      estado: "listo_para_envio" as const,
      fechaPreEnvioOk: new Date().toISOString(),
    };
  });

  saveBatches(updated);
}

export async function sendBatchSimulated(batchId: string) {
  const batch = getBatches().find((item) => item.id === batchId);

  if (!batch) {
    return;
  }

  if (batch.estado !== "listo_para_envio") {
    updateBatch(batchId, {
      estado: "error_envio_simulado",
      errores: [
        ...(batch.errores ?? []),
        "No se puede simular el envío: el lote debe estar en estado listo_para_envio.",
      ],
      respuestaSimulada: "ERROR_SIMULADO: lote no preparado para envío.",
    });
    return;
  }

  if (!batch.payloadPreview || batch.payloadPreview.length === 0) {
    updateBatch(batchId, {
      estado: "error_envio_simulado",
      errores: [
        ...(batch.errores ?? []),
        "No se puede simular el envío: falta payloadPreview.",
      ],
      respuestaSimulada: "ERROR_SIMULADO: payload vacío.",
    });
    return;
  }

  updateBatch(batchId, {
    estado: "enviando_simulado",
    respuestaSimulada: "ENVIANDO_SIMULADO: enviando lote al mock de SIEC...",
  });

  await wait(MOCK_SEND_DELAY_MS);

  const latestBatch = getBatches().find((item) => item.id === batchId);

  if (!latestBatch || latestBatch.estado !== "enviando_simulado") {
    return;
  }

  if (shouldSimulateSendError()) {
    updateBatch(batchId, {
      estado: "error_envio_simulado",
      errores: [
        ...(latestBatch.errores ?? []),
        "Error simulado de comunicación con SIEC mock.",
      ],
      respuestaSimulada: "ERROR_SIMULADO: fallo temporal de comunicación con SIEC mock.",
    });
    return;
  }

  updateBatch(batchId, {
    estado: "enviado_simulado",
    fechaEnvioSimulado: new Date().toISOString(),
    respuestaSimulada: `OK_SIMULADO: ${latestBatch.payloadPreview?.length ?? 0} incidencia(s) aceptadas por SIEC mock.`,
  });
}