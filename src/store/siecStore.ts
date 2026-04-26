import { SiecBatch } from "@/types/siec";

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