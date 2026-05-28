import type { Usuario } from "../services/types";

export type UserRole = NonNullable<Usuario["role"]>;

export function normalizeRole(role?: string | null): UserRole | undefined {
  const normalized = role?.trim().toLowerCase();

  if (normalized === "admin" || normalized === "empresa" || normalized === "user") {
    return normalized;
  }

  return undefined;
}

export function sanitizeUsuario(usuario: Usuario): Usuario {
  return {
    ...usuario,
    role: normalizeRole(usuario.role),
  };
}

export function isAdminUser(usuario?: Pick<Usuario, "role"> | null): boolean {
  return normalizeRole(usuario?.role) === "admin";
}

export function canAccessEmpresaFeatures(usuario?: Pick<Usuario, "role"> | null): boolean {
  const role = normalizeRole(usuario?.role);

  return role === "admin" || role === "empresa";
}
