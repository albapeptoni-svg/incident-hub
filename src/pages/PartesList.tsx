import { useEffect, useState } from "react";

type IncidenciaParte = {
  id: string;
  texto: string;
  incluirEnSIEC: boolean;
};

type ParteGuardado = {
  id: string;
  titulo: string;
  centro: string;
  fecha: string;
  incidencias: IncidenciaParte[];
  origen?: string;
  estado?: string;
  creadoEn: string;
  enviadoEn?: string;
};

type IncidenciaColaSIEC = {
  id: string;
  parteId: string;
  parteTitulo: string;
  centro: string;
  fecha: string;
  descripcion: string;
  estado: "pendiente_siec";
  origen: "parte_trabajo_ocr";
  creadoEn: string;
};

const PARTES_GUARDADOS_KEY = "partes_guardados";
const PARTES_PAPELERA_KEY = "partes_guardados_papelera";
const COLA_SIEC_KEY = "cola_siec_pendiente";

function crearId() {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function limpiarNumeracionInicial(texto: string): string {
  return texto
    .replace(/^\s*(\d+)[\).\-\s]+/u, "")
    .replace(/^\s*[-•]\s+/u, "")
    .trim();
}

function normalizarIncidencias(raw: unknown): IncidenciaParte[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): IncidenciaParte | null => {
      if (typeof item === "string") {
        const texto = limpiarNumeracionInicial(item);
        if (!texto) return null;

        return {
          id: crearId(),
          texto,
          incluirEnSIEC: true,
        };
      }

      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const texto = limpiarNumeracionInicial(String(obj.texto ?? ""));
        if (!texto) return null;

        return {
          id: String(obj.id ?? crearId()),
          texto,
          incluirEnSIEC:
            typeof obj.incluirEnSIEC === "boolean"
              ? obj.incluirEnSIEC
              : true,
        };
      }

      return null;
    })
    .filter((item): item is IncidenciaParte => item !== null);
}

function cargarPartesGuardados(): ParteGuardado[] {
  try {
    const raw = localStorage.getItem(PARTES_GUARDADOS_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((parte): ParteGuardado | null => {
        if (!parte || typeof parte !== "object") return null;

        const obj = parte as Record<string, unknown>;

        const centro = String(obj.centro ?? "").trim();
        const fecha = String(obj.fecha ?? "").trim();
        const incidencias = normalizarIncidencias(obj.incidencias);

        if (!centro || !fecha || incidencias.length === 0) return null;

        return {
          id: String(obj.id ?? crearId()),
          titulo:
            typeof obj.titulo === "string" && obj.titulo.trim()
              ? obj.titulo.trim()
              : `Parte ${centro} - ${fecha}`,
          centro,
          fecha,
          incidencias,
          origen:
            typeof obj.origen === "string" ? obj.origen : "OCR/Gemini",
          estado:
            typeof obj.estado === "string" ? obj.estado : "revisado",
          creadoEn:
            typeof obj.creadoEn === "string"
              ? obj.creadoEn
              : new Date().toISOString(),
          enviadoEn:
            typeof obj.enviadoEn === "string" ? obj.enviadoEn : undefined,
        };
      })
      .filter((parte): parte is ParteGuardado => parte !== null);
  } catch (error) {
    console.error("No se pudieron cargar los partes guardados:", error);
    return [];
  }
}

function guardarPartesGuardados(partes: ParteGuardado[]) {
  localStorage.setItem(PARTES_GUARDADOS_KEY, JSON.stringify(partes));
}

function cargarPapelera(): ParteGuardado[] {
  try {
    const raw = localStorage.getItem(PARTES_PAPELERA_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarPapelera(partes: ParteGuardado[]) {
  localStorage.setItem(PARTES_PAPELERA_KEY, JSON.stringify(partes));
}

function cargarColaSIEC(): IncidenciaColaSIEC[] {
  try {
    const raw = localStorage.getItem(COLA_SIEC_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarColaSIEC(cola: IncidenciaColaSIEC[]) {
  localStorage.setItem(COLA_SIEC_KEY, JSON.stringify(cola));
}

export default function PartesList() {
  const [partes, setPartes] = useState<ParteGuardado[]>([]);
  const [papelera, setPapelera] = useState<ParteGuardado[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const cargados = cargarPartesGuardados();
    setPartes(cargados);
    setPapelera(cargarPapelera());

    if (cargados.length > 0) {
      guardarPartesGuardados(cargados);
    }
  }, []);

  const actualizarParte = (
    parteId: string,
    cambios: Partial<ParteGuardado>
  ) => {
    setPartes((prev) => {
      const actualizados = prev.map((parte) =>
        parte.id === parteId ? { ...parte, ...cambios } : parte
      );

      guardarPartesGuardados(actualizados);
      return actualizados;
    });
  };

  const actualizarIncidencia = (
    parteId: string,
    incidenciaId: string,
    cambios: Partial<IncidenciaParte>
  ) => {
    setPartes((prev) => {
      const actualizados = prev.map((parte) => {
        if (parte.id !== parteId) return parte;

        return {
          ...parte,
          incidencias: parte.incidencias.map((inc) =>
            inc.id === incidenciaId
              ? {
                  ...inc,
                  ...cambios,
                  texto:
                    typeof cambios.texto === "string"
                      ? limpiarNumeracionInicial(cambios.texto)
                      : inc.texto,
                }
              : inc
          ),
        };
      });

      guardarPartesGuardados(actualizados);
      return actualizados;
    });
  };

  const eliminarParte = (id: string) => {
    const confirmar = window.confirm(
      "¿Mover este parte a la papelera?"
    );
    if (!confirmar) return;

    const parteEliminado = partes.find((parte) => parte.id === id);
    if (!parteEliminado) return;

    const actualizados = partes.filter((parte) => parte.id !== id);
    const nuevaPapelera = [parteEliminado, ...papelera];

    setPartes(actualizados);
    setPapelera(nuevaPapelera);

    guardarPartesGuardados(actualizados);
    guardarPapelera(nuevaPapelera);
  };

  const vaciarListado = () => {
    const confirmar = window.confirm(
      "¿Mover todos los partes a la papelera? Podrás recuperarlos después."
    );
    if (!confirmar) return;

    const nuevaPapelera = [...partes, ...papelera];

    setPartes([]);
    setPapelera(nuevaPapelera);

    localStorage.removeItem(PARTES_GUARDADOS_KEY);
    guardarPapelera(nuevaPapelera);
  };

  const recuperarPapelera = () => {
    if (papelera.length === 0) return;

    const confirmar = window.confirm(
      "¿Recuperar todos los partes borrados?"
    );
    if (!confirmar) return;

    const recuperados = [...papelera, ...partes];

    setPartes(recuperados);
    setPapelera([]);

    guardarPartesGuardados(recuperados);
    localStorage.removeItem(PARTES_PAPELERA_KEY);
  };

  const enviarAlSiguientePaso = (parte: ParteGuardado) => {
    const incidenciasSeleccionadas = parte.incidencias
      .filter((inc) => inc.incluirEnSIEC && inc.texto.trim() !== "")
      .map((inc) => limpiarNumeracionInicial(inc.texto));

    if (incidenciasSeleccionadas.length === 0) {
      alert("No hay incidencias activadas para enviar al siguiente paso.");
      return;
    }

    const confirmar = window.confirm(
      `Se enviarán ${incidenciasSeleccionadas.length} incidencias al siguiente paso SIEC. ¿Continuar?`
    );

    if (!confirmar) return;

    const nuevasIncidencias: IncidenciaColaSIEC[] =
      incidenciasSeleccionadas.map((descripcion) => ({
        id: crearId(),
        parteId: parte.id,
        parteTitulo: parte.titulo,
        centro: parte.centro,
        fecha: parte.fecha,
        descripcion,
        estado: "pendiente_siec",
        origen: "parte_trabajo_ocr",
        creadoEn: new Date().toISOString(),
      }));

    const colaActual = cargarColaSIEC();
    guardarColaSIEC([...colaActual, ...nuevasIncidencias]);

    actualizarParte(parte.id, {
      estado: "enviado_a_siguiente_paso",
      enviadoEn: new Date().toISOString(),
    });

    alert("Parte enviado al siguiente paso correctamente.");
  };

  const toggleExpandido = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderParte = (parte: ParteGuardado, isHistorico: boolean) => {
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

          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            Creado: {new Date(parte.creadoEn).toLocaleString("es-ES")}
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

  const activos = partes
    .filter((p) => p.estado === "revisado" || p.estado === "pendiente_siec" || p.estado === "preparado_siec")
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

  const historicos = partes
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

        {partes.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">
              No hay partes guardados todavía.
            </p>
            <p className="mt-2 text-slate-500">
              Digitaliza un parte, revísalo y pulsa “Crear parte revisado”.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            <div>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Activos pendientes</h2>
              {activos.length === 0 ? (
                <p className="text-slate-500">No hay partes activos.</p>
              ) : (
                <div className="space-y-5">
                  {activos.map((parte) => renderParte(parte, false))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Histórico</h2>
              {historicos.length === 0 ? (
                <p className="text-slate-500">No hay partes en el histórico.</p>
              ) : (
                <div className="space-y-3">
                  {historicos.map((parte) => renderParte(parte, true))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}