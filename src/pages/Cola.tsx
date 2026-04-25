import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useAutomatizaciones } from "@/hooks/use-data";

function getQueueStatusLabel(estado: string) {
  if (estado === "completado") return "Simulado OK";
  if (estado === "error") return "Bloqueado por validación";
  if (estado === "en_proceso") return "Simulación en curso";
  return "Pendiente de simulación";
}

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
        eyebrow="Simulación interna"
        title="Cola SIEC interna"
        subtitle="Lotes preparados para revisión y simulación. No hay envío real a SIEC desde esta pantalla."
        actions={
          <>
            <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Actualizar</Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground"><ShieldCheck className="mr-2 h-4 w-4" /> Simular validación</Button>
          </>
        }
      />

      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Cola interna sin envío real.</p>
            <p>Estos lotes solo sirven para revisión y dry-run. El envío real a SIEC será irreversible y requerirá aprobación humana explícita.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lotes.map((l: any) => (
          <div key={l.id} className="surface-card p-5 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{l.fechaCreacion}</p>
                <p className="font-display text-base font-bold mt-0.5">{l.codigo}</p>
              </div>
              <StatusBadge estado={l.estado} label={getQueueStatusLabel(l.estado)} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lote interno</p>
                <p className="font-mono text-xs font-semibold">{l.id}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Incidencias</p>
                <p className="font-display text-base font-bold">
                  {Array.isArray(l.incidenciasIds) ? l.incidenciasIds.length : l.numIncidencias ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Usuario: {l.usuarioId ?? l.responsable ?? "Sin asignar"}</span>
              {l.fechaEnvio ? <span>Simulado: {l.fechaEnvio}</span> : (
                l.estado === "en_proceso" && (
                  <span className="inline-flex items-center gap-1 text-info">
                    <Loader2 className="h-3 w-3 animate-spin" /> simulando...
                  </span>
                )
              )}
            </div>

            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  "h-full rounded-full " +
                  (l.estado === "completado" ? "bg-success w-full" :
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