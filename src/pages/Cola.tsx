import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Code2, Loader2, RefreshCw, ShieldCheck, Send, History, Download } from "lucide-react";
import {
  approveBatchForSend,
  getBatches,
  sendBatchSimulated,
  simulateBatches,
  validateBatchBeforeSend,
} from "@/store/siecStore";
import { SiecBatch } from "@/types/siec";
import { useIncidencias } from "@/hooks/use-data";

function getQueueStatusLabel(estado: string) {
  if (estado === "simulado_ok") return "Simulado OK";
  if (estado === "bloqueado") return "Bloqueado por validación";
  if (estado === "aprobado_para_envio") return "Aprobado para envío";
  if (estado === "listo_para_envio") return "Listo para envío";
  if (estado === "enviando_simulado") return "Enviando simulado";
  if (estado === "enviado_simulado") return "Enviado simulado";
  if (estado === "error_envio_simulado") return "Error envío simulado";
  return "Pendiente de simulación";
}

function exportBatchToCSV(batch: SiecBatch) {
  if (!batch.payloadPreview || batch.payloadPreview.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const headers = Object.keys(batch.payloadPreview[0]);

  const rows = batch.payloadPreview.map((item) =>
    headers
      .map((header) => {
        const value = item[header as keyof typeof item] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(";")
  );

  const csvContent = [headers.join(";"), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lote_${batch.id}.csv`;
  link.click();

  URL.revokeObjectURL(url);
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

              <div className="mt-3 text-sm">Incidencias: {l.incidenciasIds.length}</div>

              <div className="mt-2 text-xs text-muted-foreground">
                Usuario: {l.creadoPor}
              </div>

              {l.aprobadoPor && (
                <div className="mt-2 text-xs text-success">
                  Aprobado por: {l.aprobadoPor}
                </div>
              )}

              {l.fechaPreEnvioOk && (
                <div className="mt-2 text-xs text-success">
                  Pre-envío validado: {l.fechaPreEnvioOk}
                </div>
              )}

              {l.fechaEnvioSimulado && (
                <div className="mt-2 text-xs text-success">
                  Envío simulado: {l.fechaEnvioSimulado}
                </div>
              )}

              {l.respuestaSimulada && (
                <div className="mt-3 rounded-md border border-info/30 bg-info/10 p-3 text-xs text-info">
                  {l.respuestaSimulada}
                </div>
              )}

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

              {l.logs && l.logs.length > 0 && (
                <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    Historial del lote
                  </div>

                  <div className="max-h-48 space-y-2 overflow-auto text-xs">
                    {l.logs.slice().reverse().map((log) => (
                      <div key={log.id} className="rounded-md border border-border bg-background p-2">
                        <div className="flex justify-between gap-3 text-[10px] text-muted-foreground">
                          <span>{new Date(log.fecha).toLocaleString()}</span>
                          <span className="uppercase">{log.tipo}</span>
                        </div>
                        <div className="mt-1">{log.mensaje}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {l.payloadPreview && l.payloadPreview.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => exportBatchToCSV(l)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              )}

              {l.estado === "simulado_ok" && (
                <Button
                  className="mt-4 w-full bg-success text-white"
                  onClick={() => {
                    approveBatchForSend(l.id);
                    refreshBatches();
                  }}
                >
                  Aprobar para envío
                </Button>
              )}

              {l.estado === "aprobado_para_envio" && (
                <Button
                  className="mt-4 w-full bg-primary text-primary-foreground"
                  onClick={() => {
                    validateBatchBeforeSend(l.id);
                    refreshBatches();
                  }}
                >
                  Validar pre-envío
                </Button>
              )}

              {l.estado === "listo_para_envio" && (
                <>
                  <div className="mt-4 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
                    Lote listo para una futura integración real. No se ha enviado nada a SIEC.
                  </div>

                  <Button
                    className="mt-4 w-full bg-gradient-primary text-primary-foreground"
                    onClick={() => {
                      sendBatchSimulated(l.id);
                      refreshBatches();
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar simulado
                  </Button>
                </>
              )}

              {l.estado === "enviado_simulado" && (
                <div className="mt-4 rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
                  Envío simulado completado correctamente. Todavía no se ha enviado nada a SIEC real.
                </div>
              )}

              {l.estado === "error_envio_simulado" && (
                <>
                  <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    El envío simulado ha fallado. Puedes revisar errores o reintentar el envío simulado.
                  </div>

                  <Button
                    className="mt-4 w-full bg-gradient-primary text-primary-foreground"
                    onClick={() => {
                      sendBatchSimulated(l.id);
                      refreshBatches();
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Reintentar envío simulado
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}