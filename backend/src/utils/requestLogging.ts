import { Request } from "express";
import { AuthRequest, AuthUser } from "../types";

export type RequestActorPayload = {
  id?: number | string | null;
  role?: string | null;
  empresaId?: number | string | null;
} | null;

export const getRequestId = (req: Request) =>
  req.header("x-request-id") || req.header("x-correlation-id") || null;

export const getAuthUserFromRequest = (req: Request): AuthUser | null => {
  const candidate = (req as AuthRequest).user;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate;
};

export const buildActorLogPayload = (
  user: AuthUser | null | undefined
): RequestActorPayload =>
  user
    ? {
        id: user.id,
        role: user.role,
        empresaId: user.empresaId ?? null,
      }
    : null;

export const withRequestPath = (
  req: Request,
  meta?: Record<string, unknown> | null
) => ({
  ...(meta ?? {}),
  path: req.originalUrl,
});
