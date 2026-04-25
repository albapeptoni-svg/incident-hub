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

export function addBatch(batch: SiecBatch) {
  const batches = getBatches();
  const updated = [batch, ...batches];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("siec-batches-updated"));
}