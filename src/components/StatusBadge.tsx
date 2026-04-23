import { cn } from "@/utils";
import type { EstadoIncidencia, EstadoAutomatizacion, EstadoParte } from "@/types";

type AnyEstado = EstadoIncidencia | EstadoAutomatizacion | EstadoParte | "exito" | "info";

interface StatusBadgeProps {
  estado: AnyEstado;
  className?: string;
  label?: string;
}

const config: Record<string, { label: string; classes: string; dot: string }> = {
  // Common
  pendiente:    { label: "Pendiente",       classes: "bg-warning/10 text-warning ring-warning/30",        dot: "bg-warning" },
  error:        { label: "Error",           classes: "bg-destructive/10 text-destructive ring-destructive/30", dot: "bg-destructive" },
  enviada:      { label: "Enviada",         classes: "bg-primary/10 text-primary ring-primary/30",         dot: "bg-primary" },
  enviado:      { label: "Enviado",         classes: "bg-primary/10 text-primary ring-primary/30",         dot: "bg-primary" },
  confirmada:   { label: "Confirmada",      classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  completado:   { label: "Completado",      classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  
  // Parte specific
  borrador:     { label: "Borrador",        classes: "bg-muted text-muted-foreground ring-border",         dot: "bg-neutral" },
  procesado:    { label: "Procesado",       classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  en_revision:  { label: "En revisión",     classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },
  aprobado:     { label: "Aprobado",        classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  listo_para_enviar: { label: "Listo para enviar", classes: "bg-primary/10 text-primary ring-primary/30", dot: "bg-primary" },
  
  // Incidencia specific
  corregida:    { label: "Corregida",       classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },
  aprobada:     { label: "Aprobada",        classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  descartada:   { label: "Descartada",      classes: "bg-muted text-muted-foreground ring-border",         dot: "bg-neutral" },
  reenviada:    { label: "Reenviada",       classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },

  // Automatizacion specific
  en_cola:      { label: "En cola",         classes: "bg-warning/10 text-warning ring-warning/30",        dot: "bg-warning" },
  en_proceso:   { label: "En proceso",      classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info animate-pulse-soft" },
  reintentado:  { label: "Reintentado",     classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },

  // Others
  exito:        { label: "Éxito",           classes: "bg-success/10 text-success ring-success/30",         dot: "bg-success" },
  info:         { label: "Info",            classes: "bg-info/10 text-info ring-info/30",                  dot: "bg-info" },
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
