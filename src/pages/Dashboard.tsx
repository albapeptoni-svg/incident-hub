import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  RefreshCw,
  ScanText,
  Send,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import { cn, formatFechaES } from "@/utils";
import {
  operationalDataService,
  type DashboardIncidenciaRow,
  type DashboardParteRow,
} from "@/services/operationalData.service";
import { logTechnicalError } from "@/lib/safeError";

const ESTADOS_PARTE_HISTORICO = ["enviado", "completado"];
const ESTADOS_PARTE_PENDIENTE = [
  "borrador",
  "procesado",
  "en_revision",
  "aprobado",
  "listo_para_enviar",
  "error",
];
const ESTADOS_INCIDENCIA_ENVIADA = ["enviada", "confirmada", "reenviada"];
const ESTADOS_INCIDENCIA_PENDIENTE_SIEC = ["pendiente", "corregida", "aprobada"];

type MetricTone = "neutral" | "pending" | "success" | "warning" | "danger";

type Metric = {
  label: string;
  value: number;
  helper: string;
  icon: typeof FileText;
  tone: MetricTone;
  to: string;
};

type Actividad = {
  id: string;
  titulo: string;
  detalle: string;
  fecha?: string;
  to: string;
};

const toneClasses: Record<MetricTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-300 bg-red-100 text-red-800",
};

function formatFechaHoraES(value?: string | null) {
  if (!value) return "Sin fecha";
  const [fecha, hora] = value.split("T");
  const fechaES = formatFechaES(fecha) || fecha;
  return hora ? `${fechaES} ${hora.slice(0, 5)}` : fechaES;
}

function getFechaOrden(value?: string) {
  return value || "";
}

function getFechaActividadParte(parte: DashboardParteRow) {
  return parte.actualizadoEn || parte.creadoEn || parte.fecha;
}

function getFechaActividadIncidencia(incidencia: DashboardIncidenciaRow) {
  return incidencia.actualizadoEn || incidencia.creadoEn || "";
}

function sortByFechaDesc<T>(items: T[], getFecha: (item: T) => string | undefined) {
  return items.slice().sort((a, b) => getFechaOrden(getFecha(b)).localeCompare(getFechaOrden(getFecha(a))));
}

function MetricCard({ label, value, helper, icon: Icon, tone, to }: Metric) {
  return (
    <Link
      to={to}
      className={cn(
        "group rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        toneClasses[tone]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
          <p className="mt-3 font-display text-4xl font-bold leading-none">{value}</p>
          <p className="mt-2 text-sm font-medium opacity-80">{helper}</p>
        </div>
        <div className="rounded-xl border border-current/20 bg-white/70 p-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold opacity-80 group-hover:opacity-100">
        Abrir detalle
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const [partes, setPartes] = useState<DashboardParteRow[]>([]);
  const [incidencias, setIncidencias] = useState<DashboardIncidenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await operationalDataService.getDashboardData();
      setPartes(data.partes ?? []);
      setIncidencias(data.incidencias ?? []);
    } catch (err) {
      logTechnicalError("Dashboard data load failed", err);
      setPartes([]);
      setIncidencias([]);
      setError("No se pudieron cargar los datos del Dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const incidenciasPorParte = useMemo(() => {
    const mapa = new Map<string, DashboardIncidenciaRow[]>();
    incidencias.forEach((incidencia) => {
      mapa.set(incidencia.parteId, [...(mapa.get(incidencia.parteId) ?? []), incidencia]);
    });
    return mapa;
  }, [incidencias]);

  const stats = useMemo(() => {
    const partesPendientes = partes.filter((parte) =>
      ESTADOS_PARTE_PENDIENTE.includes(parte.estado)
    );
    const partesHistoricos = partes.filter((parte) =>
      ESTADOS_PARTE_HISTORICO.includes(parte.estado)
    );
    const incidenciasPendientesSIEC = incidencias.filter(
      (incidencia) =>
        incidencia.crearEnSIEC &&
        ESTADOS_INCIDENCIA_PENDIENTE_SIEC.includes(incidencia.estado)
    );
    const incidenciasEnviadas = incidencias.filter((incidencia) =>
      ESTADOS_INCIDENCIA_ENVIADA.includes(incidencia.estado)
    );
    const incidenciasDescartadas = incidencias.filter(
      (incidencia) => !incidencia.crearEnSIEC || incidencia.estado === "descartada"
    );
    const partesConError = partes.filter((parte) => parte.estado === "error");
    const incidenciasConError = incidencias.filter((incidencia) => incidencia.estado === "error");

    return {
      partesPendientes,
      partesHistoricos,
      incidenciasPendientesSIEC,
      incidenciasEnviadas,
      incidenciasDescartadas,
      partesConError,
      incidenciasConError,
    };
  }, [incidencias, partes]);

  const partesPendientesOrdenados = useMemo(
    () => sortByFechaDesc(stats.partesPendientes, getFechaActividadParte).slice(0, 6),
    [stats.partesPendientes]
  );

  const actividadReciente = useMemo<Actividad[]>(() => {
    const actividadPartes = sortByFechaDesc(partes, getFechaActividadParte)
      .slice(0, 6)
      .map((parte) => ({
        id: `parte-${parte.id}`,
        titulo: `Parte ${parte.estado || "sin estado"}`,
        detalle: `${parte.titulo} · ${parte.centro}`,
        fecha: getFechaActividadParte(parte),
        to: ESTADOS_PARTE_HISTORICO.includes(parte.estado) ? "/historial" : "/partes",
      }));

    const actividadIncidencias = sortByFechaDesc(incidencias, getFechaActividadIncidencia)
      .slice(0, 6)
      .map((incidencia) => ({
        id: `incidencia-${incidencia.id}`,
        titulo: ESTADOS_INCIDENCIA_ENVIADA.includes(incidencia.estado)
          ? "Incidencia enviada a SIEC"
          : `Incidencia ${incidencia.estado || "sin estado"}`,
        detalle: incidencia.titulo || incidencia.texto || "Incidencia sin título",
        fecha: getFechaActividadIncidencia(incidencia),
        to: "/partes",
      }));

    return sortByFechaDesc([...actividadPartes, ...actividadIncidencias], (item) => item.fecha).slice(0, 6);
  }, [incidencias, partes]);

  const alertas = useMemo(() => {
    const incidenciasSinTitulo = incidencias.filter(
      (incidencia) => incidencia.crearEnSIEC && !incidencia.titulo.trim()
    ).length;
    const incidenciasSinTexto = incidencias.filter(
      (incidencia) => incidencia.crearEnSIEC && !incidencia.texto.trim()
    ).length;
    const partesSinIncidencias = partes.filter(
      (parte) => (incidenciasPorParte.get(parte.id) ?? []).length === 0
    ).length;

    return [
      stats.partesConError.length > 0 && `${stats.partesConError.length} partes con estado error.`,
      stats.incidenciasConError.length > 0 && `${stats.incidenciasConError.length} incidencias con estado error.`,
      incidenciasSinTitulo > 0 && `${incidenciasSinTitulo} incidencias seleccionadas para SIEC no tienen título.`,
      incidenciasSinTexto > 0 && `${incidenciasSinTexto} incidencias seleccionadas para SIEC no tienen descripción.`,
      partesSinIncidencias > 0 && `${partesSinIncidencias} partes no tienen incidencias asociadas.`,
    ].filter(Boolean) as string[];
  }, [incidencias, incidenciasPorParte, partes, stats.incidenciasConError.length, stats.partesConError.length]);

  const metricas: Metric[] = [
    {
      label: "Partes totales",
      value: partes.length,
      helper: "Registros en Supabase",
      icon: FileText,
      tone: "neutral",
      to: "/partes",
    },
    {
      label: "Partes pendientes",
      value: stats.partesPendientes.length,
      helper: "No finalizados",
      icon: Clock3,
      tone: "pending",
      to: "/partes",
    },
    {
      label: "Partes gestionados",
      value: stats.partesHistoricos.length,
      helper: "Enviado o completado",
      icon: CheckCircle2,
      tone: "success",
      to: "/historial",
    },
    {
      label: "Incidencias totales",
      value: incidencias.length,
      helper: "Líneas detectadas",
      icon: Workflow,
      tone: "neutral",
      to: "/partes",
    },
    {
      label: "Pendientes SIEC",
      value: stats.incidenciasPendientesSIEC.length,
      helper: "Seleccionadas sin enviar",
      icon: Send,
      tone: "warning",
      to: "/cola",
    },
    {
      label: "Enviadas SIEC",
      value: stats.incidenciasEnviadas.length,
      helper: "Enviadas, confirmadas o reenviadas",
      icon: History,
      tone: "success",
      to: "/historial",
    },
    {
      label: "No enviadas",
      value: stats.incidenciasDescartadas.length,
      helper: "Descartadas o fuera de SIEC",
      icon: ShieldAlert,
      tone: "neutral",
      to: "/historial",
    },
    {
      label: "Errores",
      value: stats.partesConError.length + stats.incidenciasConError.length,
      helper: "Partes e incidencias",
      icon: AlertTriangle,
      tone: "danger",
      to: "/partes",
    },
  ];

  const sinDatos = !loading && !error && partes.length === 0 && incidencias.length === 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Panel operativo
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950">
              Dashboard SIEC Flow AI
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Estado real del flujo OCR, revisión humana, cola SIEC e histórico. Todas las métricas se calculan desde Supabase usando partes e incidencias actuales.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/ocr"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <ScanText className="h-4 w-4" />
              Analizar parte
            </Link>
            <button
              type="button"
              onClick={cargarDatos}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-display text-lg font-semibold">Cargando dashboard...</p>
        </div>
      ) : sinDatos ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-display text-lg font-semibold">
            Todavía no hay datos suficientes para mostrar el Dashboard.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Cuando crees partes desde IA Partes, aparecerán aquí los indicadores operativos.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricas.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                    Trabajo pendiente
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">
                    Partes pendientes de gestión
                  </h2>
                </div>
                <Link
                  to="/partes"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-100/60"
                >
                  Ver partes
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {partesPendientesOrdenados.length === 0 ? (
                <div className="rounded-xl border border-red-200 bg-white/70 p-6 text-center text-sm font-medium text-slate-600">
                  No hay partes pendientes de gestionar.
                </div>
              ) : (
                <div className="divide-y divide-red-100 rounded-xl border border-red-100 bg-white/80">
                  {partesPendientesOrdenados.map((parte) => {
                    const totalIncidencias = (incidenciasPorParte.get(parte.id) ?? []).length || parte.numIncidencias || 0;
                    return (
                      <Link
                        key={parte.id}
                        to="/partes"
                        className="grid gap-3 p-4 transition hover:bg-red-50 md:grid-cols-[1fr_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{parte.titulo}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {parte.centro} · {formatFechaES(parte.fecha) || "Sin fecha"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            {parte.estado || "sin estado"}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            {totalIncidencias} incidencias
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Alertas
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">
                  Revisión necesaria
                </h2>
              </div>

              {alertas.length === 0 ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm font-medium text-green-800">
                  No hay alertas operativas detectadas.
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas.map((alerta) => (
                    <div
                      key={alerta}
                      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {alerta}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Actividad real
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-slate-950">
                  Actividad reciente
                </h2>
              </div>
              <Link
                to="/historial"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Ver histórico
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {actividadReciente.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Workflow className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 text-sm font-bold text-slate-950">
                  Todavía no hay actividad reciente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {actividadReciente.map((actividad) => (
                  <Link
                    key={actividad.id}
                    to={actividad.to}
                    className="grid gap-3 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{actividad.titulo}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">
                        {actividad.detalle}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
                      {formatFechaHoraES(actividad.fecha)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
