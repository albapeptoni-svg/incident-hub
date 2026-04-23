import { FileScan, CheckCheck, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/utils";
import { Incidencia } from "@/types";

interface RevisionStatsProps {
  items: Incidencia[];
  seleccionadas: number;
}

export function RevisionStats({ items, seleccionadas }: RevisionStatsProps) {
  const stats = [
    { label: "Total", value: items.length, icon: FileScan, color: "text-foreground bg-muted" },
    { label: "Listas", value: items.filter((i) => i.estado === "aprobada").length, icon: CheckCheck, color: "text-success bg-success/10" },
    { label: "En revisión", value: items.filter((i) => ["corregida", "pendiente"].includes(i.estado)).length, icon: AlertTriangle, color: "text-warning bg-warning/10" },
    { label: "A enviar SIEC", value: seleccionadas, icon: Send, color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="surface-card mb-4 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", s.color)}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-display text-lg font-bold leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
