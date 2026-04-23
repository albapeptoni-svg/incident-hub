import { Activity, Send, ClipboardCheck, AlertCircle, FileText, Sparkles, Zap } from "lucide-react";
import { cn } from "@/utils";
import { ActividadItem } from "@/types";

const tipoIcon = {
  envio: Send,
  edicion: ClipboardCheck,
  error: AlertCircle,
  creacion: FileText,
  login: Sparkles,
};

interface RecentActivityProps {
  actividad: ActividadItem[];
}

export function RecentActivity({ actividad }: RecentActivityProps) {
  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold">Actividad reciente</h3>
      </div>
      <div className="mt-4 space-y-4">
        {actividad.map((a) => {
          const Icon = tipoIcon[a.tipo as keyof typeof tipoIcon] ?? Activity;
          const color =
            a.tipo === "error" ? "text-destructive bg-destructive/10" :
            a.tipo === "envio" ? "text-primary bg-primary/10" :
            a.tipo === "edicion" ? "text-info bg-info/10" :
            a.tipo === "creacion" ? "text-success bg-success/10" :
            "text-muted-foreground bg-muted";
          return (
            <div key={a.id} className="flex gap-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1 pb-3 border-b border-border last:border-0">
                <p className="text-sm leading-snug">{a.texto}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.usuario} · {a.hora}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
