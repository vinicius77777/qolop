import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { JWT_SECRET } from "../config/env";
import { AuthRequest, AuthUser } from "../types";

type JwtPayload = {
  id: number;
  email?: string;
  nome?: string;
  role?: string;
  empresaId?: number | null;
  iat?: number;
  exp?: number;
};

function extractToken(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function buildAuthUser(usuario: {
  id: number;
  email: string;
  nome: string | null;
  role: AuthUser["role"];
  empresaId: number | null;
}): AuthUser {
  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome ?? undefined,
    role: usuario.role,
    empresaId: usuario.empresaId,
  };
}

export async function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({ error: "Token ausente" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        empresaId: true,
      },
    });

    if (!usuario) {
      res.status(401).json({ error: "Usuário inválido" });
      return;
    }

    req.user = buildAuthUser({
      ...usuario,
      role: usuario.role as AuthUser["role"],
    });
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  next();
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role === "admin" || !!req.user?.empresaId) {
    next();
    return;
  }

  res.status(403).json({ error: "Acesso negado" });
}
