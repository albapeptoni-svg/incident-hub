import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/services/data.service";
import { 
  partes as mockPartes, 
  incidencias as mockIncidencias, 
  centros as mockCentros,
  automatizaciones as mockAutomatizaciones,
  usuarios as mockUsuarios 
} from "@/mocks";

import { isSupabaseConfigured } from "@/integrations/supabase/client";

// Prioritize real data if Supabase is configured, fallback to mocks otherwise
const USE_MOCKS = !isSupabaseConfigured;

export function usePartes() {
  return useQuery({
    queryKey: ["partes"],
    queryFn: async () => {
      if (USE_MOCKS) return [];
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
      if (USE_MOCKS) return [];
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
      if (USE_MOCKS) return [];
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
      if (USE_MOCKS) return [];
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
      if (USE_MOCKS) return [];
      try {
        return await dataService.getUsuarios();
      } catch (error) {
        console.error("Error fetching usuarios, falling back to empty:", error);
        return [];
      }
    },
  });
}
