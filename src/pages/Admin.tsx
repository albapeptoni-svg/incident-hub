import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Save, Settings2, Shield, UserPlus, Wrench, Trash2 } from "lucide-react";
import {
  operationalDataService,
  type AppConfig,
} from "@/services/operationalData.service";
import { logTechnicalError } from "@/lib/safeError";

type Rol = "admin" | "tecnico";

type ProfileRow = {
  id: string;
  nombre: string | null;
  email: string;
  rol: Rol;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
};

const DEFAULT_CONFIG: AppConfig = {
  nombreEmpresa: "",
  entorno: "pruebas",
  modoSiec: "simulado",
  emailResponsable: "",
};

export default function Admin() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [mensaje, setMensaje] = useState("");

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    window.setTimeout(() => setMensaje(""), 3500);
  };

  const cargarProfiles = async () => {
    if (!isSupabaseConfigured) return;

    setLoadingProfiles(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,nombre,email,rol,activo,creado_en,actualizado_en")
      .order("creado_en", { ascending: false });

    if (error) {
      logTechnicalError("Admin profiles load failed", error);
      mostrarMensaje("No se pudieron cargar los profiles.");
    } else {
      setProfiles((data || []) as ProfileRow[]);
    }

    setLoadingProfiles(false);
  };

  const cargarConfig = async () => {
    try {
      setConfig(await operationalDataService.getAppConfig());
    } catch (error) {
      logTechnicalError("Admin config load failed", error);
      mostrarMensaje("No se pudo cargar la configuración.");
    }
  };

  useEffect(() => {
    cargarConfig();
    cargarProfiles();
  }, []);

  const actualizarProfile = async (id: string, patch: Partial<Pick<ProfileRow, "rol" | "activo">>) => {
    const anteriores = profiles;
    const actualizados = profiles.map((profile) =>
      profile.id === id ? { ...profile, ...patch } : profile
    );

    setProfiles(actualizados);

    const { error } = await supabase
      .from("profiles")
      .update({ ...patch, actualizado_en: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      logTechnicalError("Admin profile update failed", error);
      setProfiles(anteriores);
      mostrarMensaje("No se pudo actualizar el profile.");
    } else {
      mostrarMensaje("Profile actualizado.");
    }
  };

  const guardarConfiguracion = async () => {
    try {
      await operationalDataService.saveAppConfig(config);
      mostrarMensaje("Configuración guardada.");
    } catch (error) {
      logTechnicalError("Admin config save failed", error);
      mostrarMensaje("No se pudo guardar la configuración.");
    }
  };

  const limpiarDatosPrueba = async () => {
    const confirmar = window.confirm(
      "¿Limpiar partes, incidencias, cola e historial de Supabase? Usuarios reales, perfiles, roles y configuración se conservarán."
    );
    if (!confirmar) return;

    try {
      await operationalDataService.resetOperationalTestingData();
      mostrarMensaje("Datos de prueba eliminados de Supabase.");
    } catch (error) {
      logTechnicalError("Admin testing data cleanup failed", error);
      mostrarMensaje("No se pudieron limpiar los datos de prueba. Revisa permisos de admin y SQL 005.");
    }
  };

  const restablecerConfiguracion = async () => {
    const confirmar = window.confirm("¿Restablecer la configuración general?");
    if (!confirmar) return;

    try {
      await operationalDataService.saveAppConfig(DEFAULT_CONFIG);
      setConfig(DEFAULT_CONFIG);
      mostrarMensaje("Configuración restablecida.");
    } catch (error) {
      logTechnicalError("Admin config reset failed", error);
      mostrarMensaje("No se pudo restablecer la configuración.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Seguridad y configuración"
        subtitle="Usuarios reales de Supabase Auth, roles de acceso y ajustes de operación en Supabase."
      />

      {mensaje && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {mensaje}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="surface-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Profiles</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Perfiles vinculados a usuarios de Supabase Auth.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={cargarProfiles} disabled={loadingProfiles}>
              Actualizar
            </Button>
          </div>

          {!isSupabaseConfigured ? (
            <div className="p-8 text-center">
              <p className="font-display text-lg font-semibold">Supabase no está configurado.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para gestionar usuarios reales.
              </p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-display text-lg font-semibold">No hay profiles visibles.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Crea usuarios en Supabase Auth y ejecuta el SQL de profiles para generar perfiles.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Creado</th>
                    <th className="px-5 py-3">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{profile.nombre || profile.email}</p>
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={profile.rol}
                          onChange={(event) =>
                            actualizarProfile(profile.id, { rol: event.target.value as Rol })
                          }
                          className={cn(
                            "h-9 rounded-md border border-input bg-background px-3 text-sm",
                            profile.rol === "admin" && "font-semibold text-primary"
                          )}
                        >
                          <option value="admin">admin</option>
                          <option value="tecnico">tecnico</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {profile.creado_en
                          ? new Date(profile.creado_en).toLocaleString("es-ES")
                          : "Sin fecha"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Switch
                          checked={profile.activo}
                          onCheckedChange={(checked) =>
                            actualizarProfile(profile.id, { activo: checked })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-border bg-muted/20 p-5">
            <div className="flex items-start gap-3">
              <UserPlus className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Alta de usuarios</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Las contraseñas no se gestionan desde el frontend. Crea usuarios desde
                  Supabase Auth &gt; Users o implementa una Edge Function segura para invitaciones.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-semibold">Configuración general</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="empresa" className="text-xs">Nombre empresa</Label>
                <Input
                  id="empresa"
                  value={config.nombreEmpresa}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, nombreEmpresa: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entorno" className="text-xs">Entorno</Label>
                <select
                  id="entorno"
                  value={config.entorno}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      entorno: event.target.value as AppConfig["entorno"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="pruebas">pruebas</option>
                  <option value="produccion">produccion</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modo-siec" className="text-xs">Modo SIEC</Label>
                <select
                  id="modo-siec"
                  value={config.modoSiec}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      modoSiec: event.target.value as AppConfig["modoSiec"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="simulado">simulado</option>
                  <option value="manual">manual</option>
                  <option value="api_futura">api_futura</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="responsable" className="text-xs">Email responsable</Label>
                <Input
                  id="responsable"
                  type="email"
                  value={config.emailResponsable ?? ""}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      emailResponsable: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={guardarConfiguracion} className="flex-1">
                  <Save className="mr-2 h-4 w-4" /> Guardar
                </Button>
                <Button variant="outline" onClick={restablecerConfiguracion} className="flex-1">
                  Restablecer configuración
                </Button>
              </div>
            </div>
          </section>

          <section className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-warning" />
              <h2 className="font-display text-base font-semibold">Mantenimiento</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Limpia datos operativos de Supabase sin borrar usuarios reales, perfiles, roles ni configuración.
            </p>

            <Button
              variant="destructive"
              className="mt-4 w-full"
              onClick={limpiarDatosPrueba}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpiar datos de prueba
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
