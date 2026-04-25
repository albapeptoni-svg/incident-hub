export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nombre: string
          email: string
          rol: 'admin' | 'tecnico' | 'gestor'
          centro_id: string | null
          activo: boolean
          ultimo_acceso: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          nombre: string
          email: string
          rol?: 'admin' | 'tecnico' | 'gestor'
          centro_id?: string | null
          activo?: boolean
          ultimo_acceso?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          email?: string
          rol?: 'admin' | 'tecnico' | 'gestor'
          centro_id?: string | null
          activo?: boolean
          ultimo_acceso?: string | null
          avatar_url?: string | null
        }
      }
      centros: {
        Row: {
          id: string
          nombre: string
          codigo: string
          direccion: string | null
          ciudad: string
        }
        Insert: {
          id?: string
          nombre: string
          codigo: string
          direccion?: string | null
          ciudad: string
        }
        Update: {
          id?: string
          nombre?: string
          codigo?: string
          direccion?: string | null
          ciudad?: string
        }
      }
      partes: {
        Row: {
          id: string
          codigo: string
          fecha_visita: string
          centro_id: string
          tecnico_id: string
          estado: string
          num_incidencias: number
          notas: string | null
          url_pdf: string | null
        }
        Insert: {
          id?: string
          codigo: string
          fecha_visita?: string
          centro_id: string
          tecnico_id: string
          estado?: string
          num_incidencias?: number
          notas?: string | null
          url_pdf?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          fecha_visita?: string
          centro_id?: string
          tecnico_id?: string
          estado?: string
          num_incidencias?: number
          notas?: string | null
          url_pdf?: string | null
        }
      }
      incidencias: {
        Row: {
          id: string
          parte_id: string
          linea: number
          texto_ocr: string
          texto_corregido: string
          tema: string
          descripcion: string
          categoria: string
          grupo: string
          crear_en_siec: boolean
          motivo_exclusion: string | null
          estado: string
        }
        Insert: {
          id?: string
          parte_id: string
          linea: number
          texto_ocr: string
          texto_corregido: string
          tema: string
          descripcion: string
          categoria: string
          grupo: string
          crear_en_siec?: boolean
          motivo_exclusion?: string | null
          estado?: string
        }
        Update: {
          id?: string
          parte_id?: string
          linea?: number
          texto_ocr?: string
          texto_corregido?: string
          tema?: string
          descripcion?: string
          categoria?: string
          grupo?: string
          crear_en_siec?: boolean
          motivo_exclusion?: string | null
          estado?: string
        }
      }
      automatizaciones: {
        Row: {
          id: string
          codigo: string
          fecha_creacion: string
          fecha_envio: string | null
          estado: string
          usuario_id: string
          logs: string | null
        }
        Insert: {
          id?: string
          codigo: string
          fecha_creacion?: string
          fecha_envio?: string | null
          estado?: string
          usuario_id: string
          logs?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          fecha_creacion?: string
          fecha_envio?: string | null
          estado?: string
          usuario_id?: string
          logs?: string | null
        }
      }
    }
  }
}
