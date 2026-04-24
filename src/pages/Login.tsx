import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Lock, Mail, ShieldCheck, Zap, Loader2 } from "lucide-react";

import { isSupabaseConfigured } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@siecbridge.io");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isSupabaseConfigured) {
      toast({
        title: "Modo Preview (Mock)",
        description: "Iniciando sesión en modo demostración.",
      });
      setTimeout(() => {
        navigate("/dashboard");
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error de acceso",
          description: error.message,
        });
      } else {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente.",
        });
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--foreground)/0.04)_1px,transparent_0)] [background-size:24px_24px]" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* Left — brand panel */}
        <div className="hidden flex-col justify-between bg-gradient-primary p-12 text-primary-foreground lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <Zap className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-lg font-bold">SIEC Bridge LCC</p>
              <p className="text-xs uppercase tracking-widest text-primary-foreground/60">Control Center</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
              Control inteligente de incidencias antes de SIEC.
            </h2>
            <p className="max-w-md text-base text-primary-foreground/70">
              Revisa, edita y envía tus partes de mantenimiento con total trazabilidad.
              Una capa de control entre tu equipo de campo y la plataforma corporativa.
            </p>
            <div className="grid gap-3 text-sm">
              {[
                "Revisión asistida con OCR",
                "Validación previa a la integración",
                "Trazabilidad completa por lote",
              ].map((t) => (
                <div key={t} className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                    <ShieldCheck className="h-3 w-3" />
                  </div>
                  <span className="text-primary-foreground/85">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-primary-foreground/50">© 2025 SIEC Bridge LCC · Plataforma interna</p>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
                  <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-display text-xl font-bold">SIEC Bridge LCC</span>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Accede a tu panel de control para revisar incidencias.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Correo corporativo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nombre@empresa.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button type="button" className="text-xs font-medium text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Mantener sesión iniciada</Label>
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="group h-11 w-full bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-md"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Acceder al panel"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-info/5 p-4 border border-info/10 text-[11px] text-muted-foreground">
              <p className="font-semibold text-info mb-1 uppercase tracking-wider">Nota de desarrollo</p>
              <p>Este sistema ahora usa <strong>Supabase Auth</strong>. Asegúrate de configurar las variables de entorno en <code>.env.local</code> y tener usuarios en tu proyecto de Supabase.</p>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Acceso restringido a personal autorizado · v2.4.1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
