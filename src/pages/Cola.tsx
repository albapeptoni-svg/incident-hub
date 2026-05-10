import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatFechaES } from "@/utils";
import {
  SIEC_SIMULATION_MODE,
  operationalDataService,
  type IncidenciaColaSIEC,
} from "@/services/operationalData.service";
import { logger } from "@/lib/logger";
import { SAFE_MESSAGES, getSafeUserMessage, logTechnicalError } from "@/lib/safeError";

type ParteAgrupado = {
  id: string;
  titulo: string;
  centro: string;
  fecha: string;
  incidencias: IncidenciaColaSIEC[];
};

function getTextoIncidencia(incidencia: IncidenciaColaSIEC) {
  return incidencia.texto || incidencia.descripcion || "Incidencia sin texto";
}

function getTituloIncidencia(incidencia: IncidenciaColaSIEC) {
  return incidencia.titulo || getTextoIncidencia(incidencia).split(/\s+/).slice(0, 6).join(" ");
}

function getClaveParte(incidencia: IncidenciaColaSIEC) {
  return (
    incidencia.parteId ||
    `${incidencia.parteTitulo || "parte"}-${incidencia.centro || "centro"}-${incidencia.fecha || "fecha"}`
  );
}

function agruparPorParte(cola: IncidenciaColaSIEC[]): ParteAgrupado[] {
  const grupos = new Map<string, ParteAgrupado>();

  cola.forEach((item) => {
    if (item.estado !== "aprobada") return;
    const id = getClaveParte(item);

    if (!grupos.has(id)) {
      grupos.set(id, {
        id,
        titulo: item.parteTitulo || "Parte sin título",
        centro: item.centro || "Centro sin indicar",
        fecha: item.fecha || "Fecha sin indicar",
        incidencias: [],
      });
    }

    grupos.get(id)?.incidencias.push(item);
  });

  return Array.from(grupos.values());
}

export default function Cola() {
  const { user, profile, isVisor } = useAuth();
  const [cola, setCola] = useState<IncidenciaColaSIEC[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    window.setTimeout(() => setMensaje(""), 3500);
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const filtros = {
        tabla: "public.incidencias",
        estado: "aprobada",
        crear_en_siec: true,
        estadoParte: "listo_para_enviar",
      };
      logger.debug("SIEC queue page loading", {
        estado: filtros.estado,
        estadoParte: filtros.estadoParte,
      });
      const data = await operationalDataService.listarCola();
      logger.info("SIEC queue page loaded", {
        count: data.length,
      });
      setCola(data);
    } catch (error) {
      logTechnicalError("SIEC queue page load failed", error);
      mostrarMensaje("No se pudo cargar la Cola SIEC desde Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const partesAgrupados = useMemo(() => agruparPorParte(cola), [cola]);

  useEffect(() => {
    setSeleccionadas((prev) => {
      const siguiente: Record<string, Set<string>> = {};

      partesAgrupados.forEach((parte) => {
        const idsPendientes = new Set(parte.incidencias.map((incidencia) => incidencia.id));
        const seleccionActual = prev[parte.id];
        if (!seleccionActual) return;

        const seleccionVigente = new Set(
          [...seleccionActual].filter((id) => idsPendientes.has(id))
        );

        if (seleccionVigente.size > 0) {
          siguiente[parte.id] = seleccionVigente;
        }
      });

      return siguiente;
    });
  }, [partesAgrupados]);

  const toggleIncidencia = (parteId: string, incidenciaId: string) => {
    setSeleccionadas((prev) => {
      const seleccionParte = new Set(prev[parteId] ?? []);

      if (seleccionParte.has(incidenciaId)) {
        seleccionParte.delete(incidenciaId);
      } else {
        seleccionParte.add(incidenciaId);
      }

      return { ...prev, [parteId]: seleccionParte };
    });
  };

  const toggleTodas = (parte: ParteAgrupado) => {
    setSeleccionadas((prev) => {
      const ids = parte.incidencias.map((incidencia) => incidencia.id);
      const seleccionParte = prev[parte.id] ?? new Set<string>();
      const estanTodasSeleccionadas = ids.every((id) => seleccionParte.has(id));

      return {
        ...prev,
        [parte.id]: estanTodasSeleccionadas ? new Set() : new Set(ids),
      };
    });
  };

  const enviarSeleccionadas = async (parte: ParteAgrupado) => {
    if (isVisor) {
      mostrarMensaje("Tu rol permite consultar, pero no gestionar incidencias.");
      return;
    }

    const idsSeleccionados = Array.from(seleccionadas[parte.id] ?? []);
    if (idsSeleccionados.length === 0) {
      mostrarMensaje("No hay incidencias seleccionadas para enviar.");
      return;
    }

    try {
      const resultado = await operationalDataService.enviarIncidenciasASiec(idsSeleccionados, {
        id: user?.id,
        email: user?.email,
        profile,
      });
      setSeleccionadas((prev) => {
        const siguiente = { ...prev };
        delete siguiente[parte.id];
        return siguiente;
      });
      await cargar();
      if (resultado?.modo === "simulado") {
        mostrarMensaje(
          `Envío simulado correctamente. ${resultado.total} incidencias procesadas para SIEC.`
        );
      }
    } catch (error) {
      logTechnicalError("SIEC send failed", error);
      mostrarMensaje(getSafeUserMessage(error, SAFE_MESSAGES.generic));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cola SIEC"
        title="Cola de incidencias pendientes"
        subtitle="Incidencias agrupadas por parte, con selección previa para SIEC."
      />

      {mensaje && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {mensaje}
        </div>
      )}

      {SIEC_SIMULATION_MODE && (
        <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">Modo simulación SIEC</span>
          <span>No se enviará nada a la plataforma SIEC real.</span>
        </div>
      )}

      {loading ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Cargando cola...</p>
        </div>
      ) : partesAgrupados.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">No hay incidencias pendientes</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando envíes un parte al siguiente paso, aparecerá aquí agrupado con sus incidencias.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {partesAgrupados.map((parte) => {
            const seleccionParte = seleccionadas[parte.id] ?? new Set<string>();
            const totalPendientes = parte.incidencias.length;
            const totalSeleccionadas = parte.incidencias.filter((incidencia) =>
              seleccionParte.has(incidencia.id)
            ).length;
            const todasSeleccionadas =
              totalPendientes > 0 && totalSeleccionadas === totalPendientes;

            return (
              <section key={parte.id} className="surface-card overflow-hidden">
                <div className="border-b border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {parte.centro} · {formatFechaES(parte.fecha)}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold">{parte.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {totalPendientes} pendientes · {totalSeleccionadas} seleccionadas
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={todasSeleccionadas}
                          disabled={isVisor}
                          onChange={() => toggleTodas(parte)}
                          className="h-4 w-4"
                        />
                        Seleccionar todas
                      </label>

                      <Button
                        size="sm"
                        disabled={isVisor || totalSeleccionadas === 0}
                        onClick={() => enviarSeleccionadas(parte)}
                      >
                        {SIEC_SIMULATION_MODE ? "Simular envío a SIEC" : "Enviar seleccionadas a SIEC"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {parte.incidencias.map((incidencia, index) => (
                    <article key={incidencia.id} className="p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <input
                            type="checkbox"
                            checked={seleccionParte.has(incidencia.id)}
                            disabled={isVisor}
                            onChange={() => toggleIncidencia(parte.id, incidencia.id)}
                            className="mt-1 h-4 w-4 shrink-0"
                            aria-label={`Seleccionar incidencia ${index + 1}`}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="mb-1 text-xs font-semibold text-muted-foreground">
                              Incidencia {index + 1}
                            </p>
                            <p className="text-sm font-semibold leading-relaxed text-foreground">
                              {getTituloIncidencia(incidencia)}
                            </p>
                            <p className="text-sm leading-relaxed text-foreground">
                              {getTextoIncidencia(incidencia)}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-primary">
                              Pendiente SIEC
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
