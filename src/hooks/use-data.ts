import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/services/data.service";
import { partes as mockPartes, incidencias as mockIncidencias, centros as mockCentros } from "@/mocks";

const USE_MOCKS = true; // Temporary flag to switch between mocks and real data

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
