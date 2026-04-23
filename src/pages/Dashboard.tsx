import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { actividad, partes } from "@/lib/mockData";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Send,
  Sparkles,
  Activity,
  Plus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tipoIcon = {
  envio: Send,
  edicion: ClipboardCheck,
  error: AlertCircle,
  creacion: FileText,
  login: ShieldUser,
};

function ShieldUser(props: React.SVGProps<SVGSVGElement>) {
  return <Sparkles {...props} />;
}

export default function Dashboard() {
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

      <div className="stat-grid">
        <StatCard label="Partes pendientes" value={12} icon={FileText} accent="warning" trend={{ value: "+3 hoy", positive: true }} />
        <StatCard label="En revisión" value={28} icon={ClipboardCheck} accent="info" trend={{ value: "+8", positive: true }} />
        <StatCard label="Listas para enviar" value={47} icon={CheckCircle2} accent="success" trend={{ value: "+12", positive: true }} />
        <StatCard label="Errores integración" value={3} icon={AlertCircle} accent="destructive" trend={{ value: "-2", positive: true }} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Resumen integración */}
        <div className="lg:col-span-2 surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Integración SIEC — hoy</h3>
              <p className="text-sm text-muted-foreground">Resumen de envíos automatizados y manuales.</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cola">Ver cola <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Enviadas", value: 86, color: "from-primary to-primary-glow" },
              { label: "Confirmadas", value: 79, color: "from-success to-success" },
              { label: "Con error", value: 3, color: "from-destructive to-warning" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-surface/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-display text-2xl font-bold">{item.value}</p>
                <div className={cn("mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden")}>
                  <div className={cn("h-full rounded-full bg-gradient-to-r", item.color)} style={{ width: `${(item.value/100)*100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Últimos partes</h4>
            <div className="space-y-2">
              {partes.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/partes/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.codigo} · {p.centro}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.tecnico} · {p.numIncidencias} incidencias</p>
                    </div>
                  </div>
                  <StatusBadge estado={p.estado} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Actividad */}
        <div className="surface-card p-6">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Actividad reciente</h3>
          </div>
          <div className="mt-4 space-y-4">
            {actividad.map((a) => {
              const Icon = tipoIcon[a.tipo] ?? Activity;
              const color =
                a.tipo === "error" ? "text-destructive bg-destructive/10" :
                a.tipo === "envio" ? "text-primary bg-primary/10" :
                a.tipo === "edicion" ? "text-info bg-info/10" :
                a.tipo === "creacion" ? "text-success bg-success/10" :
                "text-muted-foreground bg-muted";
              return (
                <div key={a.id} className="flex gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 pb-3 border-b border-border last:border-0">
                    <p className="text-sm leading-snug">{a.texto}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.usuario} · {a.hora}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Revisar incidencias", desc: "8 pendientes", to: "/revision", icon: ClipboardCheck, accent: "from-info to-primary-glow" },
          { title: "Cola SIEC", desc: "5 lotes activos", to: "/cola", icon: Send, accent: "from-primary to-secondary" },
          { title: "Historial", desc: "Auditoría completa", to: "/historial", icon: Activity, accent: "from-success to-info" },
          { title: "Administración", desc: "Usuarios y ajustes", to: "/admin", icon: Sparkles, accent: "from-warning to-destructive" },
        ].map((q) => (
          <Link key={q.title} to={q.to} className="group surface-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white", q.accent)}>
              <q.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-display text-base font-semibold">{q.title}</p>
            <p className="text-xs text-muted-foreground">{q.desc}</p>
            <div className="mt-3 inline-flex items-center text-xs font-medium text-primary">
              Abrir <ArrowUpRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
