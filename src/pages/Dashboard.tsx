import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Send,
  Sparkles,
  Activity,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/utils";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { usePartes, useCentros, useAutomatizaciones, useUsuarios } from "@/hooks/use-data";

export default function Dashboard() {
  const { data: partes = [], isLoading: loadingPartes } = usePartes();
  const { data: centros = [], isLoading: loadingCentros } = useCentros();
  const { data: automatizaciones = [], isLoading: loadingAut } = useAutomatizaciones();
  const { data: usuarios = [], isLoading: loadingUsr } = useUsuarios();
  const partesEnRevision = partes.filter(p => p.estado === 'en_revision').length;
  const lotesActivos = automatizaciones.filter(a => ['en_proceso', 'error'].includes(a.estado)).length;
  const lotesCompletados = automatizaciones.filter(a => a.estado === "completado").length;
  const lotesConError = automatizaciones.filter(a => a.estado === "error").length;

  if (loadingPartes || loadingCentros || loadingAut || loadingUsr) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-gradient-surface p-5 shadow-sm md:p-6">
        <PageHeader
          eyebrow="Visión general"
          title="Dashboard operativo"
          subtitle="Estado en tiempo real de partes, incidencias y envíos a SIEC."
          actions={
            <>
              <Button variant="outline" size="sm" className="bg-background/80">
                <CalendarClock className="mr-2 h-4 w-4" /> Última hora
              </Button>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Nuevo parte
              </Button>
            </>
          }
        />
        <div className="grid gap-3 border-t border-border/70 pt-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partes totales</p>
            <p className="mt-1 font-display text-2xl font-bold">{partes.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centros activos</p>
            <p className="mt-1 font-display text-2xl font-bold">{centros.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lotes activos</p>
            <p className="mt-1 font-display text-2xl font-bold">{lotesActivos}</p>
          </div>
        </div>
      </section>

      <DashboardStats />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        {/* Resumen integración */}
        <section className="surface-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border bg-muted/20 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Integración</p>
              <h3 className="mt-1 font-display text-xl font-semibold">
                Integración SIEC hoy
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Resumen de envíos automatizados y manuales.
              </p>
            </div>
            <Button variant="outline" size="sm" className="bg-background" asChild>
              <Link to="/cola">
                Ver cola <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-3">
            {[
              {
                label: "Enviadas",
                value: lotesCompletados,
                color: "from-primary to-primary-glow",
              },
              {
                label: "Confirmadas",
                value: lotesCompletados,
                color: "from-success to-success",
              },
              {
                label: "Con error",
                value: lotesConError,
                color: "from-destructive to-warning",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-background p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {item.value}
                </p>
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r",
                      item.color
                    )}
                    style={{
                      width: `${item.value > 0 ? Math.min((item.value / 10) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seguimiento</p>
                <h4 className="mt-1 font-display text-base font-semibold">Últimos partes</h4>
              </div>
              <p className="text-xs text-muted-foreground">{partesEnRevision} en revisión</p>
            </div>
            <div className="space-y-2">
              {partes.length > 0 ? (
                partes.slice(0, 4).map((p) => {
                  const centro = centros.find(c => c.id === p.centroId);
                  const tecnico = usuarios.find(u => u.id === p.tecnicoId);

                  return (
                    <Link
                      key={p.id}
                      to={`/partes/${p.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 shadow-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {p.codigo} {centro ? `· ${centro.nombre}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tecnico?.nombre || "Técnico"} · {p.numIncidencias} incidencias
                          </p>
                        </div>
                      </div>
                      <StatusBadge estado={p.estado} />
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                  <p className="text-sm font-medium text-foreground">No hay partes reales registrados todavía.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cuando Supabase devuelva datos aparecerán en este bloque.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Actividad reciente */}
        <RecentActivity actividad={[]} />
      </div>

      {/* Accesos rápidos */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Operaciones</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Accesos rápidos</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Revisar incidencias",
            desc: `${partesEnRevision} pendientes`,
            to: "/revision",
            icon: ClipboardCheck,
            accent: "from-info to-primary-glow",
          },
          {
            title: "Cola SIEC",
            desc: `${automatizaciones.filter(a => ['en_proceso', 'error'].includes(a.estado)).length} lotes activos`,
            to: "/cola",
            icon: Send,
            accent: "from-primary to-secondary",
          },
          {
            title: "Historial",
            desc: "Auditoría completa",
            to: "/historial",
            icon: Activity,
            accent: "from-success to-info",
          },
          {
            title: "Administración",
            desc: "Usuarios y ajustes",
            to: "/admin",
            icon: Sparkles,
            accent: "from-warning to-destructive",
          },
        ].map((q) => (
          <Link
            key={q.title}
            to={q.to}
            className="group surface-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                  q.accent
                )}
              >
                <q.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-3 font-display text-base font-semibold">
              {q.title}
            </p>
            <p className="text-xs text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
        </div>
      </section>
    </div>
  );
}
