import { useEffect, useState } from "react";
import { analizarParteConGemini } from "@/services/geminiParteService";
import { useAuth } from "@/hooks/useAuth";
import { operationalDataService } from "@/services/operationalData.service";

type IncidenciaRevision = {
  id: number;
  texto: string;
  incluirEnSIEC: boolean;
};

type ResultadoGemini = {
  centro?: string;
  fecha_visita?: string;
  incidencias?: any[];
};

type ErrorSupabaseLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

const STORAGE_KEY = "partes-ia-revision-actual";

const correcciones: Record<string, string> = {
  maquina: "máquina",
  maquinas: "máquinas",
  mecanica: "mecánica",
  mecanico: "mecánico",
  electrico: "eléctrico",
  electrica: "eléctrica",
  electricos: "eléctricos",
  electricas: "eléctricas",
  reparacion: "reparación",
  sustitucion: "sustitución",
  revision: "revisión",
  posicion: "posición",
  instalacion: "instalación",
  iluminacion: "iluminación",
  climatizacion: "climatización",
  camara: "cámara",
  camaras: "cámaras",
  almacen: "almacén",
  charcuteria: "charcutería",
  fruteria: "frutería",
  panaderia: "panadería",
  carniceria: "carnicería",
  antipatico: "antipático",
  antipanico: "antipánico",
  plastico: "plástico",
  plasticos: "plásticos",
  automatico: "automático",
  automatica: "automática",
};

function corregirAcentosBasicos(texto: string) {
  return texto
    .split(/\b/)
    .map((palabra) => {
      const clave = palabra.toLowerCase();
      const corregida = correcciones[clave];

      if (!corregida) return palabra;

      if (palabra === palabra.toUpperCase()) {
        return corregida.toUpperCase();
      }

      return corregida;
    })
    .join("");
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

export default function OCRPartes() {
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [centro, setCentro] = useState("");
  const [fechaVisita, setFechaVisita] = useState("");
  const [incidencias, setIncidencias] = useState<IncidenciaRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      setCentro(data.centro || "");
      setFechaVisita(data.fechaVisita || "");
      setIncidencias(Array.isArray(data.incidencias) ? data.incidencias : []);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const hayRevision =
      centro.trim() !== "" ||
      fechaVisita.trim() !== "" ||
      incidencias.length > 0;

    if (!hayRevision) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        centro,
        fechaVisita,
        incidencias,
      })
    );
  }, [centro, fechaVisita, incidencias]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const seleccionarArchivo = (selected: File | null) => {
    setFile(selected);
    setError("");

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (!selected) {
      setPreview(null);
      return;
    }

    setPreview(URL.createObjectURL(selected));
  };

  const analizarParte = async () => {
    if (!file) {
      setError("Selecciona una imagen nueva para analizar con Gemini.");
      return;
    }

    setLoading(true);
    setError("");
    setIncidencias([]);

    try {
      const data: ResultadoGemini = await analizarParteConGemini(file);

      setCentro(data.centro || "");
      setFechaVisita(data.fecha_visita || "");

      const nuevasIncidencias = (data.incidencias || [])
        .map((item: any, index: number) => {
          let textoBruto = "";
          let incluir = true;

          if (typeof item === "string") {
            textoBruto = item;
          } else if (item && typeof item === "object") {
            textoBruto = item.descripcion || item.titulo || "";

            if (item.incluirEnSIEC !== undefined) {
              incluir = Boolean(item.incluirEnSIEC);
            }
          }

          return {
            id: Date.now() + index,
            texto:
              typeof textoBruto === "string"
                ? corregirAcentosBasicos(textoBruto.trim())
                : "",
            incluirEnSIEC: incluir,
          };
        })
        .filter(
          (inc) =>
            typeof inc.texto === "string" && inc.texto.trim() !== ""
        );

      setIncidencias(nuevasIncidencias);

      if (nuevasIncidencias.length === 0) {
        setError("Gemini no ha detectado incidencias útiles en este parte.");
      }
    } catch (err: any) {
      setError(err?.message || "Error analizando el parte con Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const limpiarRevision = () => {
    setFile(null);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);
    setCentro("");
    setFechaVisita("");
    setIncidencias([]);
    setError("");

    localStorage.removeItem(STORAGE_KEY);
  };

  const guardarParte = async () => {
    if (!user?.id) {
      alert("Necesitas una sesión activa para crear partes.");
      return;
    }

    if (
      typeof centro !== "string" ||
      typeof fechaVisita !== "string" ||
      !centro.trim() ||
      !fechaVisita.trim()
    ) {
      alert("Centro y fecha son obligatorios.");
      return;
    }

    const incidenciasFinales = incidencias
      .filter(
        (inc) =>
          inc.incluirEnSIEC &&
          typeof inc.texto === "string" &&
          inc.texto.trim() !== ""
      )
      .map((inc) => inc.texto.trim());

    if (incidenciasFinales.length === 0) {
      alert("No hay incidencias seleccionadas.");
      return;
    }

    try {
      await operationalDataService.crearParteDesdeOcr({
        centro: centro.trim(),
        fecha: fechaVisita.trim(),
        tecnicoId: user.id,
        incidencias: incidencias
          .filter(
            (inc) =>
              typeof inc.texto === "string" && inc.texto.trim() !== ""
          )
          .map((inc) => ({
            texto: inc.texto.trim(),
            incluirEnSIEC: inc.incluirEnSIEC,
          })),
      });

      alert("Parte revisado creado correctamente.");
      limpiarRevision();
    } catch (error) {
      console.error("No se pudo guardar el parte revisado:", error);
      const mensaje = obtenerMensajeError(error);
      alert(`No se pudo guardar el parte en Supabase: ${mensaje}`);
    }
  };

  const cambiarTexto = (id: number, nuevoTexto: string) => {
    setIncidencias((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, texto: nuevoTexto } : inc
      )
    );
  };

  const cambiarEstado = (id: number, incluirEnSIEC: boolean) => {
    setIncidencias((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, incluirEnSIEC } : inc
      )
    );
  };

  const eliminarLinea = (id: number) => {
    setIncidencias((prev) => prev.filter((inc) => inc.id !== id));
  };

  const incidenciasAEnviar = incidencias.filter(
    (inc) =>
      inc.incluirEnSIEC &&
      typeof inc.texto === "string" &&
      inc.texto.trim() !== ""
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Lectura de partes con IA
          </h1>
          <p className="mt-2 text-slate-600">
            Sube una foto del parte, revisa las incidencias y marca en verde las
            que se enviarán a SIEC.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => seleccionarArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-lg border p-2"
            />

            <button
              onClick={analizarParte}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Analizando..." : "Analizar con Gemini"}
            </button>

            <button
              onClick={limpiarRevision}
              className="rounded-lg border bg-white px-5 py-2.5 font-semibold text-slate-700"
            >
              Nueva revisión
            </button>
          </div>
        </div>

        {preview && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Parte escaneado
            </h2>

            <img
              src={preview}
              alt="Parte subido"
              className="w-full max-h-[520px] object-contain rounded-lg border bg-slate-100"
            />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {(centro || fechaVisita) && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Datos detectados
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Centro
                </label>
                <input
                  value={centro}
                  onChange={(e) => setCentro(e.target.value)}
                  className="mt-1 w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">
                  Fecha visita
                </label>
                <input
                  value={fechaVisita}
                  onChange={(e) => setFechaVisita(e.target.value)}
                  className="mt-1 w-full rounded-lg border p-2"
                />
              </div>
            </div>
          </div>
        )}

        {incidencias.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Revisión de incidencias
              </h2>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {incidenciasAEnviar.length} para SIEC
              </span>
            </div>

            {incidencias.map((inc, index) => (
              <div
                key={inc.id}
                className={`rounded-xl border-2 p-3 ${
                  inc.incluirEnSIEC
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                }`}
              >
                <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span className="font-bold text-slate-800">
                    Línea {index + 1}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => cambiarEstado(inc.id, true)}
                      className={`rounded px-3 py-1 font-semibold ${
                        inc.incluirEnSIEC
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-slate-700"
                      }`}
                    >
                      ✅ SÍ
                    </button>

                    <button
                      onClick={() => cambiarEstado(inc.id, false)}
                      className={`rounded px-3 py-1 font-semibold ${
                        !inc.incluirEnSIEC
                          ? "bg-red-600 text-white"
                          : "bg-gray-200 text-slate-700"
                      }`}
                    >
                      ❌ NO
                    </button>

                    <button
                      onClick={() => eliminarLinea(inc.id)}
                      className="rounded border bg-white px-3 py-1 font-semibold text-slate-700"
                    >
                      🗑 Borrar
                    </button>
                  </div>
                </div>

                <textarea
                  value={inc.texto}
                  onChange={(e) => cambiarTexto(inc.id, e.target.value)}
                  className="w-full rounded-lg border bg-white p-3 text-sm leading-relaxed"
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {incidencias.length > 0 && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-bold text-slate-900">
              Resultado para SIEC
            </h2>

            <pre className="max-h-96 overflow-auto rounded-xl bg-black p-3 text-sm text-white">
              {JSON.stringify(
                {
                  centro,
                  fecha_visita: fechaVisita,
                  incidencias: incidenciasAEnviar.map((i) =>
                    typeof i.texto === "string" ? i.texto.trim() : ""
                  ),
                },
                null,
                2
              )}
            </pre>

            <button
              onClick={guardarParte}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700"
            >
              Crear parte revisado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
