import { supabase } from '@/integrations/supabase/client';
import { Parte, Incidencia, Centro, Automatizacion } from '@/types';

export const dataService = {
  // Centros
  async getCentros(): Promise<Centro[]> {
    const { data, error } = await supabase
      .from('centros')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  // Partes
  async getPartes(): Promise<Parte[]> {
    const { data, error } = await supabase
      .from('partes')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      codigo: p.codigo,
      fecha: p.fecha,
      centroId: p.centro_id,
      tecnicoId: p.tecnico_id,
      estado: p.estado as any,
      numIncidencias: p.num_incidencias,
      notas: p.notas || undefined,
      urlPdf: p.url_pdf || undefined
    }));
  },

  // Incidencias
  async getIncidencias(parteId?: string): Promise<Incidencia[]> {
    let query = supabase.from('incidencias').select('*');
    if (parteId) query = query.eq('parte_id', parteId);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(i => ({
      id: i.id,
      parteId: i.parte_id,
      linea: i.linea,
      textoOcr: i.texto_ocr,
      textoCorregido: i.texto_corregido,
      tema: i.tema,
      descripcion: i.descripcion,
      categoria: i.categoria,
      grupo: i.grupo,
      crearEnSiec: i.crear_en_siec,
      motivoExclusion: i.motivo_exclusion || undefined,
      estado: i.estado as any
    }));
  }
};
