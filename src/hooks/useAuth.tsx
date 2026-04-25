import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { Usuario } from '@/types';
import { isMockMode } from '@/config/data-mode';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Usuario | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUser = {
  id: 'mock-admin-id',
  email: 'admin@siecbridge.local',
} as User;

const mockSession = {
  user: mockUser,
} as Session;

const mockProfile: Usuario = {
  id: 'mock-admin-id',
  nombre: 'Administrador Preview',
  email: 'admin@siecbridge.local',
  rol: 'admin',
  activo: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      setSession(mockSession);
      setUser(mockUser);
      setProfile(mockProfile);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          id: data.id,
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
          centroId: data.centro_id || undefined,
          activo: data.activo,
          ultimoAcceso: data.ultimo_acceso || undefined,
          avatarUrl: data.avatar_url || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  const signOut = async () => {
    if (isMockMode) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
