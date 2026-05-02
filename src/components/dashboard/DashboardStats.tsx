import { StatCard } from "@/components/StatCard";
import { CheckCircle2, FileText, History, Send } from "lucide-react";
import { Link } from "react-router-dom";

type DashboardStatsProps = {
  partesGuardados: number;
  pendientesSiec: number;
  gestionadas: number;
  partesConActividad: number;
};

export function DashboardStats({
  partesGuardados,
  pendientesSiec,
  gestionadas,
  partesConActividad,
}: DashboardStatsProps) {
  return (
    <section className="stat-grid">
      <Link to="/partes" className="block cursor-pointer">
        <StatCard label="Partes guardados" value={partesGuardados} icon={FileText} accent="info" />
      </Link>
      <Link to="/cola" className="block cursor-pointer">
        <StatCard label="Pendientes SIEC" value={pendientesSiec} icon={Send} accent="warning" />
      </Link>
      <Link to="/historial" className="block cursor-pointer">
        <StatCard label="Enviadas / gestionadas" value={gestionadas} icon={CheckCircle2} accent="success" />
      </Link>
      <Link to="/partes" className="block cursor-pointer">
        <StatCard label="Partes con actividad" value={partesConActividad} icon={History} accent="primary" />
      </Link>
    </section>
  );
}
