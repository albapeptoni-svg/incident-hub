import { StatCard } from "@/components/StatCard";
import { FileText, ClipboardCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { partes, incidencias, automatizaciones } from "@/mocks";

export function DashboardStats() {
  const pendientes = partes.filter(p => p.estado === 'borrador').length;
  const enRevision = partes.filter(p => p.estado === 'en_revision').length;
  const aprobadas = incidencias.filter(i => i.estado === 'aprobada').length;
  const errores = automatizaciones.filter(a => a.estado === 'error').length;

  return (
    <div className="stat-grid">
      <StatCard label="Partes borradores" value={pendientes} icon={FileText} accent="warning" />
      <StatCard label="En revisión" value={enRevision} icon={ClipboardCheck} accent="info" />
      <StatCard label="Incidencias aprobadas" value={aprobadas} icon={CheckCircle2} accent="success" />
      <StatCard label="Errores lotes" value={errores} icon={AlertCircle} accent="destructive" />
    </div>
  );
}
