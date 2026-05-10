import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  analizarParteConGemini,
  generarTituloFallback,
  normalizarTituloIncidencia,
} from "@/services/geminiParteService";
import { useAuth } from "@/hooks/useAuth";
import { operationalDataService } from "@/services/operationalData.service";
import { SAFE_MESSAGES, getSafeUserMessage, logTechnicalError } from "@/lib/safeError";

type IncidenciaRevision = {
  id: number;
  titulo: string;
  texto: string;
  incluirEnSIEC: boolean;
  grupo?: string;
};

type ResultadoGemini = {
  centro?: string;
  fecha_visita?: string;
  incidencias?: any[];
};

const STORAGE_KEY = "partes-ia-revision-actual";
const BASE_IMAGE_WIDTH = 180;

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

function normalizarFechaInput(value?: string | null) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!match) return text;

  const [, day, month, year] = match;
  return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export default function OCRPartes() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [centro, setCentro] = useState("");
  const [fechaVisita, setFechaVisita] = useState("");
  const [incidencias, setIncidencias] = useState<IncidenciaRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      setCentro(data.centro || "");
      setFechaVisita(normalizarFechaInput(data.fechaVisita));
      setIncidencias(
        Array.isArray(data.incidencias)
          ? data.incidencias
              .map((inc: any, index: number) => {
                const texto = typeof inc?.texto === "string" ? inc.texto : "";
                const titulo = normalizarTituloIncidencia(
                  typeof inc?.titulo === "string" ? inc.titulo : "",
                  texto
                );

                return {
                  id: typeof inc?.id === "number" ? inc.id : Date.now() + index,
                  titulo,
                  texto,
                  incluirEnSIEC: inc?.incluirEnSIEC !== false,
                  grupo: typeof inc?.grupo === "string" ? inc.grupo : undefined,
                };
              })
              .filter((inc) => inc.texto.trim() !== "")
          : []
      );
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
    setZoom(1);

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
      setFechaVisita(normalizarFechaInput(data.fecha_visita));

      const nuevasIncidencias = (data.incidencias || [])
        .map((item: any, index: number) => {
          let textoBruto = "";
          let tituloBruto = "";
          let incluir = true;

          if (typeof item === "string") {
            textoBruto = item;
          } else if (item && typeof item === "object") {
            textoBruto = item.texto || item.descripcion || item.titulo || "";
            tituloBruto = item.titulo || "";

            if (item.incluirEnSIEC !== undefined) {
              incluir = Boolean(item.incluirEnSIEC);
            }
          }

          const texto = typeof textoBruto === "string"
            ? corregirAcentosBasicos(textoBruto.trim())
            : "";
          const titulo = normalizarTituloIncidencia(
            typeof tituloBruto === "string" ? corregirAcentosBasicos(tituloBruto.trim()) : "",
            texto
          );

          return {
            id: Date.now() + index,
            titulo,
            texto,
            incluirEnSIEC: incluir,
            grupo: typeof item?.grupo === "string" ? item.grupo : undefined,
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
    } catch (err: unknown) {
      logTechnicalError("OCR Gemini analysis failed", err);
      setError(getSafeUserMessage(err, SAFE_MESSAGES.ocr));
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
    setZoom(1);
    setCentro("");
    setFechaVisita("");
    setIncidencias([]);
    setError("");
    setLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

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
            titulo: normalizarTituloIncidencia(inc.titulo, inc.texto),
            texto: inc.texto.trim(),
            incluirEnSIEC: inc.incluirEnSIEC,
            grupo: inc.grupo,
          })),
      });

      alert("Parte revisado creado correctamente.");
      limpiarRevision();
    } catch (error) {
      logTechnicalError("Reviewed OCR part save failed", error);
      alert(getSafeUserMessage(error, SAFE_MESSAGES.generic));
    }
  };

  const cambiarTexto = (id: number, nuevoTexto: string) => {
    setIncidencias((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              texto: nuevoTexto,
              titulo: inc.titulo.trim() ? inc.titulo : generarTituloFallback(nuevoTexto),
            }
          : inc
      )
    );
  };

  const cambiarTitulo = (id: number, nuevoTitulo: string) => {
    setIncidencias((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, titulo: nuevoTitulo } : inc
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

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 5));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

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
              ref={fileInputRef}
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
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Parte escaneado
                </h2>
                <p className="text-sm text-slate-500">
                  Previsualización del parte
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={zoomOut}
                  aria-label="Reducir zoom"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={resetZoom}
                  aria-label="Restablecer zoom"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Vista inicial
                </button>

                <button
                  type="button"
                  onClick={zoomIn}
                  aria-label="Ampliar zoom"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  disabled={zoom >= 5}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-xl border bg-slate-50 p-3">
              <div
                className="mx-auto"
                style={{
                  width: `${BASE_IMAGE_WIDTH * zoom}px`,
                  maxWidth: zoom === 1 ? "100%" : "none",
                }}
              >
                <img
                  src={preview}
                  alt="Parte cargado para OCR"
                  className="block h-auto w-full rounded-lg bg-white"
                />
              </div>
            </div>
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
                  type="date"
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
                  value={inc.titulo}
                  onChange={(e) => cambiarTitulo(inc.id, e.target.value)}
                  className="mb-2 w-full rounded-lg border bg-white p-3 text-sm font-semibold leading-relaxed"
                  rows={1}
                  placeholder="Título breve para SIEC"
                />

                <textarea
                  value={inc.texto}
                  onChange={(e) => cambiarTexto(inc.id, e.target.value)}
                  className="w-full rounded-lg border bg-white p-3 text-sm leading-relaxed"
                  placeholder="Texto completo original para SIEC"
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
                  incidencias: incidenciasAEnviar.map((i) => ({
                    id: i.id,
                    titulo: normalizarTituloIncidencia(i.titulo, i.texto),
                    texto: typeof i.texto === "string" ? i.texto.trim() : "",
                    incluirEnSIEC: i.incluirEnSIEC,
                  })),
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
