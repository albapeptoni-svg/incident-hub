import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { partes } from "@/lib/mockData";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Filter, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const estados = ["todos", "pendiente", "revision", "procesado", "enviado", "error"] as const;

export default function PartesList() {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("todos");

  const filtered = useMemo(() => {
    return partes.filter((p) => {
      const matchesQ = !q ||
        p.codigo.toLowerCase().includes(q.toLowerCase()) ||
        p.centro.toLowerCase().includes(q.toLowerCase()) ||
        p.tecnico.toLowerCase().includes(q.toLowerCase());
      const matchesE = estado === "todos" || p.estado === estado;
      return matchesQ && matchesE;
    });
  }, [q, estado]);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Listado de partes"
        subtitle="Todos los partes recibidos desde el campo. Filtra por estado o busca por código, centro o técnico."
        actions={
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        }
      />

      {/* Filtros */}
      <div className="surface-card p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, centro o técnico..." className="h-10 pl-10" />
          </div>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-full md:w-48 h-10">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e} value={e} className="capitalize">
                  {e === "todos" ? "Todos los estados" : e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chips estado */}
        <div className="mt-3 flex flex-wrap gap-2">
          {estados.map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                estado === e
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {e === "todos" ? "Todos" : e} {e !== "todos" && (
                <span className="ml-1 opacity-70">
                  {partes.filter((p) => p.estado === e).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
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
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/20">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">{p.codigo}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.fecha}</td>
                  <td className="px-5 py-3.5 font-medium">{p.centro}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.tecnico}</td>
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
              ))}
              {filtered.length === 0 && (
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
          <span>{filtered.length} partes</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled>Anterior</Button>
            <Button variant="ghost" size="sm" disabled>Siguiente</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
