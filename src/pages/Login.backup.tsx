import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import logoLcc from "@/assets/logo-lcc.png";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isSupabaseConfigured) {
      toast({
        variant: "destructive",
        title: "Supabase no está configurado",
        description: "Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno.",
      });
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem("siec-remember-session", rememberSession ? "true" : "false");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error de acceso",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente.",
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: "No se pudo iniciar sesión.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-hero" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-primary p-12 text-primary-foreground">
          <div className="flex items-center gap-4">
            <img src={logoLcc} alt="SIEC Flow AI" style={{ height: "5.5rem" }} />
            <div>
              <p className="text-3xl font-bold">SIEC Flow AI</p>
              <p className="text-xs uppercase">Centro de Control</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold">
            Control inteligente de incidencias antes de SIEC
          </h2>
        </div>

        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">

            <h1 className="text-3xl font-bold mb-6">Iniciar sesión</h1>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* EMAIL */}
              <div>
                <Label htmlFor="email">Correo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />

                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* CHECKBOX */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberSession}
                  onCheckedChange={(checked) => setRememberSession(checked === true)}
                />
                <Label htmlFor="remember">Mantener sesión</Label>
              </div>

              {/* BOTÓN */}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : "Acceder"}
              </Button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
