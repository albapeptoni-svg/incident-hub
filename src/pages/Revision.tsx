import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Incidencia } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ClipboardList, Search, X, CheckCheck, Loader2 } from "lucide-react";
import { RevisionStats } from "@/components/revision/RevisionStats";
import { RevisionTable } from "@/components/revision/RevisionTable";
import { RevisionEditSheet } from "@/components/revision/RevisionEditSheet";
import { useIncidencias, usePartes, useCentros } from "@/hooks/use-data";

export default function Revision() {
  const { toast } = useToast();
  const { data: allPartes = [], isLoading: loadingPartes } = usePartes();
  const { data: allCentros = [], isLoading: loadingCentros } = useCentros();

  const parte = useMemo(() => allPartes.find(p => p.estado === "en_revision") || allPartes[0], [allPartes]);
  const { data: initialIncidencias = [], isLoading: loadingIncidencias } = useIncidencias(parte?.id);

  const [items, setItems] = useState<Incidencia[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (initialIncidencias.length > 0) {
      setItems(initialIncidencias);
    }
  }, [initialIncidencias]);

  const seleccionadas = items.filter((i) => i.crearEnSiec).length;
  const filtered = useMemo(() =>
    items.filter((i) =>
      !q ||
      i.textoCorregido.toLowerCase().includes(q.toLowerCase()) ||
      i.tema.toLowerCase().includes(q.toLowerCase()) ||
      i.categoria.toLowerCase().includes(q.toLowerCase()),
    ), [items, q]);

  const centro = allCentros.find(c => c.id === parte?.centroId);
  const editing = items.find((i) => i.id === open) ?? null;

  const updateItem = (id: string, patch: Partial<Incidencia>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const toggleAll = (val: boolean) => {
    setItems((prev) => prev.map((i) => i.estado === "descartada" ? i : { ...i, crearEnSiec: val }));
  };

  const handleMarkAsReady = (id: string) => {
    updateItem(id, { estado: "aprobada" });
    setOpen(null);
    toast({ title: "Incidencia marcada como lista (aprobada)" });
  };

  const handlePrepareBatch = () => {
    toast({
      title: "Lote interno preparado",
      description: `${seleccionadas} incidencias añadidas a la cola interna para revisión y simulación. No se ha enviado nada a SIEC.`,
    });
  };

  if (loadingPartes || loadingCentros || (loadingIncidencias && items.length === 0)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!parte) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No hay partes disponibles para revisión.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Parte ${parte.codigo} · ${centro?.nombre || "..."}`}
        title="Revisión de incidencias"
        subtitle="Valida el OCR, corrige campos y selecciona qué incidencias formarán parte de un lote interno SIEC."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
              <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
              <X className="mr-2 h-4 w-4" /> Desmarcar
            </Button>
            <Button onClick={handlePrepareBatch} className="bg-gradient-primary text-primary-foreground shadow-md">
              <ClipboardList className="mr-2 h-4 w-4" /> Preparar lote SIEC ({seleccionadas})
            </Button>
          </>
        }
      />

      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">No se enviará nada a SIEC todavía.</p>
            <p>Este paso solo prepara un lote interno para revisión y simulación. El envío real será irreversible y requerirá aprobación humana.</p>
          </div>
        </div>
      </div>

      <RevisionStats items={items} seleccionadas={seleccionadas} />

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar texto, tema, categoría..." className="h-10 pl-10" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} resultados</p>
      </div>

      <RevisionTable
        items={filtered}
        onUpdateItem={updateItem}
        onEdit={setOpen}
      />

      <RevisionEditSheet
        editing={editing}
        onClose={() => setOpen(null)}
        onUpdateItem={updateItem}
        onMarkAsReady={handleMarkAsReady}
      />
    </div>
  );
}