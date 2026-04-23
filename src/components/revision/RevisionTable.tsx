import { ChevronRight } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Incidencia } from "@/types";

interface RevisionTableProps {
  items: Incidencia[];
  onUpdateItem: (id: string, patch: Partial<Incidencia>) => void;
  onEdit: (id: string) => void;
}

export function RevisionTable({ items, onUpdateItem, onEdit }: RevisionTableProps) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="w-12 px-4 py-3">SIEC</th>
              <th className="w-12 px-2 py-3">#</th>
              <th className="px-4 py-3">Texto corregido</th>
              <th className="px-4 py-3">Tema</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Estado</th>
              <th className="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={cn(
                "border-b border-border last:border-0 transition-colors",
                i.crearEnSiec ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-muted/20",
              )}>
                <td className="px-4 py-3">
                  <Checkbox
                    checked={i.crearEnSiec}
                    onCheckedChange={(v) => onUpdateItem(i.id, { crearEnSiec: !!v })}
                  />
                </td>
                <td className="px-2 py-3 font-mono text-xs text-muted-foreground">#{i.linea}</td>
                <td className="px-4 py-3 max-w-md">
                  <p className="font-medium text-foreground line-clamp-1">{i.textoCorregido}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 italic">OCR: {i.textoOcr}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{i.tema}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{i.categoria}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge estado={i.estado} /></td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(i.id)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
