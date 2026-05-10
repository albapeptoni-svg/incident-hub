import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/services/data.service";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { isMockMode } from "@/config/data-mode";
import { logTechnicalError } from "@/lib/safeError";
import {
  automatizaciones as mockAutomatizaciones,
  centros as mockCentros,
  incidencias as mockIncidencias,
  partes as mockPartes,
  usuarios as mockUsuarios,
} from "@/mocks";

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
}

export function usePartes() {
  return useQuery({
    queryKey: ["partes"],
    queryFn: async () => {
      if (isMockMode) return [];
      assertSupabaseConfigured();
      try {
        return await dataService.getPartes();
      } catch (error) {
        logTechnicalError("Parts query failed", error);
        return [];
      }
    },
  });
}

export function useIncidencias(parteId?: string) {
  return useQuery({
    queryKey: ["incidencias", parteId],
    queryFn: async () => {
      if (isMockMode) {
        return parteId ? mockIncidencias.filter((incidencia) => incidencia.parteId === parteId) : mockIncidencias;
      }

      assertSupabaseConfigured();
      try {
        return await dataService.getIncidencias(parteId);
      } catch (error) {
        logTechnicalError("Incidences query failed", error);
        return [];
      }
    },
  });
}

export function useCentros() {
  return useQuery({
    queryKey: ["centros"],
    queryFn: async () => {
      if (isMockMode) return mockCentros;
      assertSupabaseConfigured();
      try {
        return await dataService.getCentros();
      } catch (error) {
        logTechnicalError("Centers query failed", error);
        return [];
      }
    },
  });
}

export function useAutomatizaciones() {
  return useQuery({
    queryKey: ["automatizaciones"],
    queryFn: async () => {
      if (isMockMode) return mockAutomatizaciones;
      assertSupabaseConfigured();
      try {
        return await dataService.getAutomatizaciones();
      } catch (error) {
        logTechnicalError("Automations query failed", error);
        return [];
      }
    },
  });
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      if (isMockMode) return mockUsuarios;
      assertSupabaseConfigured();
      try {
        return await dataService.getUsuarios();
      } catch (error) {
        logTechnicalError("Users query failed", error);
        return [];
      }
    },
  });
}

export function useFotos(parteId?: string, incidenciaId?: string) {
  return useQuery({
    queryKey: ["fotos", parteId, incidenciaId],
    queryFn: async () => {
      if (isMockMode) return [];
      assertSupabaseConfigured();
      try {
        return await dataService.getFotos({ parteId, incidenciaId });
      } catch (error) {
        logTechnicalError("Photos query failed", error);
        return [];
      }
    },
  });
}
