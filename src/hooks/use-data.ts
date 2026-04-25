import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/services/data.service";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
}

export function usePartes() {
  return useQuery({
    queryKey: ["partes"],
    queryFn: async () => {
      assertSupabaseConfigured();
      try {
        return await dataService.getPartes();
      } catch (error) {
        console.error("Error fetching partes, falling back to empty:", error);
        return [];
      }
    },
  });
}

export function useIncidencias(parteId?: string) {
  return useQuery({
    queryKey: ["incidencias", parteId],
    queryFn: async () => {
      assertSupabaseConfigured();
      try {
        return await dataService.getIncidencias(parteId);
      } catch (error) {
        console.error("Error fetching incidencias, falling back to empty:", error);
        return [];
      }
    },
  });
}

export function useCentros() {
  return useQuery({
    queryKey: ["centros"],
    queryFn: async () => {
      assertSupabaseConfigured();
      try {
        return await dataService.getCentros();
      } catch (error) {
        console.error("Error fetching centros, falling back to empty:", error);
        return [];
      }
    },
  });
}

export function useAutomatizaciones() {
  return useQuery({
    queryKey: ["automatizaciones"],
    queryFn: async () => {
      assertSupabaseConfigured();
      try {
        return await dataService.getAutomatizaciones();
      } catch (error) {
        console.error("Error fetching automatizaciones, falling back to empty:", error);
        return [];
      }
    },
  });
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      assertSupabaseConfigured();
      try {
        return await dataService.getUsuarios();
      } catch (error) {
        console.error("Error fetching usuarios, falling back to empty:", error);
        return [];
      }
    },
  });
}

export function useFotos(parteId?: string, incidenciaId?: string) {
  return useQuery({
    queryKey: ["fotos", parteId, incidenciaId],
    queryFn: async () => {
      assertSupabaseConfigured();
      try {
        return await dataService.getFotos({ parteId, incidenciaId });
      } catch (error) {
        console.error("Error fetching fotos, falling back to empty:", error);
        return [];
      }
    },
  });
}
