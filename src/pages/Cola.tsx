import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Code2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { getBatches, simulateBatches } from "@/store/siecStore";
import { SiecBatch } from "@/types/siec";
import { useIncidencias } from "@/hooks/use-data";

function getQueueStatusLabel(estado: string) {
  if (estado === "simulado_ok") return "Simulado OK";
  if (estado === "bloqueado") return "Bloqueado por validación";
  return "Pendiente de simulación";
}

export default function Cola() {
  const [lotes, setLotes] = useState<SiecBatch[]>(getBatches());
  const { data: incidencias = [] } = useIncidencias();

  const refreshBatches = () => {
    setLotes(getBatches());
  };

  useEffect(() => {
    refreshBatches();

    window.addEventListener("siec-batches-updated", refreshBatches);
    return () => {
      window.removeEventListener("siec-batches-updated", refreshBatches);
    };
  }, []);

  if (!lotes) {
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
            <Button variant="outline" size="sm" onClick={refreshBatches}>
              <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
            </Button>

            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                simulateBatches(incidencias);
                refreshBatches();
              }}
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Simular validación
            </Button>
          </>
        }
      />

      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Cola interna sin envío real.</p>
            <p>
              Estos lotes solo sirven para revisión y dry-run. El envío real a SIEC será irreversible y requerirá aprobación humana.
            </p>
          </div>
        </div>
      </div>

      {lotes.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">No hay lotes preparados.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ve a Revisión y pulsa “Preparar lote SIEC”.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lotes.map((l) => (
            <div key={l.id} className="surface-card p-5 hover:shadow-md">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{l.fechaCreacion}</p>
                  <p className="font-bold">{l.id}</p>
                </div>
                <StatusBadge estado={l.estado} label={getQueueStatusLabel(l.estado)} />
              </div>

              <div className="mt-3 text-sm">
                Incidencias: {l.incidenciasIds.length}
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Usuario: {l.creadoPor}
              </div>

              {l.errores && l.errores.length > 0 && (
                <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <p className="mb-2 font-semibold">Errores de validación:</p>
                  {l.errores.slice(0, 5).map((e, i) => (
                    <p key={i}>• {e}</p>
                  ))}
                </div>
              )}

              {l.warnings && l.warnings.length > 0 && (
                <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                  <p className="mb-2 font-semibold">Avisos / posibles duplicados:</p>
                  {l.warnings.slice(0, 5).map((warning, i) => (
                    <p key={i}>• {warning}</p>
                  ))}
                </div>
              )}

              {l.payloadPreview && l.payloadPreview.length > 0 && (
                <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5" />
                    Preview payload SIEC
                  </div>

                  <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-[11px] leading-relaxed">
                    {JSON.stringify(l.payloadPreview, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}