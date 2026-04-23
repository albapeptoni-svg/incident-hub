import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { incidencias, partes } from "@/lib/mockData";
import { ArrowLeft, Building2, Calendar, ClipboardCheck, FileText, Hash, MapPin, User } from "lucide-react";

export default function ParteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parte = partes.find((p) => p.id === id) ?? partes[0];
  const inc = incidencias.filter((i) => i.parteId === parte.id);

  const flow = [
    { key: "Recibido", done: true },
    { key: "OCR procesado", done: true },
    { key: "En revisión", done: parte.estado !== "pendiente" },
    { key: "Listo SIEC", done: ["procesado","enviado"].includes(parte.estado) },
    { key: "Integrado", done: parte.estado === "enviado" },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 -ml-2">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
      </Button>

      <PageHeader
        eyebrow={`Parte ${parte.codigo}`}
        title={parte.centro}
        subtitle={parte.notas ?? "Sin notas adicionales."}
        actions={
          <>
            <StatusBadge estado={parte.estado} />
            <Button asChild className="bg-gradient-primary text-primary-foreground">
              <Link to={`/revision?parte=${parte.id}`}>
                <ClipboardCheck className="mr-2 h-4 w-4" /> Revisar incidencias
              </Link>
            </Button>
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
              { icon: Calendar, label: "Fecha", val: parte.fecha },
              { icon: Building2, label: "Centro", val: parte.centro },
              { icon: User, label: "Técnico", val: parte.tecnico },
              { icon: FileText, label: "Incidencias", val: String(parte.numIncidencias) },
              { icon: MapPin, label: "Ubicación", val: "Barcelona, España" },
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
                <Link to={`/revision?parte=${parte.id}`}>Abrir revisión →</Link>
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
    </div>
  );
}
