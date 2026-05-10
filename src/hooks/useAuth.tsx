import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Usuario } from "@/types";
import {
  canAccessAdmin,
  canManageSiec,
  isAdmin as checkIsAdmin,
  isTecnico as checkIsTecnico,
  isVisor as checkIsVisor,
} from "@/lib/permissions";
import { logTechnicalError } from "@/lib/safeError";

type RolUsuario = Usuario["rol"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Usuario | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isTecnico: boolean;
  isVisor: boolean;
  canAccessAdmin: boolean;
  canManageSiec: boolean;
}

type SupabaseProfile = {
  id: string;
  nombre: string | null;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfile(data: SupabaseProfile, fallbackUser?: User | null): Usuario {
  return {
    id: data.id,
    nombre: data.nombre || fallbackUser?.email || data.email,
    email: data.email || fallbackUser?.email || "",
    rol: data.rol,
    activo: data.activo,
    ultimoAcceso: data.actualizado_en,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: User | null) => {
    if (!authUser || !isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(mapProfile(data as SupabaseProfile, authUser));
        return;
      }

      setProfile(null);
    } catch (error) {
      logTechnicalError("Auth profile load failed", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await fetchProfile(currentSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      window.setTimeout(() => {
        fetchProfile(nextSession?.user ?? null);
      }, 0);

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await fetchProfile(user);
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      loading,
      signOut,
      refreshProfile,
      isAdmin: checkIsAdmin(profile),
      isTecnico: checkIsTecnico(profile),
      isVisor: checkIsVisor(profile),
      canAccessAdmin: canAccessAdmin(profile),
      canManageSiec: canManageSiec(profile),
    }),
    [loading, profile, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
