import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Usuario } from "@/types";
import { hasAllowedRole } from "@/lib/permissions";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: Usuario["rol"][];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { loading, session, profile, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile || !profile.activo) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <p className="font-display text-lg font-semibold">
            {!profile ? "Perfil no disponible" : "Cuenta desactivada"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu sesión existe, pero no hay un perfil activo asociado. Contacta con un administrador.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!hasAllowedRole(profile, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
