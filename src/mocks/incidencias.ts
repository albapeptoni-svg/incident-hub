import { Incidencia } from "@/types";

export const incidencias: Incidencia[] = [
  {
    id: "i-001", parteId: "p-001", linea: 1,
    textoOcr: "Climat. plant 3 no enfria, comprsr makes ruido raro",
    textoCorregido: "Climatización planta 3 no enfría, compresor hace ruido anómalo",
    tema: "Climatización", descripcion: "Revisar compresor unidad exterior planta 3, posible fallo en rodamientos.",
    categoria: "HVAC", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "corregida",
    intentos: [
      { id: "int-1", incidenciaId: "i-001", fecha: "2025-04-22 14:00", estado: "error", mensaje: "Error de conexión con SIEC" }
    ]
  },
  {
    id: "i-002", parteId: "p-001", linea: 2,
    textoOcr: "Lampara LED pasillo 2B fundida x2",
    textoCorregido: "Lámparas LED pasillo 2B fundidas (2 unidades)",
    tema: "Iluminación", descripcion: "Sustitución de 2 luminarias LED en pasillo 2B.",
    categoria: "Eléctrico", grupo: "Mantenimiento Preventivo",
    crearEnSiec: true, estado: "aprobada",
  },
  {
    id: "i-003", parteId: "p-001", linea: 3,
    textoOcr: "Puerta autom entrada principa atascda",
    textoCorregido: "Puerta automática entrada principal atascada",
    tema: "Accesos", descripcion: "Sensor de la puerta automática responde con retardo, requiere ajuste.",
    categoria: "Mecánico", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "pendiente",
  },
  {
    id: "i-006", parteId: "p-001", linea: 6,
    textoOcr: "Comentari general estado bueno",
    textoCorregido: "Comentario general: estado bueno",
    tema: "General", descripcion: "Observación sin acción requerida.",
    categoria: "Otros", grupo: "Información",
    crearEnSiec: false, motivoExclusion: "Comentario informativo, no requiere parte SIEC", estado: "descartada",
  },
  {
    id: "i-008", parteId: "p-001", linea: 8,
    textoOcr: "Termostato sala reuniones 4 no responde",
    textoCorregido: "Termostato sala de reuniones 4 no responde",
    tema: "Climatización", descripcion: "Sustituir baterías y reconfigurar.",
    categoria: "HVAC", grupo: "Mantenimiento Correctivo",
    crearEnSiec: true, estado: "enviada",
    intentos: [
      { id: "int-2", incidenciaId: "i-008", fecha: "2025-04-22 15:00", estado: "exito" }
    ]
  },
];
