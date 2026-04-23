import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usuarios } from "@/lib/mockData";
import { cn } from "@/utils";
import { Plus, Settings2, Shield, UserPlus } from "lucide-react";

export default function Admin() {
  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Configuración y usuarios"
        subtitle="Solo visible para administradores. Gestión de cuentas y parámetros del sistema."
        actions={<Button size="sm" className="bg-gradient-primary text-primary-foreground"><UserPlus className="mr-2 h-4 w-4" /> Nuevo usuario</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-base font-semibold">Usuarios</h3>
              <p className="text-xs text-muted-foreground">{usuarios.length} cuentas activas</p>
            </div>
            <Button variant="outline" size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Añadir</Button>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Centro</th>
                  <th className="px-5 py-3">Último acceso</th>
                  <th className="px-5 py-3">Activo</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-xs font-semibold text-primary-foreground">
                          {u.nombre.split(" ").map((s) => s[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <p className="font-medium">{u.nombre}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                        u.rol === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        <Shield className="h-3 w-3" /> {u.rol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.centro}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.ultimoAcceso}</td>
                    <td className="px-5 py-3.5"><Switch defaultChecked={u.activo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-semibold">Parámetros SIEC</h3>
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="endpoint" className="text-xs">Endpoint API</Label>
                <Input id="endpoint" defaultValue="https://api.siec.empresa.com/v2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="token" className="text-xs">Token de integración</Label>
                <Input id="token" type="password" defaultValue="••••••••••••" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Envío automático</p>
                  <p className="text-xs text-muted-foreground">Procesar cola cada 15 min</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Notificaciones email</p>
                  <p className="text-xs text-muted-foreground">Avisos de errores SIEC</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <div className="surface-card p-5 bg-gradient-primary text-primary-foreground">
            <p className="text-xs uppercase tracking-widest text-primary-foreground/60">Sistema</p>
            <p className="mt-1 font-display text-2xl font-bold">v2.4.1</p>
            <p className="mt-1 text-sm text-primary-foreground/80">Última actualización: hace 3 días</p>
          </div>
        </div>
      </div>
    </div>
  );
}
