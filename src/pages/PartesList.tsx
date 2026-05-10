import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatFechaES } from "@/utils";
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
const ESTADOS_ACTIVOS = new Set([
  "borrador",
  "procesado",
  "en_revision",
  "aprobado",
  "listo_para_enviar",
]);
const ESTADOS_HISTORICOS = new Set([
  "enviado",
  "completado",
  "confirmado",
]);
const EXPANDED_PARTES_STORAGE_KEY = "siec-partes-expanded-state";

type ErrorSupabaseLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

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

function obtenerMensajeError(error: unknown) {
  if (error && typeof error === "object") {
    const err = error as ErrorSupabaseLike;
    return [err.message, err.code && `Código: ${err.code}`, err.details, err.hint]
      .filter(Boolean)
      .join(" | ");
  }

  return typeof error === "string" ? error : "Error desconocido.";
}

function cargarExpandidosGuardados() {
  try {
    const raw = localStorage.getItem(EXPANDED_PARTES_STORAGE_KEY);
    if (!raw) return {};
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return {};
    return ids.reduce<Record<string, boolean>>((acc, id) => {
      if (typeof id === "string" && id.trim()) acc[id] = true;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function getParteCardClass(isHistorico: boolean) {
  return isHistorico
    ? "border-green-200 bg-green-50 hover:bg-green-100/60"
    : "border-red-200 bg-red-50 hover:bg-red-100/60";
}

function getParteBadge(isHistorico: boolean) {
  return isHistorico
    ? {
        label: "Gestionado",
        className: "border-green-200 bg-green-100 text-green-700",
      }
    : {
        label: "Pendiente",
        className: "border-red-200 bg-red-100 text-red-700",
      };
}

export default function PartesList() {
  const [partes, setPartes] = useState<ParteOperativo[]>([]);
  const [papelera, setPapelera] = useState<ParteOperativo[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(cargarExpandidosGuardados);
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
      console.log("Partes cargados:", partesActivos);
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

  useEffect(() => {
    console.log("Filtros activos:", {
      fecha: filtroFecha,
      nombre: filtroNombre,
      centro: filtroCentro,
    });
  }, [filtroCentro, filtroFecha, filtroNombre]);

  useEffect(() => {
    const idsExpandidos = Object.keys(expandidos).filter((id) => expandidos[id]);
    localStorage.setItem(EXPANDED_PARTES_STORAGE_KEY, JSON.stringify(idsExpandidos));
  }, [expandidos]);

  useEffect(() => {
    if (partes.length === 0) return;
    const idsValidos = new Set(partes.map((parte) => parte.id));
    setExpandidos((prev) => {
      const siguiente = Object.fromEntries(
        Object.entries(prev).filter(([id, abierto]) => abierto && idsValidos.has(id))
      );
      if (Object.keys(siguiente).length === Object.keys(prev).length) return prev;
      return siguiente;
    });
  }, [partes]);

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
      titulo:
        typeof cambios.titulo === "string"
          ? limpiarNumeracionInicial(cambios.titulo)
          : cambios.titulo,
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
    const confirmar = window.confirm(
      "¿Eliminar este parte?\n\nEsta acción elimina el parte y sus incidencias asociadas de Supabase. No se puede deshacer."
    );
    if (!confirmar) return;

    try {
      console.log("Eliminando parte de Supabase:", id);
      await operationalDataService.moverParteAPapelera(id);
      await cargar();
    } catch (error) {
      console.error("Error eliminando parte:", error);
      mostrarMensaje(`No se pudo eliminar el parte: ${obtenerMensajeError(error)}`);
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
      console.log("Enviando parte al siguiente paso SIEC:", parte.id);
      const result = await operationalDataService.enviarParteAColaSiec(parte.id);
      await cargar();
      alert(
        result.yaEstabaEnCola
          ? "Este parte ya estaba en Cola SIEC."
          : `Parte enviado a Cola SIEC correctamente. Incidencias enviadas: ${result.incidenciasEnviadas}.`
      );
    } catch (error) {
      console.error("Error enviando parte a Cola SIEC:", error);
      const mensaje = obtenerMensajeError(error);
      mostrarMensaje(`No se pudo enviar el parte a Cola SIEC: ${mensaje}`);
      alert(`No se pudo enviar el parte a Cola SIEC: ${mensaje}`);
    }
  };

  const toggleExpandido = (id: string) => {
    console.log("Parte expandido/contraído:", id);
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
    const expandido = Boolean(expandidos[parte.id]);
    const cardClass = getParteCardClass(isHistorico);
    const badge = getParteBadge(isHistorico);

    if (!expandido) {
      return (
        <div
          key={parte.id}
          className={`rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm transition-colors ${cardClass}`}
        >
          <div>
            <span className={`mb-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            <h3 className="font-semibold text-slate-800">{parte.titulo}</h3>
            <p className="text-sm text-slate-500">
              {parte.centro} - {formatFechaES(parte.fecha)} | {activas} incidencias | Estado: {parte.estado}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleExpandido(parte.id)}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ChevronDown className="h-4 w-4" />
              Expandir
            </button>
            {!isHistorico && (
              <button
                onClick={() => enviarAlSiguientePaso(parte)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Enviar al siguiente paso SIEC
              </button>
            )}
            {!isHistorico && (
              <button
                onClick={() => eliminarParte(parte.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar parte
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={parte.id} className={`rounded-2xl border p-5 shadow-sm transition-colors ${cardClass}`}>
        <div className="mb-3 flex justify-between items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            {isHistorico && (
              <span className="inline-flex rounded-full border border-green-200 bg-white/70 px-3 py-1 text-xs font-semibold text-green-700">
                Solo lectura
              </span>
            )}
          </div>
          <button
            onClick={() => toggleExpandido(parte.id)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ChevronUp className="h-4 w-4" />
            Contraer
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">Título</span>
            <input
              value={parte.titulo}
              disabled={isHistorico}
              onChange={
                isHistorico
                  ? undefined
                  : (e) => actualizarParte(parte.id, { titulo: e.target.value })
              }
              className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">Centro</span>
            <input
              value={parte.centro}
              disabled={isHistorico}
              onChange={
                isHistorico
                  ? undefined
                  : (e) => actualizarParte(parte.id, { centro: e.target.value })
              }
              className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">Fecha visita</span>
            <input
              type="date"
              value={parte.fecha}
              disabled={isHistorico}
              onChange={
                isHistorico
                  ? undefined
                  : (e) => actualizarParte(parte.id, { fecha: e.target.value })
              }
              className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-500"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 ${isHistorico ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            Estado: {parte.estado}
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
            Origen: {parte.origen}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            Incidencias activas: {activas}/{parte.incidencias.length}
          </span>
        </div>

        {isHistorico && (
          <p className="mt-3 rounded-lg border border-green-200 bg-white/70 px-3 py-2 text-sm text-green-800">
            Histórico bloqueado. Las incidencias de un parte gestionado no se pueden modificar.
          </p>
        )}

        <div className="mt-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Incidencias del parte</h3>

          {parte.incidencias.map((incidencia, index) => (
            <div
              key={incidencia.id}
              className={`rounded-xl border p-3 ${
                incidencia.incluirEnSIEC ? "bg-white/85" : "bg-slate-100/80 opacity-80"
              }`}
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={incidencia.incluirEnSIEC}
                  disabled={isHistorico}
                  onChange={
                    isHistorico
                      ? undefined
                      : (e) =>
                          actualizarIncidencia(parte.id, incidencia.id, {
                            incluirEnSIEC: e.target.checked,
                          })
                  }
                  className="mt-3 h-5 w-5 disabled:cursor-not-allowed"
                  title="Incluir en SIEC"
                />

                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-slate-600">
                    Línea {index + 1}
                  </div>
                  <input
                    value={incidencia.titulo}
                    disabled={isHistorico}
                    onChange={
                      isHistorico
                        ? undefined
                        : (e) =>
                            actualizarIncidencia(parte.id, incidencia.id, { titulo: e.target.value })
                    }
                    className="mb-2 w-full rounded-lg border px-3 py-2 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-500"
                    placeholder="Título breve para SIEC"
                  />
                  <textarea
                    value={incidencia.texto}
                    disabled={isHistorico}
                    onChange={
                      isHistorico
                        ? undefined
                        : (e) =>
                            actualizarIncidencia(parte.id, incidencia.id, { texto: e.target.value })
                    }
                    className="min-h-[76px] w-full rounded-lg border px-3 py-2 text-slate-800 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 md:flex-row md:justify-between">
          {!isHistorico ? (
            <button
              onClick={() => eliminarParte(parte.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar parte
            </button>
          ) : (
            <span className="text-sm font-medium text-green-700">Parte histórico en solo lectura</span>
          )}

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
    .filter((p) => ESTADOS_ACTIVOS.has(p.estado || ""))
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

  const historicos = partesFiltrados
    .filter((p) => ESTADOS_HISTORICOS.has(p.estado || ""))
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No hay partes activos pendientes.
                </div>
              ) : (
                <div className="space-y-5">{activos.map((parte) => renderParte(parte, false))}</div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Histórico</h2>
              {historicos.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Todavía no hay partes en el histórico.
                </div>
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
