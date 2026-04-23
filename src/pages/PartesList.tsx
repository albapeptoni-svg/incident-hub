import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { PartesFilters } from "@/components/incidencias/PartesFilters";
import { PartesTable } from "@/components/incidencias/PartesTable";
import { usePartes, useCentros } from "@/hooks/use-data";
import { usuarios } from "@/mocks"; // Still using mock for users as we haven't implemented useUsers hook yet

export default function PartesList() {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("todos");

  const { data: partes = [], isLoading: loadingPartes } = usePartes();
  const { data: centros = [], isLoading: loadingCentros } = useCentros();

  const filtered = useMemo(() => {
    return partes.filter((p) => {
      const centro = centros.find(c => c.id === p.centroId);
      const tecnico = usuarios.find(u => u.id === p.tecnicoId);
      
      const matchesQ = !q ||
        p.codigo.toLowerCase().includes(q.toLowerCase()) ||
        centro?.nombre.toLowerCase().includes(q.toLowerCase()) ||
        tecnico?.nombre.toLowerCase().includes(q.toLowerCase());
      const matchesE = estado === "todos" || p.estado === estado;
      return matchesQ && matchesE;
    });
  }, [q, estado, partes, centros]);

  if (loadingPartes || loadingCentros) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      <PartesFilters 
        q={q} 
        onQChange={setQ} 
        estado={estado} 
        onEstadoChange={setEstado} 
        partes={partes} 
      />

      <PartesTable 
        partes={filtered} 
        centros={centros} 
        usuarios={usuarios} 
      />
    </div>
  );
}
