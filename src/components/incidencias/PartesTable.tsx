import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Parte, Centro, Usuario } from "@/types";

interface PartesTableProps {
  partes: Parte[];
  centros: Centro[];
  usuarios: Usuario[];
}

export function PartesTable({ partes, centros, usuarios }: PartesTableProps) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Centro</th>
              <th className="px-5 py-3">Técnico</th>
              <th className="px-5 py-3">Incidencias</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {partes.map((p) => {
              const centro = centros.find(c => c.id === p.centroId);
              const tecnico = usuarios.find(u => u.id === p.tecnicoId);
              return (
                <tr key={p.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/20">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">{p.codigo}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.fecha}</td>
                  <td className="px-5 py-3.5 font-medium">{centro?.nombre ?? "Desconocido"}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{tecnico?.nombre ?? "Desconocido"}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                      {p.numIncidencias}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge estado={p.estado} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/partes/${p.id}`}>
                        Abrir <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {partes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No se han encontrado partes con esos criterios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>{partes.length} partes</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled>Anterior</Button>
          <Button variant="ghost" size="sm" disabled>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
