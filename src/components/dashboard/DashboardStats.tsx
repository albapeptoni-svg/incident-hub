import { StatCard } from "@/components/StatCard";
import { FileText, ClipboardCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { usePartes, useIncidencias, useAutomatizaciones } from "@/hooks/use-data";

export function DashboardStats() {
  const { data: partes = [], isLoading: loadingPartes } = usePartes();
  const { data: incidencias = [], isLoading: loadingIncidencias } = useIncidencias();
  const { data: automatizaciones = [], isLoading: loadingAut } = useAutomatizaciones();

  const pendientes = partes.filter(p => p.estado === 'borrador').length;
  const enRevision = partes.filter(p => p.estado === 'en_revision').length;
  const aprobadas = incidencias.filter(i => i.estado === 'aprobada').length;
  const errores = automatizaciones.filter(a => a.estado === 'error').length;

  if (loadingPartes || loadingIncidencias || loadingAut) {
    return (
      <div className="stat-grid h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="stat-grid">
      <StatCard label="Partes borradores" value={pendientes} icon={FileText} accent="warning" />
      <StatCard label="En revisión" value={enRevision} icon={ClipboardCheck} accent="info" />
      <StatCard label="Incidencias aprobadas" value={aprobadas} icon={CheckCircle2} accent="success" />
      <StatCard label="Errores lotes" value={errores} icon={AlertCircle} accent="destructive" />
    </div>
  );
}
