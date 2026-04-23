import type { ActividadItem, Incidencia, Lote, Parte, Usuario } from "./types";

export const partes: Parte[] = [
  { id: "p-001", codigo: "PT-2025-00142", fecha: "2025-04-22", centro: "Centro Comercial Diagonal", tecnico: "Marta Ribas", estado: "revision", numIncidencias: 8, notas: "Mantenimiento mensual climatización" },
  { id: "p-002", codigo: "PT-2025-00141", fecha: "2025-04-22", centro: "Hospital Sant Pau", tecnico: "Jordi Vila", estado: "pendiente", numIncidencias: 12 },
  { id: "p-003", codigo: "PT-2025-00140", fecha: "2025-04-21", centro: "Oficinas Torre Glòries", tecnico: "Lucía Hernández", estado: "procesado", numIncidencias: 5 },
  { id: "p-004", codigo: "PT-2025-00139", fecha: "2025-04-21", centro: "Hotel Arts Barcelona", tecnico: "David Soler", estado: "enviado", numIncidencias: 7 },
  { id: "p-005", codigo: "PT-2025-00138", fecha: "2025-04-20", centro: "Aeropuerto T1", tecnico: "Anna Puig", estado: "enviado", numIncidencias: 14 },
  { id: "p-006", codigo: "PT-2025-00137", fecha: "2025-04-20", centro: "Centro Logístico Zona Franca", tecnico: "Marc Boix", estado: "error", numIncidencias: 3, notas: "Error en validación de 2 incidencias" },
  { id: "p-007", codigo: "PT-2025-00136", fecha: "2025-04-19", centro: "Universidad Pompeu Fabra", tecnico: "Sara Llopis", estado: "enviado", numIncidencias: 6 },
  { id: "p-008", codigo: "PT-2025-00135", fecha: "2025-04-19", centro: "Centro Comercial Maremàgnum", tecnico: "Pol Ferrer", estado: "revision", numIncidencias: 9 },
];

export const incidencias: Incidencia[] = [
  {
    id: "i-001", parteId: "p-001", linea: 1,
    textoOcr: "Climat. plant 3 no enfria, comprsr makes ruido raro",
    textoCorregido: "Climatización planta 3 no enfría, compresor hace ruido anómalo",
    tema: "Climatización", descripcion: "Revisar compresor unidad exterior planta 3, posible fallo en rodamientos.",
    categoria: "HVAC", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "lista",
  },
  {
    id: "i-002", parteId: "p-001", linea: 2,
    textoOcr: "Lampara LED pasillo 2B fundida x2",
    textoCorregido: "Lámparas LED pasillo 2B fundidas (2 unidades)",
    tema: "Iluminación", descripcion: "Sustitución de 2 luminarias LED en pasillo 2B.",
    categoria: "Eléctrico", grupo: "Mantenimiento Preventivo",
    crearEnSiec: true, estado: "lista",
  },
  {
    id: "i-003", parteId: "p-001", linea: 3,
    textoOcr: "Puerta autom entrada principa atascda",
    textoCorregido: "Puerta automática entrada principal atascada",
    tema: "Accesos", descripcion: "Sensor de la puerta automática responde con retardo, requiere ajuste.",
    categoria: "Mecánico", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "revision",
  },
  {
    id: "i-004", parteId: "p-001", linea: 4,
    textoOcr: "Fuga aqua bajo lavabo wc hombres",
    textoCorregido: "Fuga de agua bajo lavabo WC hombres planta baja",
    tema: "Fontanería", descripcion: "Sustituir sifón y revisar latiguillo.",
    categoria: "Fontanería", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "lista",
  },
  {
    id: "i-005", parteId: "p-001", linea: 5,
    textoOcr: "Extintor caducado zona carga descarga",
    textoCorregido: "Extintor caducado en zona de carga y descarga",
    tema: "PCI", descripcion: "Renovación obligatoria, documentar fecha.",
    categoria: "Seguridad", grupo: "Inspección Reglamentaria",
    crearEnSiec: true, estado: "lista",
  },
  {
    id: "i-006", parteId: "p-001", linea: 6,
    textoOcr: "Comentari general estado bueno",
    textoCorregido: "Comentario general: estado bueno",
    tema: "General", descripcion: "Observación sin acción requerida.",
    categoria: "Otros", grupo: "Información",
    crearEnSiec: false, motivoExclusion: "Comentario informativo, no requiere parte SIEC", estado: "excluida",
  },
  {
    id: "i-007", parteId: "p-001", linea: 7,
    textoOcr: "Ascensor 2 ruido frenada",
    textoCorregido: "Ascensor núm. 2 emite ruido al frenar",
    tema: "Ascensores", descripcion: "Programar revisión con empresa mantenedora.",
    categoria: "Mecánico", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "revision",
  },
  {
    id: "i-008", parteId: "p-001", linea: 8,
    textoOcr: "Termostato sala reuniones 4 no responde",
    textoCorregido: "Termostato sala de reuniones 4 no responde",
    tema: "Climatización", descripcion: "Sustituir baterías y reconfigurar.",
    categoria: "HVAC", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "pendiente",
  },
];

export const lotes: Lote[] = [
  { id: "l-001", codigo: "LOTE-2025-0042", fecha: "2025-04-22 14:30", parteCodigo: "PT-2025-00139", numIncidencias: 7, estado: "confirmado", responsable: "Marta Ribas", duracion: "1m 24s" },
  { id: "l-002", codigo: "LOTE-2025-0041", fecha: "2025-04-22 11:05", parteCodigo: "PT-2025-00138", numIncidencias: 14, estado: "enviado", responsable: "Jordi Vila", duracion: "2m 51s" },
  { id: "l-003", codigo: "LOTE-2025-0040", fecha: "2025-04-22 09:48", parteCodigo: "PT-2025-00137", numIncidencias: 6, estado: "en_proceso", responsable: "Lucía Hernández" },
  { id: "l-004", codigo: "LOTE-2025-0039", fecha: "2025-04-21 18:12", parteCodigo: "PT-2025-00136", numIncidencias: 9, estado: "pendiente", responsable: "David Soler" },
  { id: "l-005", codigo: "LOTE-2025-0038", fecha: "2025-04-21 16:40", parteCodigo: "PT-2025-00135", numIncidencias: 3, estado: "error", responsable: "Anna Puig", duracion: "0m 42s" },
];

export const actividad: ActividadItem[] = [
  { id: "a-1", tipo: "envio", texto: "Lote LOTE-2025-0042 enviado a SIEC (7 incidencias)", usuario: "Marta Ribas", hora: "hace 12 min" },
  { id: "a-2", tipo: "edicion", texto: "Incidencia #3 del parte PT-2025-00142 editada", usuario: "Jordi Vila", hora: "hace 38 min" },
  { id: "a-3", tipo: "error", texto: "Error de validación en LOTE-2025-0038", usuario: "Sistema", hora: "hace 1 h" },
  { id: "a-4", tipo: "creacion", texto: "Nuevo parte registrado: PT-2025-00142", usuario: "OCR Bridge", hora: "hace 2 h" },
  { id: "a-5", tipo: "envio", texto: "Lote LOTE-2025-0041 enviado a SIEC (14 incidencias)", usuario: "Lucía Hernández", hora: "hace 3 h" },
  { id: "a-6", tipo: "login", texto: "Inicio de sesión", usuario: "admin@siecbridge.io", hora: "hace 4 h" },
];

export const usuarios: Usuario[] = [
  { id: "u-1", nombre: "Marta Ribas", email: "marta.ribas@siecbridge.io", rol: "admin", centro: "Sede Central", activo: true, ultimoAcceso: "hace 5 min" },
  { id: "u-2", nombre: "Jordi Vila", email: "jordi.vila@siecbridge.io", rol: "user", centro: "Hospital Sant Pau", activo: true, ultimoAcceso: "hace 1 h" },
  { id: "u-3", nombre: "Lucía Hernández", email: "lucia.hernandez@siecbridge.io", rol: "user", centro: "Torre Glòries", activo: true, ultimoAcceso: "hace 3 h" },
  { id: "u-4", nombre: "David Soler", email: "david.soler@siecbridge.io", rol: "user", centro: "Hotel Arts", activo: false, ultimoAcceso: "hace 4 días" },
  { id: "u-5", nombre: "Anna Puig", email: "anna.puig@siecbridge.io", rol: "admin", centro: "Aeropuerto T1", activo: true, ultimoAcceso: "hace 30 min" },
];

export const categorias = ["HVAC", "Eléctrico", "Mecánico", "Fontanería", "Seguridad", "Obra civil", "Otros"];
export const grupos = ["Mantenimiento Correctivo", "Mantenimiento Preventivo", "Inspección Reglamentaria", "Información", "Mejora"];
export const temas = ["Climatización", "Iluminación", "Accesos", "Fontanería", "PCI", "Ascensores", "General"];
