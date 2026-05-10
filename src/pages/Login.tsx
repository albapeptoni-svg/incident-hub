import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, HelpCircle, Lock, Mail } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { SAFE_MESSAGES, logTechnicalError } from "@/lib/safeError";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setLoading(true);

    localStorage.setItem("siec-remember-session", rememberSession ? "true" : "false");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      if (error) logTechnicalError("Login failed", error);
      setLoading(false);
      setErrorMessage(SAFE_MESSAGES.auth);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("activo")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile?.activo) {
      if (profileError) logTechnicalError("Login profile check failed", profileError);
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMessage(SAFE_MESSAGES.auth);
      return;
    }

    setLoading(false);

    navigate("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#EEF2F8] text-[#061B4D]">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[51fr_49fr]">
        <aside className="relative hidden overflow-hidden bg-[#061B4D] px-12 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(18,75,255,0.38),transparent_30%),radial-gradient(circle_at_88%_45%,rgba(85,125,255,0.34),transparent_24%),linear-gradient(135deg,#071D55_0%,#061B4D_46%,#020817_100%)]" />

          <div className="absolute right-[-12%] top-[-16%] h-[620px] w-[620px] rounded-full border border-blue-400/15" />
          <div className="absolute right-[-2%] top-[24%] h-64 w-64 rounded-full border border-blue-300/20 bg-blue-400/5 blur-[1px]" />

          <div className="absolute left-[-18%] top-[52%] h-48 w-[120%] -rotate-[11deg] rounded-full border-t border-blue-300/30" />
          <div className="absolute left-[-20%] top-[56%] h-56 w-[130%] -rotate-[9deg] rounded-full border-t border-cyan-300/30" />
          <div className="absolute left-[-16%] top-[61%] h-52 w-[118%] -rotate-[8deg] rounded-full border-t border-[#FF2D55]/35" />

          <div className="absolute bottom-28 left-[-8%] h-64 w-[110%] bg-[radial-gradient(ellipse_at_center,rgba(18,75,255,0.24),transparent_65%)]" />
          <div className="absolute bottom-0 left-0 h-72 w-full bg-[linear-gradient(180deg,transparent,rgba(2,8,23,0.45))]" />

          <div className="absolute left-0 top-[48%] h-px w-full bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="absolute left-0 top-[58%] h-px w-full bg-gradient-to-r from-transparent via-[#FF2D55]/35 to-transparent" />

          <div className="absolute left-0 top-[44%] grid grid-cols-6 gap-3 opacity-25">
            {Array.from({ length: 42 }).map((_, index) => (
              <span key={index} className="h-1.5 w-1.5 rounded-full bg-blue-300" />
            ))}
          </div>

          <BrandLogo
            size="lg"
            showText
            textColor="light"
            className="relative z-10"
          />

          <div className="relative z-10 mt-auto max-w-3xl pb-8">
            <p className="mb-5 h-1 w-20 rounded-full bg-[#FF2D55]" />

            <h2 className="max-w-3xl text-5xl font-black leading-[1.08] tracking-tight">
              Control inteligente de incidencias
              <span className="block">antes de SIEC</span>
            </h2>
          </div>
        </aside>

        <section className="relative flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(18,75,255,0.10),transparent_28%),radial-gradient(circle_at_28%_86%,rgba(6,27,77,0.08),transparent_30%)]" />
          <div className="absolute right-[-20%] top-[-12%] h-[520px] w-[520px] rounded-full border border-slate-200/80" />
          <div className="absolute bottom-[-18%] left-[-18%] h-[520px] w-[520px] rounded-full border border-slate-200/80" />

          <div className="relative z-10 w-full max-w-[560px]">
            <BrandLogo
              size="md"
              showText
              textColor="dark"
              className="mb-8 justify-center lg:hidden"
            />

            <form
              onSubmit={handleSubmit}
              className="rounded-[34px] border border-white/90 bg-white/85 p-8 shadow-[0_28px_90px_rgba(6,27,77,0.16)] backdrop-blur-xl sm:p-10"
            >
              <div className="mb-8 text-center">
                <div className="mx-auto mb-8 flex items-center justify-center">
  <img
    src="/logo-siec.png"
    alt="Logo SIEC Flow AI"
    className="h-32 w-auto object-contain"
  />
</div>

                <h2 className="text-4xl font-black tracking-tight text-[#061B4D]">
                  Iniciar sesión
                </h2>

                <p className="mt-2 text-base font-medium text-slate-500">
                  Accede al Centro de Control
                </p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#061B4D]">
                    Correo
                  </span>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      placeholder="ejemplo@empresa.com"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#061B4D] outline-none transition placeholder:text-slate-400 focus:border-[#124BFF] focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#061B4D]">
                    Contraseña
                  </span>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      placeholder="Ingresa tu contraseña"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-medium text-[#061B4D] outline-none transition placeholder:text-slate-400 focus:border-[#124BFF] focus:ring-4 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-[#061B4D]"
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-[#061B4D]">
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        rememberSession ? "bg-[#124BFF]" : "bg-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(event) =>
                          setRememberSession(event.target.checked)
                        }
                        className="sr-only"
                      />
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          rememberSession ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                    Mantener sesión
                  </label>
                </div>

                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#061B4D] via-[#123BCE] to-[#124BFF] text-base font-bold text-white shadow-lg shadow-blue-900/20 transition hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span>{loading ? "Accediendo..." : "Acceder"}</span>
                  <span className="ml-4 transition group-hover:translate-x-1">→</span>
                </button>
              </div>

              <div className="my-8 flex items-center gap-4">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-sm font-semibold text-slate-400">o</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                className="mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-[#124BFF] transition hover:text-[#061B4D]"
              >
                <HelpCircle className="h-4 w-4" />
                ¿Necesitas ayuda?
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
