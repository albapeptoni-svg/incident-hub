import { supabase } from '@/integrations/supabase/client';
import { Parte, Incidencia, Centro, Automatizacion, Usuario, Foto } from '@/types';

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
      .order('fecha_visita', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      codigo: p.codigo,
      fecha: p.fecha_visita,
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
      linea: i.orden_linea,
      titulo: i.titulo || undefined,
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
  },

  // Automatizaciones (Lotes)
  async getAutomatizaciones(): Promise<Automatizacion[]> {
    const { data, error } = await supabase
      .from('automatizaciones')
      .select('*')
      .order('fecha_creacion', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(a => ({
      id: a.id,
      codigo: a.codigo,
      fechaCreacion: a.fecha_creacion,
      fechaEnvio: a.fecha_envio || undefined,
      estado: a.estado as any,
      incidenciasIds: [], // This would normally be a join or a separate table
      usuarioId: a.usuario_id,
      logs: a.logs || undefined
    }));
  },

  // Usuarios (Profiles)
  async getUsuarios(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) throw error;
    
    return (data || []).map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol as any,
      centroId: u.centro_id || undefined,
      activo: u.activo,
      ultimoAcceso: u.ultimo_acceso || undefined,
      avatarUrl: u.avatar_url || undefined
    }));
  },

  // Fotos
  async getFotos(filters?: { parteId?: string; incidenciaId?: string }): Promise<Foto[]> {
    let query = (supabase as any).from('fotos').select('*');
    if (filters?.parteId) query = query.eq('parte_id', filters.parteId);
    if (filters?.incidenciaId) query = query.eq('incidencia_id', filters.incidenciaId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((f: any) => ({
      id: f.id,
      parteId: f.parte_id || undefined,
      incidenciaId: f.incidencia_id || undefined,
      url: f.url || f.public_url || f.storage_url || f.path || '',
      descripcion: f.descripcion || f.description || undefined,
      fechaCreacion: f.fecha_creacion || f.created_at || undefined
    }));
  }
};
