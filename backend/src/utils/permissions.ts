import type { AuthUser, UserRole } from "../types";

export function normalizeRole(role?: string | null): UserRole | undefined {
  const normalized = role?.trim().toLowerCase();

  if (normalized === "admin" || normalized === "empresa" || normalized === "user") {
    return normalized;
  }

  return undefined;
}

export function sanitizeAuthUser(user: {
  id: number;
  email: string;
  nome?: string | null;
  role?: string | null;
  empresaId?: number | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    nome: user.nome ?? undefined,
    role: normalizeRole(user.role) ?? "user",
    empresaId: user.empresaId ?? null,
  };
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === "admin";
}

export function canAccessEmpresaFeatures(role?: string | null): boolean {
  const normalized = normalizeRole(role);

  return normalized === "admin" || normalized === "empresa";
}
