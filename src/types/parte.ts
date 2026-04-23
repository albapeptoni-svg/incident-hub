import { EstadoParte } from "./enums";

export interface Parte {
  id: string;
  codigo: string;
  fecha: string;
  centroId: string;
  tecnicoId: string;
  estado: EstadoParte;
  numIncidencias: number;
  notas?: string;
  urlPdf?: string;
}
