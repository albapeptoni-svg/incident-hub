import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFechaES(value?: string | null): string {
  if (!value) return "";

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const isoDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateTime) {
    const [, year, month, day] = isoDateTime;
    return `${day}/${month}/${year}`;
  }

  const slashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year.length === 2 ? `20${year}` : year}`;
  }

  return text;
}

export const formatDateEs = formatFechaES;
