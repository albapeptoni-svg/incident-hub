import { cn } from "@/lib/utils";
import type { IncidenciaEstado, LoteEstado, ParteEstado } from "@/lib/types";

type AnyEstado = IncidenciaEstado | LoteEstado | ParteEstado | "exito" | "info";

interface StatusBadgeProps {
  estado: AnyEstado;
  className?: string;
  label?: string;
}

const config: Record<string, { label: string; classes: string; dot: string }> = {
  pendiente:   { label: "Pendiente",     classes: "bg-warning/10 text-warning ring-warning/30",        dot: "bg-warning" },
  revision:    { label: "En revisión",   classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },
  lista:       { label: "Lista",         classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  excluida:    { label: "Excluida",      classes: "bg-muted text-muted-foreground ring-border",         dot: "bg-neutral" },
  enviada:     { label: "Enviada",       classes: "bg-primary/10 text-primary ring-primary/30",         dot: "bg-primary" },
  confirmada:  { label: "Confirmada",    classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  error:       { label: "Error",         classes: "bg-destructive/10 text-destructive ring-destructive/30", dot: "bg-destructive" },
  procesado:   { label: "Procesado",     classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  enviado:     { label: "Enviado",       classes: "bg-primary/10 text-primary ring-primary/30",         dot: "bg-primary" },
  en_proceso:  { label: "En proceso",    classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info animate-pulse-soft" },
  exito:       { label: "Éxito",         classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  info:        { label: "Info",          classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },
};

export function StatusBadge({ estado, className, label }: StatusBadgeProps) {
  const c = config[estado] ?? config.info;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
      c.classes,
      className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {label ?? c.label}
    </span>
  );
}
