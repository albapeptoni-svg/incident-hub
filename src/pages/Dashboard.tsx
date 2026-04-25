import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
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

  if (loadingPartes || loadingCentros || loadingAut || loadingUsr) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Visión general"
        title="Dashboard"
        subtitle="Estado en tiempo real de partes, incidencias y envíos a SIEC."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Activity className="mr-2 h-4 w-4" /> Última hora
            </Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Nuevo parte
            </Button>
          </>
        }
      />

      <DashboardStats />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Resumen integración */}
        <div className="lg:col-span-2 surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Integración SIEC — hoy
              </h3>
              <p className="text-sm text-muted-foreground">
                Resumen de envíos automatizados y manuales.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cola">
                Ver cola <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Enviadas",
                value: automatizaciones.filter(a => a.estado === "completado").length,
                color: "from-primary to-primary-glow",
              },
              {
                label: "Confirmadas",
                value: automatizaciones.filter(a => a.estado === "completado").length,
                color: "from-success to-success",
              },
              {
                label: "Con error",
                value: automatizaciones.filter(a => a.estado === "error").length,
                color: "from-destructive to-warning",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-surface/50 p-4"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold">
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

          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Últimos partes</h4>
            <div className="space-y-2">
              {partes.length > 0 ? (
                partes.slice(0, 4).map((p) => {
                  const centro = centros.find(c => c.id === p.centroId);
                  const tecnico = usuarios.find(u => u.id === p.tecnicoId);

                  return (
                    <Link
                      key={p.id}
                      to={`/partes/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/40"
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
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No hay partes reales registrados todavía.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <RecentActivity actividad={[]} />
      </div>

      {/* Accesos rápidos */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Revisar incidencias",
            desc: `${partes.filter(p => p.estado === 'en_revision').length} pendientes`,
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
            className="group surface-card p-5 hover:shadow-md"
          >
            <div
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                q.accent
              )}
            >
              <q.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-display text-base font-semibold">
              {q.title}
            </p>
            <p className="text-xs text-muted-foreground">{q.desc}</p>
            <div className="mt-3 inline-flex items-center text-xs font-medium text-primary">
              Abrir{" "}
              <ArrowUpRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}