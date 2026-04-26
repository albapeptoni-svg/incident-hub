import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, FileImage, Loader2, ScanText, UploadCloud } from "lucide-react";

type OcrDetectedItem = {
  id: string;
  textoOriginal: string;
  textoCorregido: string;
  tema: string;
  categoria: string;
  grupo: string;
  confianza: number;
};

export default function OCRPartes() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<OcrDetectedItem[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setItems([]);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(String(reader.result));
    };

    reader.readAsDataURL(file);
  };

  const handleProcessOCR = async () => {
    if (!imagePreview) return;

    setProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    setItems([
      {
        id: "ocr-001",
        textoOriginal: "Luminaria parpadea en pasillo 2",
        textoCorregido: "Luminaria parpadea en pasillo 2",
        tema: "Iluminación",
        categoria: "Eléctrico",
        grupo: "Mantenimiento Correctivo",
        confianza: 0.91,
      },
      {
        id: "ocr-002",
        textoOriginal: "Puerta almacén no cierra bien",
        textoCorregido: "Puerta de almacén no cierra correctamente",
        tema: "Accesos",
        categoria: "Mecánico",
        grupo: "Mantenimiento Correctivo",
        confianza: 0.86,
      },
      {
        id: "ocr-003",
        textoOriginal: "Grifo aseo clientes pierde agua",
        textoCorregido: "Grifo del aseo de clientes pierde agua",
        tema: "General",
        categoria: "Otros",
        grupo: "Mantenimiento Correctivo",
        confianza: 0.82,
      },
    ]);

    setProcessing(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="OCR"
        title="Lectura de parte manuscrito"
        subtitle="Sube una foto del parte de trabajo para detectar puntos de incidencia antes de enviarlos a revisión."
      />

      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Modo seguro de prueba.</p>
            <p>
              En esta primera fase la foto se carga en pantalla y el OCR se simula. Después conectaremos el OCR real mediante backend seguro.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Subir foto del parte</h2>
          </div>

          <div className="space-y-3">
            <Label htmlFor="parte-foto">Foto del parte manuscrito</Label>
            <Input
              id="parte-foto"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />

            {fileName && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {fileName}
              </p>
            )}
          </div>

          {imagePreview ? (
            <div className="mt-5 overflow-hidden rounded-lg border border-border bg-muted/30">
              <img
                src={imagePreview}
                alt="Vista previa del parte"
                className="max-h-[520px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Todavía no has subido ninguna foto.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecciona una imagen del parte de trabajo.
              </p>
            </div>
          )}

          <Button
            className="mt-5 w-full bg-gradient-primary text-primary-foreground"
            disabled={!imagePreview || processing}
            onClick={handleProcessOCR}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando OCR...
              </>
            ) : (
              <>
                <ScanText className="mr-2 h-4 w-4" />
                Procesar OCR
              </>
            )}
          </Button>
        </div>

        <div className="surface-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ScanText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Puntos detectados</h2>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center">
              <p className="font-medium">Sin resultados todavía.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sube una foto y pulsa “Procesar OCR”.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="font-semibold">
                      {index + 1}. {item.textoCorregido}
                    </p>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      {Math.round(item.confianza * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Original OCR: {item.textoOriginal}
                  </p>

                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-muted-foreground">Tema</p>
                      <p className="font-semibold">{item.tema}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-muted-foreground">Categoría</p>
                      <p className="font-semibold">{item.categoria}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-muted-foreground">Grupo</p>
                      <p className="font-semibold">{item.grupo}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-sm text-info">
                Estos puntos todavía no crean incidencias reales. En el siguiente paso conectaremos este resultado con la pantalla de Revisión.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}