import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFechaES } from "@/utils";
import {
  operationalDataService,
  type ParteOperativo,
} from "@/services/operationalData.service";
import { logTechnicalError } from "@/lib/safeError";

const TODOS_LOS_CENTROS = "__todos__";
const TODOS_LOS_ESTADOS = "__todos__";

function normalizarFechaFiltro(fecha: string): string {
  const value = fecha.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (!match) return value;

  const [, dia, mes, anio] = match;
  const year = anio.length === 2 ? `20${anio}` : anio;
  return `${year}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function formatFechaHoraES(value?: string | null): string {
  if (!value) return "";
  const [fecha, hora] = value.split("T");
  const fechaES = formatFechaES(fecha);
  if (!hora) return fechaES || value;
  return `${fechaES || fecha} ${hora.slice(0, 5)}`;
}

function getGestion(parte: ParteOperativo) {
  return parte.gestionadoEn || parte.actualizadoEn || parte.creadoEn || parte.fecha;
}

function getResumen(parte: ParteOperativo) {
  const total = parte.incidencias.length;
  const enviadas = parte.incidencias.filter((incidencia) => incidencia.incluirEnSIEC).length;
  return {
    total,
    enviadas,
    noEnviadas: total - enviadas,
  };
}

function getUltimaGestion(partes: ParteOperativo[]) {
  return partes
    .map(getGestion)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0] || "";
}

export default function Historial() {
  const [partes, setPartes] = useState<ParteOperativo[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [historialError, setHistorialError] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCentro, setFiltroCentro] = useState(TODOS_LOS_CENTROS);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(TODOS_LOS_ESTADOS);
  const [soloConNoEnviadas, setSoloConNoEnviadas] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setHistorialError("");
    try {
      const data = await operationalDataService.listarPartesHistoricos();
      setPartes(data ?? []);
    } catch (error) {
      logTechnicalError("History load failed", error);
      setPartes([]);
      setHistorialError("No se pudo cargar el historial desde Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const centrosDisponibles = useMemo(
    () =>
      Array.from(
        new Set(partes.map((parte) => parte.centro.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "es")),
    [partes]
  );

  const estadosDisponibles = useMemo(
    () =>
      Array.from(
        new Set(partes.map((parte) => parte.estado || "").filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "es")),
    [partes]
  );

  const partesFiltrados = useMemo(() => {
    const fechaNormalizada = normalizarFechaFiltro(filtroFecha);
    const texto = filtroTexto.trim().toLocaleLowerCase("es");

    return partes.filter((parte) => {
      const resumen = getResumen(parte);
      const coincideFecha =
        !fechaNormalizada ||
        normalizarFechaFiltro(parte.fecha) === fechaNormalizada ||
        parte.fecha.trim() === filtroFecha.trim();
      const coincideCentro =
        filtroCentro === TODOS_LOS_CENTROS || parte.centro === filtroCentro;
      const coincideEstado =
        filtroEstado === TODOS_LOS_ESTADOS || parte.estado === filtroEstado;
      const textoBusqueda = `${parte.titulo} ${parte.centro}`.toLocaleLowerCase("es");
      const coincideTexto = !texto || textoBusqueda.includes(texto);
      const coincideNoEnviadas = !soloConNoEnviadas || resumen.noEnviadas > 0;

      return (
        coincideFecha &&
        coincideCentro &&
        coincideEstado &&
        coincideTexto &&
        coincideNoEnviadas
      );
    });
  }, [filtroCentro, filtroEstado, filtroFecha, filtroTexto, partes, soloConNoEnviadas]);

  const resumenGlobal = useMemo(() => {
    const totalIncidencias = partes.reduce((sum, parte) => sum + parte.incidencias.length, 0);
    const totalEnviadas = partes.reduce(
      (sum, parte) => sum + parte.incidencias.filter((inc) => inc.incluirEnSIEC).length,
      0
    );

    return {
      partes: partes.length,
      incidencias: totalIncidencias,
      enviadas: totalEnviadas,
      noEnviadas: totalIncidencias - totalEnviadas,
      ultimaGestion: getUltimaGestion(partes),
    };
  }, [partes]);

  const hayFiltros =
    filtroFecha ||
    filtroCentro !== TODOS_LOS_CENTROS ||
    filtroEstado !== TODOS_LOS_ESTADOS ||
    filtroTexto.trim() ||
    soloConNoEnviadas;

  const limpiarFiltros = () => {
    setFiltroFecha("");
    setFiltroCentro(TODOS_LOS_CENTROS);
    setFiltroTexto("");
    setFiltroEstado(TODOS_LOS_ESTADOS);
    setSoloConNoEnviadas(false);
  };

  const toggleParte = (parteId: string) => {
    setExpandidos((prev) => ({ ...prev, [parteId]: !prev[parteId] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trazabilidad"
        title="Historial"
        subtitle="Consulta de partes ya gestionados y trazabilidad de incidencias preparadas para SIEC."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        El historial conserva los partes ya gestionados. Permite comprobar qué incidencias fueron preparadas para SIEC, cuáles quedaron fuera y consultar el detalle en modo solo lectura.
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">Partes gestionados</p>
          <p className="mt-2 text-2xl font-bold text-green-950">{resumenGlobal.partes}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">Incidencias enviadas</p>
          <p className="mt-2 text-2xl font-bold text-green-950">{resumenGlobal.enviadas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">No enviadas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{resumenGlobal.noEnviadas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">Última gestión</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {formatFechaHoraES(resumenGlobal.ultimaGestion) || "Sin registros"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Filtros</h2>
            <p className="text-sm text-muted-foreground">
              Busca por fecha, centro, título, estado o partes con incidencias no enviadas.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={!hayFiltros} onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="historial-fecha">Fecha visita</Label>
            <Input
              id="historial-fecha"
              type="date"
              value={filtroFecha}
              onChange={(event) => setFiltroFecha(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="historial-centro">Centro</Label>
            <select
              id="historial-centro"
              value={filtroCentro}
              onChange={(event) => setFiltroCentro(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={TODOS_LOS_CENTROS}>Todos</option>
              {centrosDisponibles.map((centro) => (
                <option key={centro} value={centro}>
                  {centro}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="historial-busqueda">Título / parte</Label>
            <Input
              id="historial-busqueda"
              value={filtroTexto}
              onChange={(event) => setFiltroTexto(event.target.value)}
              placeholder="Buscar parte"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="historial-estado">Estado</Label>
            <select
              id="historial-estado"
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={TODOS_LOS_ESTADOS}>Todos</option>
              {estadosDisponibles.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium lg:mt-6">
            <input
              type="checkbox"
              checked={soloConNoEnviadas}
              onChange={(event) => setSoloConNoEnviadas(event.target.checked)}
              className="h-4 w-4"
            />
            Con no enviadas
          </label>
        </div>
      </section>

      {historialError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {historialError}
        </div>
      )}

      {loading ? (
        <div className="surface-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Cargando historial...</p>
        </div>
      ) : historialError ? null : partes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-display text-lg font-semibold">
            Todavía no hay partes en el histórico.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando envíes o simules el envío de partes a SIEC, aparecerán aquí para consulta.
          </p>
        </div>
      ) : partesFiltrados.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-display text-lg font-semibold">No hay partes que coincidan con los filtros.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Prueba a cambiar la fecha, el centro, el estado o la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {partesFiltrados.map((parte) => {
            const resumen = getResumen(parte);
            const abierto = Boolean(expandidos[parte.id]);

            return (
              <section
                key={parte.id}
                className="overflow-hidden rounded-xl border border-green-200 bg-green-50 shadow-sm"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Gestionado
                        </span>
                        <span className="rounded-full border border-green-200 bg-white/70 px-3 py-1 text-xs font-semibold text-green-700">
                          Solo lectura
                        </span>
                      </div>
                      <h2 className="mt-3 font-display text-lg font-semibold text-slate-950">
                        {parte.titulo}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {parte.centro} · {formatFechaES(parte.fecha) || "Fecha sin indicar"}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {resumen.total} incidencias · {resumen.enviadas} enviadas a SIEC · {resumen.noEnviadas} no enviadas
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-semibold text-green-700">
                        Estado: {parte.estado || "enviado"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Gestión: {formatFechaHoraES(getGestion(parte)) || "Sin fecha"}
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={() => toggleParte(parte.id)}>
                        {abierto ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" />
                            Contraer
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Expandir
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {abierto && (
                  <div className="border-t border-green-200 bg-white/70">
                    {parte.incidencias.length === 0 ? (
                      <div className="p-5 text-sm text-slate-600">Este parte no tiene incidencias asociadas.</div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {parte.incidencias.map((incidencia, index) => {
                          const enviada = incidencia.incluirEnSIEC;

                          return (
                            <article key={incidencia.id} className="p-5">
                              <div className="grid gap-4 lg:grid-cols-[44px_minmax(0,1fr)_180px]">
                                <div className="flex items-start gap-3 lg:block">
                                  <input
                                    type="checkbox"
                                    checked={enviada}
                                    disabled
                                    readOnly
                                    className="mt-1 h-5 w-5 cursor-not-allowed"
                                    aria-label={`Incidencia ${index + 1} ${enviada ? "enviada" : "no enviada"}`}
                                  />
                                  <span className="text-sm font-semibold text-slate-500 lg:mt-2 lg:block">
                                    {incidencia.ordenLinea || index + 1}
                                  </span>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold leading-relaxed text-slate-950">
                                      {incidencia.titulo || "Incidencia sin título"}
                                    </p>
                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                        enviada
                                          ? "border-green-200 bg-green-100 text-green-700"
                                          : "border-slate-200 bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {enviada ? "Enviada a SIEC" : "No enviada"}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                    {incidencia.texto || "Sin descripción"}
                                  </p>
                                  {!enviada && incidencia.motivoExclusion && (
                                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                      Motivo: {incidencia.motivoExclusion}
                                    </p>
                                  )}
                                </div>

                                <div className="text-sm text-slate-600">
                                  <p className="text-xs font-semibold uppercase text-slate-500">Estado</p>
                                  <p className="mt-1 font-medium">{incidencia.estado || "sin estado"}</p>
                                  {incidencia.actualizadoEn && (
                                    <p className="mt-2 text-xs">
                                      Actualizada: {formatFechaHoraES(incidencia.actualizadoEn)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
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
