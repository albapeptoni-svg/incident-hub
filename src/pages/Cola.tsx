import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  History,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  approveBatchForSend,
  getBatches,
  sendBatchSimulated,
  simulateBatches,
  validateBatchBeforeSend,
} from "@/store/siecStore";
import { SiecBatch } from "@/types/siec";
import { useIncidencias } from "@/hooks/use-data";

function getEstadoUsuario(estado: string) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "simulado_ok") return "Validado";
  if (estado === "aprobado_para_envio") return "Aprobado";
  if (estado === "listo_para_envio") return "Listo para enviar";
  if (estado === "enviando_simulado") return "Enviando...";
  if (estado === "enviado_simulado") return "Enviado";
  if (estado === "error_envio_simulado") return "Error de envío";
  if (estado === "bloqueado") return "Necesita revisión";
  return "Pendiente";
}

function getEstadoIcono(estado: string) {
  if (["enviado_simulado", "listo_para_envio", "simulado_ok"].includes(estado)) {
    return CheckCircle2;
  }

  if (["bloqueado", "error_envio_simulado"].includes(estado)) {
    return AlertTriangle;
  }

  return Clock;
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
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);
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

  const resumen = useMemo(() => {
    return {
      total: lotes.length,
      listos: lotes.filter((l) => ["listo_para_envio", "enviado_simulado"].includes(l.estado)).length,
      revisar: lotes.filter((l) => ["bloqueado", "error_envio_simulado"].includes(l.estado)).length,
    };
  }, [lotes]);

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
        eyebrow="Envíos"
        title="Cola SIEC"
        subtitle="Revisa los lotes preparados antes de cualquier envío a SIEC."
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
              <ShieldCheck className="mr-2 h-4 w-4" /> Validar lotes
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Total de lotes</p>
          <p className="mt-1 font-display text-2xl font-bold">{resumen.total}</p>
        </div>

        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Listos / enviados</p>
          <p className="mt-1 font-display text-2xl font-bold text-success">{resumen.listos}</p>
        </div>

        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Necesitan revisión</p>
          <p className="mt-1 font-display text-2xl font-bold text-destructive">{resumen.revisar}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Modo seguro: no se envía nada a SIEC real.</p>
            <p>Esta pantalla solo prepara, valida y simula el proceso antes de una futura integración real.</p>
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
        <div className="grid gap-4 lg:grid-cols-2">
          {lotes.map((l) => {
            const EstadoIcono = getEstadoIcono(l.estado);
            const detalleVisible = detalleAbierto === l.id;

            return (
              <div key={l.id} className="surface-card p-5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{l.fechaCreacion}</p>
                    <p className="mt-1 font-display text-lg font-bold">Lote SIEC</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{l.id}</p>
                  </div>

                  <StatusBadge estado={l.estado} label={getEstadoUsuario(l.estado)} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Incidencias</p>
                    <p className="mt-1 font-display text-xl font-bold">{l.incidenciasIds.length}</p>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado</p>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <EstadoIcono className="h-4 w-4" />
                      {getEstadoUsuario(l.estado)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Usuario</p>
                    <p className="mt-1 truncate text-sm font-semibold">{l.creadoPor}</p>
                  </div>
                </div>

                {l.errores && l.errores.length > 0 && (
                  <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    Hay errores en este lote. Revisa los detalles antes de continuar.
                  </div>
                )}

                {l.warnings && l.warnings.length > 0 && (
                  <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                    Hay avisos o posibles duplicados. No bloquean el proceso, pero conviene revisarlos.
                  </div>
                )}

                {l.respuestaSimulada && (
                  <div className="mt-4 rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info">
                    {l.estado === "enviado_simulado"
                      ? "Envío simulado completado correctamente."
                      : l.respuestaSimulada}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {l.estado === "simulado_ok" && (
                    <Button
                      className="flex-1 bg-success text-white"
                      onClick={() => {
                        approveBatchForSend(l.id);
                        refreshBatches();
                      }}
                    >
                      Aprobar
                    </Button>
                  )}

                  {l.estado === "aprobado_para_envio" && (
                    <Button
                      className="flex-1 bg-primary text-primary-foreground"
                      onClick={() => {
                        validateBatchBeforeSend(l.id);
                        refreshBatches();
                      }}
                    >
                      Validar antes de enviar
                    </Button>
                  )}

                  {l.estado === "listo_para_envio" && (
                    <Button
                      className="flex-1 bg-gradient-primary text-primary-foreground"
                      onClick={() => {
                        sendBatchSimulated(l.id);
                        refreshBatches();
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar simulado
                    </Button>
                  )}

                  {l.estado === "error_envio_simulado" && (
                    <Button
                      className="flex-1 bg-gradient-primary text-primary-foreground"
                      onClick={() => {
                        sendBatchSimulated(l.id);
                        refreshBatches();
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Reintentar envío
                    </Button>
                  )}

                  {l.payloadPreview && l.payloadPreview.length > 0 && (
                    <Button variant="outline" className="flex-1" onClick={() => exportBatchToCSV(l)}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDetalleAbierto(detalleVisible ? null : l.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {detalleVisible ? "Ocultar detalles" : "Ver detalles"}
                  </Button>
                </div>

                {detalleVisible && (
                  <div className="mt-5 space-y-4 border-t border-border pt-4">
                    {l.errores && l.errores.length > 0 && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                        <p className="mb-2 font-semibold">Errores detectados:</p>
                        {l.errores.map((e, i) => (
                          <p key={i}>• {e}</p>
                        ))}
                      </div>
                    )}

                    {l.warnings && l.warnings.length > 0 && (
                      <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                        <p className="mb-2 font-semibold">Avisos:</p>
                        {l.warnings.map((warning, i) => (
                          <p key={i}>• {warning}</p>
                        ))}
                      </div>
                    )}

                    {l.payloadPreview && l.payloadPreview.length > 0 && (
                      <div className="rounded-md border border-border bg-muted/40 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          Datos preparados para SIEC
                        </div>

                        <div className="space-y-2 text-xs">
                          {l.payloadPreview.map((item) => (
                            <div key={item.incidenciaId} className="rounded-md border border-border bg-background p-3">
                              <p className="font-semibold">{item.asunto}</p>
                              <p className="mt-1 text-muted-foreground">{item.descripcion}</p>
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {item.tema} · {item.categoria} · {item.grupo}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {l.logs && l.logs.length > 0 && (
                      <div className="rounded-md border border-border bg-muted/30 p-3">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}