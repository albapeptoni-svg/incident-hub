import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { lotes } from "@/lib/mockData";
import { Download, Eye } from "lucide-react";

export default function Historial() {
  return (
    <div>
      <PageHeader
        eyebrow="Auditoría"
        title="Historial de envíos"
        subtitle="Registro completo de todos los lotes enviados a SIEC."
        actions={<Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>}
      />

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Lote</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Parte</th>
                <th className="px-5 py-3">Incidencias</th>
                <th className="px-5 py-3">Responsable</th>
                <th className="px-5 py-3">Duración</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold">{l.codigo}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{l.fecha}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">{l.parteCodigo}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                      {l.numIncidencias}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">{l.responsable}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{l.duracion ?? "—"}</td>
                  <td className="px-5 py-3.5"><StatusBadge estado={l.estado} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm"><Eye className="mr-1.5 h-3.5 w-3.5" /> Ver</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
