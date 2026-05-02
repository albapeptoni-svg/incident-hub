import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  operationalDataService,
  type RegistroHistorialSIEC,
} from "@/services/operationalData.service";

type LoteHistorial = {
  id: string;
  titulo: string;
  enviadoEn?: string;
  usuario: string;
  total: number;
  estado: string;
  registros: RegistroHistorialSIEC[];
};

const SIN_LOTE_ID = "__sin_lote__";

function getTexto(registro: RegistroHistorialSIEC) {
  return registro.texto || registro.descripcion || "Incidencia sin texto";
}

function getUsuario(registro: RegistroHistorialSIEC) {
  return registro.usuarioNombre || registro.usuarioEmail || "Usuario no disponible";
}

function getLoteId(registro: RegistroHistorialSIEC) {
  return (
    registro.loteId ||
    registro.lote_id ||
    registro.batchId ||
    registro.batch_id ||
    registro.envioId ||
    registro.envio_id ||
    SIN_LOTE_ID
  );
}

function formatearFecha(fecha?: string) {
  if (!fecha) return "Sin fecha";

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;

  return date.toLocaleString("es-ES");
}

function agruparPorLote(registros: RegistroHistorialSIEC[]): LoteHistorial[] {
  const grupos = new Map<string, RegistroHistorialSIEC[]>();

  registros.forEach((registro) => {
    const loteId = getLoteId(registro);
    grupos.set(loteId, [...(grupos.get(loteId) ?? []), registro]);
  });

  return Array.from(grupos.entries())
    .map(([id, items]) => {
      const ordenados = items
        .slice()
        .sort(
          (a, b) =>
            new Date(b.enviadoEn || "").getTime() -
            new Date(a.enviadoEn || "").getTime()
        );
      const primero = ordenados[0];
      const estados = new Set(ordenados.map((item) => item.estado || "gestionado"));

      return {
        id,
        titulo: id === SIN_LOTE_ID ? "Sin lote asignado" : id,
        enviadoEn: primero?.enviadoEn,
        usuario: primero ? getUsuario(primero) : "Usuario no disponible",
        total: ordenados.length,
        estado: estados.size === 1 ? Array.from(estados)[0] : "mixto",
        registros: ordenados,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.enviadoEn || "").getTime() -
        new Date(a.enviadoEn || "").getTime()
    );
}

export default function Historial() {
  const [historial, setHistorial] = useState<RegistroHistorialSIEC[]>([]);
  const [lotesAbiertos, setLotesAbiertos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      setHistorial(await operationalDataService.listarHistorial());
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo cargar el historial desde Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const lotes = useMemo(() => agruparPorLote(historial), [historial]);

  const toggleLote = (id: string) => {
    setLotesAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Historial"
        title="Historial SIEC"
        subtitle="Incidencias gestionadas agrupadas por lote de envío."
      />

      {mensaje && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {mensaje}
        </div>
      )}

      {loading ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Cargando historial...</p>
        </div>
      ) : lotes.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">
            No hay registros todavía
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Cuando envíes incidencias seleccionadas desde Cola SIEC, aparecerán aquí agrupadas por lote.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lotes.map((lote, index) => {
            const abierto = lotesAbiertos[lote.id] ?? index === 0;

            return (
              <section key={lote.id} className="surface-card overflow-hidden">
                <div className="border-b border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Identificador del lote
                      </p>
                      <h2 className="mt-1 font-display text-lg font-semibold">
                        {lote.titulo}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatearFecha(lote.enviadoEn)} · {lote.usuario}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {lote.total} incidencias
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {lote.estado}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => toggleLote(lote.id)}>
                        {abierto ? "Ocultar detalle" : "Ver detalle"}
                      </Button>
                    </div>
                  </div>
                </div>

                {abierto && (
                  <div className="divide-y divide-border">
                    {lote.registros.map((registro, registroIndex) => (
                      <article
                        key={registro.id || `${lote.id}-${registroIndex}`}
                        className="p-5"
                      >
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_minmax(180px,0.7fr)]">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Centro / parte
                            </p>
                            <p className="mt-1 font-medium">
                              {registro.centro || "Centro sin indicar"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {registro.parteTitulo || "Parte sin título"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {registro.fecha || "Fecha sin indicar"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Descripción
                            </p>
                            <p className="mt-1 text-sm leading-relaxed">
                              {getTexto(registro)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Usuario
                            </p>
                            <p className="mt-1 text-sm font-medium">{getUsuario(registro)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {registro.usuarioEmail || "Sin email"} · {registro.usuarioRol || "sin rol"}
                            </p>
                            <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              {registro.estado || "gestionado"}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
