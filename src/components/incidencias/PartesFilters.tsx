import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils";
import { Parte, EstadoParte } from "@/types";

const estados: (EstadoParte | "todos")[] = [
  "todos",
  "borrador",
  "procesado",
  "en_revision",
  "aprobado",
  "listo_para_enviar",
  "enviado",
  "completado",
  "error"
];

interface PartesFiltersProps {
  q: string;
  onQChange: (val: string) => void;
  estado: string;
  onEstadoChange: (val: string) => void;
  partes: Parte[];
}

export function PartesFilters({ q, onQChange, estado, onEstadoChange, partes }: PartesFiltersProps) {
  return (
    <div className="surface-card p-4 mb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => onQChange(e.target.value)} placeholder="Buscar por código..." className="h-10 pl-10" />
        </div>
        <Select value={estado} onValueChange={onEstadoChange}>
          <SelectTrigger className="w-full md:w-48 h-10">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {estados.map((e) => (
              <SelectItem key={e} value={e} className="capitalize">
                {e === "todos" ? "Todos los estados" : e.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {estados.map((e) => (
          <button
            key={e}
            onClick={() => onEstadoChange(e)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
              estado === e
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {e === "todos" ? "Todos" : e.replace("_", " ")} {e !== "todos" && (
              <span className="ml-1 opacity-70">
                {partes.filter((p) => p.estado === e).length}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
