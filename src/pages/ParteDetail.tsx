import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Calendar, FileText, Hash, MapPin, User, Loader2, ImageIcon } from "lucide-react";
import { usePartes, useIncidencias, useCentros, useUsuarios, useFotos } from "@/hooks/use-data";
import { useMemo } from "react";
import { formatFechaES } from "@/utils";

export default function ParteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: partes = [], isLoading: loadingPartes } = usePartes();
  const { data: centros = [], isLoading: loadingCentros } = useCentros();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuarios();
  
  const parte = useMemo(() => partes.find((p) => p.id === id), [partes, id]);
  const { data: inc = [], isLoading: loadingInc } = useIncidencias(parte?.id);
  const { data: fotos = [], isLoading: loadingFotos } = useFotos(parte?.id);

  if (loadingPartes || loadingCentros || loadingUsuarios || loadingFotos || (loadingInc && inc.length === 0)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!parte) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Parte no encontrado.</p>
        <Button variant="link" onClick={() => navigate("/partes")}>Volver al listado</Button>
      </div>
    );
  }

  const centro = centros.find(c => c.id === parte.centroId);
  const tecnico = usuarios.find(u => u.id === parte.tecnicoId);

  const flow = [
    { key: "Recibido", done: true },
    { key: "OCR procesado", done: true },
    { key: "En revisión", done: parte.estado !== "borrador" },
    { key: "Listo SIEC", done: ["procesado","enviado","completado"].includes(parte.estado) },
    { key: "Integrado", done: ["enviado","completado"].includes(parte.estado) },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 -ml-2">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
      </Button>

      <PageHeader
        eyebrow={`Parte ${parte.codigo}`}
        title={centro?.nombre || "Cargando..."}
        subtitle={parte.notas ?? "Sin notas adicionales."}
        actions={
          <>
            <StatusBadge estado={parte.estado} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info general */}
        <div className="surface-card p-6 lg:col-span-1">
          <h3 className="font-display text-base font-semibold mb-4">Información general</h3>
          <dl className="space-y-3 text-sm">
            {[
              { icon: Hash, label: "Código", val: parte.codigo },
              { icon: Calendar, label: "Fecha", val: formatFechaES(parte.fecha) },
              { icon: Building2, label: "Centro", val: centro?.nombre || "—" },
              { icon: User, label: "Técnico", val: tecnico?.nombre || "—" },
              { icon: FileText, label: "Incidencias", val: String(parte.numIncidencias) },
              { icon: MapPin, label: "Ubicación", val: centro?.ciudad || "España" },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium text-foreground">{row.val}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Flujo */}
        <div className="surface-card p-6 lg:col-span-2">
          <h3 className="font-display text-base font-semibold mb-5">Estado del proceso</h3>
          <div className="relative">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />
            <div className="relative grid grid-cols-5 gap-2">
              {flow.map((s, idx) => (
                <div key={s.key} className="flex flex-col items-center text-center">
                  <div className={
                    "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold " +
                    (s.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground")
                  }>
                    {idx + 1}
                  </div>
                  <p className={"mt-2 text-xs font-medium " + (s.done ? "text-foreground" : "text-muted-foreground")}>
                    {s.key}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Incidencias asociadas ({inc.length})</h4>
              <Button asChild variant="ghost" size="sm">
                <Link to="/partes">Abrir partes</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {inc.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold">
                    #{i.linea}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{i.textoCorregido}</p>
                    <p className="text-xs text-muted-foreground truncate">{i.tema} · {i.categoria} · {i.grupo}</p>
                  </div>
                  <StatusBadge estado={i.estado} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Fotos del parte</h3>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" /> {fotos.length}
          </span>
        </div>
        {fotos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fotos.map((foto) => (
              <figure key={foto.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <img src={foto.url} alt={foto.descripcion || `Foto del parte ${parte.codigo}`} className="aspect-video w-full object-cover" loading="lazy" />
                {foto.descripcion && <figcaption className="px-3 py-2 text-xs text-muted-foreground">{foto.descripcion}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay fotos registradas en Supabase para este parte.</p>
        )}
      </section>
    </div>
  );
}
