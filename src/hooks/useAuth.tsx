import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { Usuario } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Usuario | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { isSupabaseConfigured } from '@/integrations/supabase/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Provide a mock admin session for preview environments
      const mockUser = { id: 'mock-id', email: 'admin@siecbridge.io' } as User;
      setSession({ user: mockUser } as Session);
      setUser(mockUser);
      setProfile({
        id: 'mock-id',
        nombre: 'Usuario (Preview)',
        email: 'preview@siecbridge.io',
        rol: 'admin',
        activo: true
      });
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
