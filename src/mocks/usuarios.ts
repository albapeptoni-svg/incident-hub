import { Usuario } from "@/types";

export const usuarios: Usuario[] = [
  {
    id: "mock-admin-id",
    nombre: "Administrador Preview",
    email: "admin@siecbridge.local",
    rol: "admin",
    centroId: "centro-norte",
    activo: true,
    ultimoAcceso: "2026-04-25T09:30:00Z",
  },
  {
    id: "tecnico-ana",
    nombre: "Ana Torres",
    email: "ana.torres@siecbridge.local",
    rol: "tecnico",
    centroId: "centro-sur",
    activo: true,
  },
];
