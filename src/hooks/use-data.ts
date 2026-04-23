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

const USE_MOCKS = !isSupabaseConfigured || true; // Always true for now as requested in previous sessions, but now forced if no supabase

export function usePartes() {
  return useQuery({
    queryKey: ["partes"],
    queryFn: async () => {
      if (USE_MOCKS) return mockPartes;
      return dataService.getPartes();
    },
  });
}

export function useIncidencias(parteId?: string) {
  return useQuery({
    queryKey: ["incidencias", parteId],
    queryFn: async () => {
      if (USE_MOCKS) {
        if (parteId) return mockIncidencias.filter(i => i.parteId === parteId);
        return mockIncidencias;
      }
      return dataService.getIncidencias(parteId);
    },
  });
}

export function useCentros() {
  return useQuery({
    queryKey: ["centros"],
    queryFn: async () => {
      if (USE_MOCKS) return mockCentros;
      return dataService.getCentros();
    },
  });
}

export function useAutomatizaciones() {
  return useQuery({
    queryKey: ["automatizaciones"],
    queryFn: async () => {
      if (USE_MOCKS) return mockAutomatizaciones;
      return dataService.getAutomatizaciones();
    },
  });
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      if (USE_MOCKS) return mockUsuarios;
      return dataService.getUsuarios();
    },
  });
}
