import { Sparkles, FileScan, Info, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { Incidencia } from "@/types";
import { categorias, grupos, temas } from "@/mocks";

interface RevisionEditSheetProps {
  editing: Incidencia | null;
  onClose: () => void;
  onUpdateItem: (id: string, patch: Partial<Incidencia>) => void;
  onMarkAsReady: (id: string) => void;
}

export function RevisionEditSheet({ editing, onClose, onUpdateItem, onMarkAsReady }: RevisionEditSheetProps) {
  return (
    <Sheet open={!!editing} onOpenChange={(v) => !v && onClose()}>
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
                  onChange={(e) => onUpdateItem(editing.id, { textoCorregido: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={editing.tema} onValueChange={(v) => onUpdateItem(editing.id, { tema: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{temas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={editing.categoria} onValueChange={(v) => onUpdateItem(editing.id, { categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categorias.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Grupo</Label>
                  <Select value={editing.grupo} onValueChange={(v) => onUpdateItem(editing.id, { grupo: v })}>
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
                  onChange={(e) => onUpdateItem(editing.id, { descripcion: e.target.value })}
                />
              </div>

              <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="siec"
                    checked={editing.crearEnSiec}
                    onCheckedChange={(v) => onUpdateItem(editing.id, { crearEnSiec: !!v })}
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
                      onChange={(e) => onUpdateItem(editing.id, { motivoExclusion: e.target.value })}
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
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
                <Button
                  className="bg-gradient-primary text-primary-foreground"
                  onClick={() => onMarkAsReady(editing.id)}
                >
                  <CheckCheck className="mr-2 h-4 w-4" /> Marcar como lista
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
