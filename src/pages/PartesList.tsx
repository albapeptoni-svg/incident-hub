import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  operationalDataService,
  type IncidenciaParte,
  type ParteOperativo,
} from "@/services/operationalData.service";

const TODOS_LOS_CENTROS = "__todos__";

function limpiarNumeracionInicial(texto: string): string {
  return texto
    .replace(/^\s*(\d+)[).\-\s]+/u, "")
    .replace(/^\s*[-•]\s+/u, "")
    .trim();
}

function normalizarFechaFiltro(fecha: string): string {
  const value = fecha.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (!match) return value;

  const [, dia, mes, anio] = match;
  const year = anio.length === 2 ? `20${anio}` : anio;
  return `${year}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

export default function PartesList() {
  const [partes, setPartes] = useState<ParteOperativo[]>([]);
  const [papelera, setPapelera] = useState<ParteOperativo[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroCentro, setFiltroCentro] = useState(TODOS_LOS_CENTROS);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    window.setTimeout(() => setMensaje(""), 3500);
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const [partesActivos, partesPapelera] = await Promise.all([
        operationalDataService.listarPartes(false),
        operationalDataService.listarPapelera(),
      ]);
      setPartes(partesActivos);
      setPapelera(partesPapelera);
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudieron cargar los partes desde Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const actualizarParte = async (
    parteId: string,
    cambios: Partial<Pick<ParteOperativo, "titulo" | "centro" | "fecha">>
  ) => {
    setPartes((prev) =>
      prev.map((parte) => (parte.id === parteId ? { ...parte, ...cambios } : parte))
    );

    try {
      await operationalDataService.actualizarParte(parteId, cambios);
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo actualizar el parte.");
      cargar();
    }
  };

  const actualizarIncidencia = async (
    parteId: string,
    incidenciaId: string,
    cambios: Partial<IncidenciaParte>
  ) => {
    const cambiosNormalizados = {
      ...cambios,
      texto:
        typeof cambios.texto === "string"
          ? limpiarNumeracionInicial(cambios.texto)
          : cambios.texto,
    };

    setPartes((prev) =>
      prev.map((parte) =>
        parte.id === parteId
          ? {
              ...parte,
              incidencias: parte.incidencias.map((inc) =>
                inc.id === incidenciaId ? { ...inc, ...cambiosNormalizados } : inc
              ),
            }
          : parte
      )
    );

    try {
      await operationalDataService.actualizarIncidencia(incidenciaId, cambiosNormalizados);
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo actualizar la incidencia.");
      cargar();
    }
  };

  const eliminarParte = async (id: string) => {
    const confirmar = window.confirm("¿Mover este parte a la papelera?");
    if (!confirmar) return;

    try {
      await operationalDataService.moverParteAPapelera(id);
      await cargar();
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo mover el parte a la papelera.");
    }
  };

  const vaciarListado = async () => {
    const confirmar = window.confirm(
      "¿Mover todos los partes a la papelera? Podrás recuperarlos después."
    );
    if (!confirmar) return;

    try {
      await operationalDataService.vaciarListado();
      await cargar();
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo vaciar el listado.");
    }
  };

  const recuperarPapelera = async () => {
    if (papelera.length === 0) return;
    const confirmar = window.confirm("¿Recuperar todos los partes borrados?");
    if (!confirmar) return;

    try {
      await operationalDataService.recuperarPapelera();
      await cargar();
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo recuperar la papelera.");
    }
  };

  const enviarAlSiguientePaso = async (parte: ParteOperativo) => {
    const total = parte.incidencias.filter(
      (inc) => inc.incluirEnSIEC && inc.texto.trim() !== ""
    ).length;

    if (total === 0) {
      alert("No hay incidencias activadas para enviar al siguiente paso.");
      return;
    }

    const confirmar = window.confirm(
      `Se enviarán ${total} incidencias al siguiente paso SIEC. ¿Continuar?`
    );
    if (!confirmar) return;

    try {
      await operationalDataService.enviarParteACola(parte);
      await cargar();
      alert("Parte enviado al siguiente paso correctamente.");
    } catch (error) {
      console.error(error);
      mostrarMensaje("No se pudo enviar el parte a Cola SIEC.");
    }
  };

  const toggleExpandido = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const centrosDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          partes.map((parte) => parte.centro.trim()).filter((centro) => centro.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [partes]
  );

  const partesFiltrados = useMemo(() => {
    const fechaNormalizada = normalizarFechaFiltro(filtroFecha);
    const nombreNormalizado = filtroNombre.trim().toLocaleLowerCase("es");

    return partes.filter((parte) => {
      const coincideFecha =
        !fechaNormalizada ||
        normalizarFechaFiltro(parte.fecha) === fechaNormalizada ||
        parte.fecha.trim() === filtroFecha.trim();

      const textoBusqueda = `${parte.titulo} ${parte.centro}`.toLocaleLowerCase("es");
      const coincideNombre =
        !nombreNormalizado || textoBusqueda.includes(nombreNormalizado);

      const coincideCentro =
        filtroCentro === TODOS_LOS_CENTROS || parte.centro === filtroCentro;

      return coincideFecha && coincideNombre && coincideCentro;
    });
  }, [filtroCentro, filtroFecha, filtroNombre, partes]);

  const hayFiltrosActivos =
    filtroFecha !== "" ||
    filtroNombre.trim() !== "" ||
    filtroCentro !== TODOS_LOS_CENTROS;

  const limpiarFiltros = () => {
    setFiltroFecha("");
    setFiltroNombre("");
    setFiltroCentro(TODOS_LOS_CENTROS);
  };

  const renderParte = (parte: ParteOperativo, isHistorico: boolean) => {
    const activas = parte.incidencias.filter((inc) => inc.incluirEnSIEC).length;
    const expandido = !isHistorico || expandidos[parte.id];

    if (isHistorico && !expandido) {
      return (
        <div
          key={parte.id}
          className="rounded-xl border bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
        >
          <div>
            <h3 className="font-semibold text-slate-800">{parte.titulo}</h3>
            <p className="text-sm text-slate-500">
              {parte.centro} - {parte.fecha} | {activas} incidencias | Estado: {parte.estado}
            </p>
          </div>
          <button
            onClick={() => toggleExpandido(parte.id)}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Abrir
          </button>
        </div>
      );
    }

    return (
      <div key={parte.id} className="rounded-2xl border bg-white p-5 shadow-sm">
        {isHistorico && (
          <div className="mb-3 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-400">Parte histórico</span>
            <button
              onClick={() => toggleExpandido(parte.id)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              Contraer
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">Título</span>
            <input
              value={parte.titulo}
              onChange={(e) => actualizarParte(parte.id, { titulo: e.target.value })}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">Centro</span>
            <input
              value={parte.centro}
              onChange={(e) => actualizarParte(parte.id, { centro: e.target.value })}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">Fecha visita</span>
            <input
              value={parte.fecha}
              onChange={(e) => actualizarParte(parte.id, { fecha: e.target.value })}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
            Estado: {parte.estado}
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
            Origen: {parte.origen}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            Incidencias activas: {activas}/{parte.incidencias.length}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Incidencias del parte</h3>

          {parte.incidencias.map((incidencia, index) => (
            <div
              key={incidencia.id}
              className={`rounded-xl border p-3 ${
                incidencia.incluirEnSIEC ? "bg-white" : "bg-slate-100 opacity-70"
              }`}
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={incidencia.incluirEnSIEC}
                  onChange={(e) =>
                    actualizarIncidencia(parte.id, incidencia.id, { incluirEnSIEC: e.target.checked })
                  }
                  className="mt-3 h-5 w-5"
                  title="Incluir en SIEC"
                />

                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-600">
                    Línea {index + 1}
                  </div>
                  <textarea
                    value={incidencia.texto}
                    onChange={(e) =>
                      actualizarIncidencia(parte.id, incidencia.id, { texto: e.target.value })
                    }
                    className="min-h-[76px] w-full rounded-lg border px-3 py-2 text-slate-800"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 md:flex-row md:justify-between">
          <button
            onClick={() => eliminarParte(parte.id)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Mover a papelera
          </button>

          {!isHistorico && (
            <button
              onClick={() => enviarAlSiguientePaso(parte)}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Enviar al siguiente paso SIEC
            </button>
          )}
        </div>
      </div>
    );
  };

  const activos = partesFiltrados
    .filter((p) => p.estado === "revisado" || p.estado === "pendiente_siec" || p.estado === "preparado_siec")
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

  const historicos = partesFiltrados
    .filter((p) => p.estado === "enviado_a_siguiente_paso" || p.estado === "enviado_siec" || p.estado === "gestionado")
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Partes de trabajo
            </h1>
            <p className="mt-2 text-slate-600">
              Segunda revisión antes de crear cada incidencia en SIEC.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {papelera.length > 0 && (
              <button
                onClick={recuperarPapelera}
                className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
              >
                Recuperar borrados ({papelera.length})
              </button>
            )}

            {partes.length > 0 && (
              <button
                onClick={vaciarListado}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                Vaciar listado
              </button>
            )}
          </div>
        </div>

        {mensaje && (
          <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            {mensaje}
          </div>
        )}

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Buscar partes</h2>
              <p className="text-sm text-slate-500">
                Filtra por fecha, nombre del parte o centro.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={limpiarFiltros} disabled={!hayFiltrosActivos}>
              Limpiar filtros
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="filtro-fecha">Fecha</Label>
              <Input id="filtro-fecha" type="date" value={filtroFecha} onChange={(event) => setFiltroFecha(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filtro-nombre">Nombre</Label>
              <Input id="filtro-nombre" value={filtroNombre} onChange={(event) => setFiltroNombre(event.target.value)} placeholder="Buscar por nombre o título" />
            </div>

            <div className="space-y-1.5">
              <Label>Centro / supermercado</Label>
              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS_LOS_CENTROS}>Todos los centros</SelectItem>
                  {centrosDisponibles.map((centro) => (
                    <SelectItem key={centro} value={centro}>
                      {centro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Mostrando {partesFiltrados.length} de {partes.length} partes.
          </p>
        </section>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">Cargando partes...</p>
          </div>
        ) : partes.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">No hay partes guardados todavía.</p>
            <p className="mt-2 text-slate-500">Digitaliza un parte, revísalo y pulsa “Crear parte revisado”.</p>
          </div>
        ) : partesFiltrados.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">No hay partes que coincidan con la búsqueda</p>
            <p className="mt-2 text-slate-500">Prueba a cambiar la fecha, el nombre o el centro seleccionado.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <div>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Activos pendientes</h2>
              {activos.length === 0 ? (
                <p className="text-slate-500">No hay partes activos.</p>
              ) : (
                <div className="space-y-5">{activos.map((parte) => renderParte(parte, false))}</div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Histórico</h2>
              {historicos.length === 0 ? (
                <p className="text-slate-500">No hay partes en el histórico.</p>
              ) : (
                <div className="space-y-3">{historicos.map((parte) => renderParte(parte, true))}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
