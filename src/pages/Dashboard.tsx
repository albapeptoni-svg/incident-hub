import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { cn } from "@/utils";
import { ArrowUpRight, FileText, History, ScanText, Send } from "lucide-react";
import {
  operationalDataService,
  type IncidenciaColaSIEC,
  type ParteOperativo,
  type RegistroHistorialSIEC,
} from "@/services/operationalData.service";

function getParteKey(item: {
  id?: string;
  parteId?: string;
  titulo?: string;
  parteTitulo?: string;
  centro?: string;
  fecha?: string;
}) {
  return (
    item.parteId ||
    item.id ||
    `${item.parteTitulo || item.titulo || "parte"}-${item.centro || "centro"}-${item.fecha || "fecha"}`
  );
}

function getTexto(registro: RegistroHistorialSIEC) {
  return registro.texto || registro.descripcion || "Incidencia sin texto";
}

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-ES");
}

export default function Dashboard() {
  const [partes, setPartes] = useState<ParteOperativo[]>([]);
  const [cola, setCola] = useState<IncidenciaColaSIEC[]>([]);
  const [historial, setHistorial] = useState<RegistroHistorialSIEC[]>([]);
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = async () => {
    try {
      const data = await operationalDataService.getDashboardData();
      setPartes(data.partes);
      setCola(data.cola);
      setHistorial(data.historial);
    } catch (error) {
      console.error(error);
      setMensaje("No se pudieron cargar los indicadores desde Supabase.");
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const pendientesSiec = cola.filter((item) => item.estado === "pendiente_siec").length;

  const partesConActividad = useMemo(() => {
    const keys = new Set<string>();

    partes.forEach((parte) => keys.add(getParteKey(parte)));
    cola.forEach((incidencia) => keys.add(getParteKey(incidencia)));
    historial.forEach((registro) => keys.add(getParteKey(registro)));

    return keys.size;
  }, [cola, historial, partes]);

  const actividadReciente = useMemo(
    () =>
      historial
        .slice()
        .sort(
          (a, b) =>
            new Date(b.enviadoEn || "").getTime() -
            new Date(a.enviadoEn || "").getTime()
        )
        .slice(0, 5),
    [historial]
  );

  const renderAcceso = (
    title: string,
    desc: string,
    Icon: typeof ScanText,
    accent: string
  ) => (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            accent
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-3 font-display text-base font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </>
  );

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-gradient-surface p-5 shadow-sm md:p-6">
        <PageHeader
          eyebrow="Panel operativo"
          title="Dashboard"
          subtitle="Resumen del flujo IA Partes → Partes → Cola SIEC → Historial."
        />
      </section>

      <DashboardStats
        partesGuardados={partes.length}
        pendientesSiec={pendientesSiec}
        gestionadas={historial.length}
        partesConActividad={partesConActividad}
      />

      {mensaje && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {mensaje}
        </div>
      )}

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Operaciones</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Accesos rápidos</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/ocr" className="group surface-card cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
            {renderAcceso("IA Partes", "Analizar parte manuscrito", ScanText, "from-info to-primary-glow")}
          </Link>
          <Link to="/partes" className="group surface-card cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
            {renderAcceso("Partes", `${partes.length} guardados`, FileText, "from-primary to-secondary")}
          </Link>
          <Link to="/cola" className="group surface-card cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
            {renderAcceso("Cola SIEC", `${pendientesSiec} pendientes`, Send, "from-warning to-destructive")}
          </Link>
          <Link to="/historial" className="group surface-card cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
            {renderAcceso("Historial", `${historial.length} registros`, History, "from-success to-info")}
          </Link>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Historial</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Actividad reciente</h2>
          </div>
          <Link to="/historial" className="text-sm font-semibold text-primary hover:underline">
            Ver Historial
          </Link>
        </div>

        {actividadReciente.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              No hay actividad registrada todavía.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actividadReciente.map((registro, index) => (
              <Link
                key={registro.id || `${registro.parteId || "parte"}-${index}`}
                to="/historial"
                className="block cursor-pointer rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {registro.centro || "Centro sin indicar"} · {registro.parteTitulo || "Parte sin título"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getTexto(registro)}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(registro.enviadoEn)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
