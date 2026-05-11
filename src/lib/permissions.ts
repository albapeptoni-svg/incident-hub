import type { Usuario } from "@/types";

export type Role = Usuario["rol"];

export function isAdmin(profile?: Pick<Usuario, "rol" | "activo"> | null) {
  return profile?.activo === true && profile.rol === "admin";
}

export function isTecnico(profile?: Pick<Usuario, "rol" | "activo"> | null) {
  return profile?.activo === true && profile.rol === "tecnico";
}

export function canAccessAdmin(profile?: Pick<Usuario, "rol" | "activo"> | null) {
  return isAdmin(profile);
}

export function canManageSiec(profile?: Pick<Usuario, "rol" | "activo"> | null) {
  return isAdmin(profile) || isTecnico(profile);
}

export function canManageOperationalData(profile?: Pick<Usuario, "rol" | "activo"> | null) {
  return canManageSiec(profile);
}

export function canViewHistory(profile?: Pick<Usuario, "rol" | "activo"> | null) {
  return profile?.activo === true && ["admin", "tecnico"].includes(profile.rol);
}

export function hasAllowedRole(
  profile: Pick<Usuario, "rol" | "activo"> | null | undefined,
  allowedRoles?: Role[]
) {
  if (!profile?.activo) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(profile.rol);
}
