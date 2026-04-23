import { Usuario } from "@/types";

export const usuarios: Usuario[] = [
  { id: "u-1", nombre: "Marta Ribas", email: "marta.ribas@siecbridge.io", rol: "admin", activo: true, ultimoAcceso: "2025-04-23T10:00:00Z" },
  { id: "u-2", nombre: "Jordi Vila", email: "jordi.vila@siecbridge.io", rol: "tecnico", activo: true, centroId: "c-2" },
  { id: "u-3", nombre: "Lucía Hernández", email: "lucia.hernandez@siecbridge.io", rol: "tecnico", activo: true, centroId: "c-3" },
  { id: "u-4", nombre: "David Soler", email: "david.soler@siecbridge.io", rol: "tecnico", activo: false, centroId: "c-4" },
];
