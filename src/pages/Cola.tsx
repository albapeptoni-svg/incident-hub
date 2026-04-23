import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { useAutomatizaciones } from "@/hooks/use-data";

export default function Cola() {
  const { data: lotes = [], isLoading } = useAutomatizaciones();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Automatización"
        title="Cola SIEC"
        subtitle="Lotes en proceso de envío e integración con la plataforma SIEC."
        actions={
          <>
            <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Actualizar</Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground"><Send className="mr-2 h-4 w-4" /> Procesar cola</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lotes.map((l: any) => (
          <div key={l.id} className="surface-card p-5 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{l.fechaCreacion}</p>
                <p className="font-display text-base font-bold mt-0.5">{l.codigo}</p>
              </div>
              <StatusBadge estado={l.estado} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Parte</p>
                <p className="font-mono text-xs font-semibold">{l.parteCodigo}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Incidencias</p>
                <p className="font-display text-base font-bold">{l.numIncidencias}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{l.responsable}</span>
              {l.duracion ? <span>⏱ {l.duracion}</span> : (
                l.estado === "en_proceso" && (
                  <span className="inline-flex items-center gap-1 text-info">
                    <Loader2 className="h-3 w-3 animate-spin" /> procesando...
                  </span>
                )
              )}
            </div>

            {/* Progreso visual mock */}
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  "h-full rounded-full " +
                  (l.estado === "completado" ? "bg-success w-full" :
                    l.estado === "enviado" ? "bg-primary w-4/5" :
                    l.estado === "en_proceso" ? "bg-info w-1/2 animate-pulse-soft" :
                    l.estado === "error" ? "bg-destructive w-1/3" :
                    "bg-warning w-1/4")
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
