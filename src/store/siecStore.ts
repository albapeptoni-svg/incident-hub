import { SiecBatch } from "@/types/siec";

let batches: SiecBatch[] = [];

export function getBatches(): SiecBatch[] {
  return batches;
}

export function addBatch(batch: SiecBatch) {
  batches = [batch, ...batches];
}