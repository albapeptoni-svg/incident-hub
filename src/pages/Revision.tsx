import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { categorias, grupos, incidencias as initial, partes, temas } from "@/lib/mockData";
import type { Incidencia } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Send, Search, X, FileScan, CheckCheck,
  AlertTriangle, Info, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Revision() {
  const { toast } = useToast();
  const [items, setItems] = useState<Incidencia[]>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const seleccionadas = items.filter((i) => i.crearEnSiec).length;
  const filtered = useMemo(() =>
    items.filter((i) =>
      !q ||
      i.textoCorregido.toLowerCase().includes(q.toLowerCase()) ||
      i.tema.toLowerCase().includes(q.toLowerCase()) ||
      i.categoria.toLowerCase().includes(q.toLowerCase()),
    ), [items, q]);

  const parte = partes[0];
  const editing = items.find((i) => i.id === open) ?? null;

  const updateItem = (id: string, patch: Partial<Incidencia>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const toggleAll = (val: boolean) => {
    setItems((prev) => prev.map((i) => i.estado === "excluida" ? i : { ...i, crearEnSiec: val }));
  };

  const handleSend = () => {
    toast({
      title: "Lote preparado para SIEC",
      description: `${seleccionadas} incidencias añadidas a la cola de envío. (Demo visual)`,
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow={`Parte ${parte.codigo} · ${parte.centro}`}
        title="Revisión de incidencias"
        subtitle="Valida el OCR, corrige campos y selecciona qué incidencias se enviarán a SIEC."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
              <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
              <X className="mr-2 h-4 w-4" /> Desmarcar
            </Button>
            <Button onClick={handleSend} className="bg-gradient-primary text-primary-foreground shadow-md">
              <Send className="mr-2 h-4 w-4" /> Enviar a SIEC ({seleccionadas})
            </Button>
          </>
        }
      />

      {/* Resumen barra */}
      <div className="surface-card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: items.length, icon: FileScan, color: "text-foreground bg-muted" },
            { label: "Listas", value: items.filter((i) => i.estado === "lista").length, icon: CheckCheck, color: "text-success bg-success/10" },
            { label: "En revisión", value: items.filter((i) => ["revision","pendiente"].includes(i.estado)).length, icon: AlertTriangle, color: "text-warning bg-warning/10" },
            { label: "A enviar SIEC", value: seleccionadas, icon: Send, color: "text-primary bg-primary/10" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", s.color)}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-lg font-bold leading-none">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar texto, tema, categoría..." className="h-10 pl-10" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} resultados</p>
      </div>

      {/* Tabla principal */}
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
              {filtered.map((i) => (
                <tr key={i.id} className={cn(
                  "border-b border-border last:border-0 transition-colors",
                  i.crearEnSiec ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-muted/20",
                )}>
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={i.crearEnSiec}
                      onCheckedChange={(v) => updateItem(i.id, { crearEnSiec: !!v })}
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
                    <Button variant="ghost" size="sm" onClick={() => setOpen(i.id)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel lateral edición */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {editing && (
            <>
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    Línea #{editing.linea}
                  </span>
                  <StatusBadge estado={editing.estado} />
                </div>
                <SheetTitle className="font-display text-xl">Edición de incidencia</SheetTitle>
                <SheetDescription>
                  Revisa el texto OCR y ajusta los campos antes de enviar a SIEC.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* OCR original */}
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileScan className="h-3 w-3" /> Texto OCR original
                  </div>
                  <p className="text-sm italic text-muted-foreground">{editing.textoOcr}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corregido" className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Texto corregido
                  </Label>
                  <Textarea
                    id="corregido"
                    rows={3}
                    value={editing.textoCorregido}
                    onChange={(e) => updateItem(editing.id, { textoCorregido: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select value={editing.tema} onValueChange={(v) => updateItem(editing.id, { tema: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{temas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={editing.categoria} onValueChange={(v) => updateItem(editing.id, { categoria: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categorias.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Grupo</Label>
                    <Select value={editing.grupo} onValueChange={(v) => updateItem(editing.id, { grupo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{grupos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Descripción</Label>
                  <Textarea
                    id="desc"
                    rows={4}
                    value={editing.descripcion}
                    onChange={(e) => updateItem(editing.id, { descripcion: e.target.value })}
                  />
                </div>

                <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="siec"
                      checked={editing.crearEnSiec}
                      onCheckedChange={(v) => updateItem(editing.id, { crearEnSiec: !!v })}
                    />
                    <Label htmlFor="siec" className="cursor-pointer font-semibold">
                      Crear esta incidencia en SIEC
                    </Label>
                  </div>
                  {!editing.crearEnSiec && (
                    <div className="space-y-2 pl-7">
                      <Label htmlFor="motivo" className="text-xs font-medium text-muted-foreground">Motivo de exclusión</Label>
                      <Input
                        id="motivo"
                        value={editing.motivoExclusion ?? ""}
                        onChange={(e) => updateItem(editing.id, { motivoExclusion: e.target.value })}
                        placeholder="Ej: comentario informativo, duplicado, etc."
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-xs text-info">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Los cambios se guardan automáticamente en este prototipo. La integración real con SIEC se conectará en la siguiente fase.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => setOpen(null)}>Cerrar</Button>
                  <Button
                    className="bg-gradient-primary text-primary-foreground"
                    onClick={() => { updateItem(editing.id, { estado: "lista" }); setOpen(null); toast({ title: "Incidencia marcada como lista" }); }}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" /> Marcar como lista
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
