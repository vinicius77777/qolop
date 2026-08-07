import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { JWT_SECRET } from "../config/env";
import { AuthRequest, AuthUser } from "../types";
import { logAppEvent, withLogDuration } from "../utils/appLogging";
import {
  isDatabaseUnavailableError,
  sendDatabaseUnavailableError,
} from "../utils/dbErrors";
import { sanitizeAuthUser } from "../utils/permissions";
import { sendPasswordResetEmail } from "../email";
import {
  buildActorLogPayload,
  getAuthUserFromRequest,
  getRequestId,
  withRequestPath,
} from "../utils/requestLogging";
import {
  validateLoginPayload,
  validateRegisterPayload,
} from "../validators/auth";

function buildTokenPayload(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
    empresaId: user.empresaId ?? null,
  };
}

function buildAuthUser(usuario: {
  id: number;
  email: string;
  nome: string | null;
  role: AuthUser["role"];
  empresaId: number | null;
}): AuthUser {
  return sanitizeAuthUser({
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    role: usuario.role,
    empresaId: usuario.empresaId,
  });
}

function sendValidationError(res: Response, details: string[]) {
  return res.status(400).json({
    error: "Dados inválidos",
    details,
  });
}

function sendDatabaseUnavailableResponse(
  res: Response,
  startedAt: number,
  requestId: string | null | undefined,
  req: Request,
  event: string,
  error: unknown
) {
  logAppEvent({
    domain: "auth",
    event,
    level: "error",
    requestId,
    meta: withLogDuration(startedAt, withRequestPath(req)),
    error,
  });

  return sendDatabaseUnavailableError(res);
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizePassword(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length < 6) {
    return undefined;
  }

  return normalized;
}

function buildFrontendBaseUrl(req: Request): string {
  const origin = req.get("origin");

  if (origin) {
    return origin;
  }

  return "http://localhost:5173";
}

function buildPasswordResetUrl(req: Request, email: string, token: string) {
  const baseUrl = buildFrontendBaseUrl(req);
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

function generatePasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  return { token, tokenHash };
}

function isTokenHashValid(storedHash: string | null, receivedToken: string) {
  if (!storedHash) {
    return false;
  }

  const receivedHash = crypto.createHash("sha256").update(receivedToken).digest("hex");

  if (storedHash.length !== receivedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(receivedHash));
}

export async function register(req: Request, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  try {
    const validation = validateRegisterPayload(req.body);

    if (!validation.success) {
      logAppEvent({
        domain: "auth",
        event: "auth.register.validation_failed",
        level: "warn",
        requestId,
        meta: withLogDuration(
          startedAt,
          withRequestPath(req, {
            detailsCount: validation.errors.length,
          })
        ),
      });

      return sendValidationError(res, validation.errors);
    }

    const { nome, email, senha } = validation.data;

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      logAppEvent({
        domain: "auth",
        event: "auth.register.duplicate_email",
        level: "warn",
        requestId,
        meta: withLogDuration(startedAt, withRequestPath(req)),
        filters: { email },
      });

      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        role: "user",
      },
    });

    const authUser = buildAuthUser({
      ...usuario,
      role: usuario.role as AuthUser["role"],
    });
    const token = jwt.sign(buildTokenPayload(authUser), JWT_SECRET);
    const { senha: _, ...safe } = usuario;

    logAppEvent({
      domain: "auth",
      event: "auth.register.succeeded",
      requestId,
      actor: buildActorLogPayload(authUser),
      entityId: usuario.id,
      empresaId: null,
      meta: withLogDuration(
        startedAt,
        withRequestPath(req, {
          role: usuario.role,
        })
      ),
      filters: { email },
    });

    res.json({ token, usuario: safe });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return sendDatabaseUnavailableResponse(
        res,
        startedAt,
        requestId,
        req,
        "auth.register.database_unavailable",
        error
      );
    }

    logAppEvent({
      domain: "auth",
      event: "auth.register.failed",
      level: "error",
      requestId,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function login(req: Request, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  try {
    const validation = validateLoginPayload(req.body);

    if (!validation.success) {
      logAppEvent({
        domain: "auth",
        event: "auth.login.validation_failed",
        level: "warn",
        requestId,
        meta: withLogDuration(
          startedAt,
          withRequestPath(req, {
            detailsCount: validation.errors.length,
          })
        ),
      });

      return sendValidationError(res, validation.errors);
    }

    const { email, senha } = validation.data;

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      logAppEvent({
        domain: "auth",
        event: "auth.login.user_not_found",
        level: "warn",
        requestId,
        meta: withLogDuration(startedAt, withRequestPath(req)),
        filters: { email },
      });

      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(senha, usuario.senha);
    if (!valid) {
      logAppEvent({
        domain: "auth",
        event: "auth.login.invalid_password",
        level: "warn",
        requestId,
        actor: buildActorLogPayload(
          buildAuthUser({
            ...usuario,
            role: usuario.role as AuthUser["role"],
          })
        ),
        entityId: usuario.id,
        empresaId: usuario.empresaId ?? null,
        meta: withLogDuration(startedAt, withRequestPath(req)),
        filters: { email },
      });

      return res.status(401).json({ error: "Senha inválida" });
    }

    const authUser = buildAuthUser({
      ...usuario,
      role: usuario.role as AuthUser["role"],
    });
    const token = jwt.sign(buildTokenPayload(authUser), JWT_SECRET);
    const { senha: _, ...safe } = usuario;

    logAppEvent({
      domain: "auth",
      event: "auth.login.succeeded",
      requestId,
      actor: buildActorLogPayload(authUser),
      entityId: usuario.id,
      empresaId: usuario.empresaId ?? null,
      meta: withLogDuration(
        startedAt,
        withRequestPath(req, {
          role: usuario.role,
        })
      ),
      filters: { email },
    });

    res.json({ token, usuario: safe });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return sendDatabaseUnavailableResponse(
        res,
        startedAt,
        requestId,
        req,
        "auth.login.database_unavailable",
        error
      );
    }

    logAppEvent({
      domain: "auth",
      event: "auth.login.failed",
      level: "error",
      requestId,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function requestPasswordReset(req: Request, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      logAppEvent({
        domain: "auth",
        event: "auth.password_reset.request.validation_failed",
        level: "warn",
        requestId,
        meta: withLogDuration(startedAt, withRequestPath(req)),
      });

      return sendValidationError(res, ["email é obrigatório"]);
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const { token, tokenHash } = generatePasswordResetToken();
      const resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          resetPasswordTokenHash: tokenHash,
          resetPasswordExpiresAt,
        },
      });

      const resetUrl = buildPasswordResetUrl(req, email, token);

      await sendPasswordResetEmail({
        email,
        nome: usuario.nome,
        resetUrl,
        expiresInMinutes: 30,
      });

      logAppEvent({
        domain: "auth",
        event: "auth.password_reset.request.succeeded",
        requestId,
        entityId: usuario.id,
        empresaId: usuario.empresaId ?? null,
        meta: withLogDuration(startedAt, withRequestPath(req)),
      });
    } else {
      logAppEvent({
        domain: "auth",
        event: "auth.password_reset.request.ignored",
        requestId,
        meta: withLogDuration(startedAt, withRequestPath(req)),
        filters: { email },
      });
    }

    return res.json({
      message:
        "Se o email estiver cadastrado, você receberá as instruções para redefinir a senha.",
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return sendDatabaseUnavailableResponse(
        res,
        startedAt,
        requestId,
        req,
        "auth.password_reset.request.database_unavailable",
        error
      );
    }

    logAppEvent({
      domain: "auth",
      event: "auth.password_reset.request.failed",
      level: "error",
      requestId,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function confirmPasswordReset(req: Request, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  try {
    const email = normalizeEmail(req.body?.email);
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const novaSenha = normalizePassword(req.body?.senha);

    const validationErrors: string[] = [];

    if (!email) {
      validationErrors.push("email é obrigatório");
    }

    if (!token) {
      validationErrors.push("token é obrigatório");
    }

    if (!novaSenha) {
      validationErrors.push("senha deve ter no mínimo 6 caracteres");
    }

    if (validationErrors.length > 0 || !email || !token || !novaSenha) {
      logAppEvent({
        domain: "auth",
        event: "auth.password_reset.confirm.validation_failed",
        level: "warn",
        requestId,
        meta: withLogDuration(startedAt, withRequestPath(req)),
      });

      return sendValidationError(res, validationErrors);
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (
      !usuario ||
      !usuario.resetPasswordTokenHash ||
      !usuario.resetPasswordExpiresAt ||
      usuario.resetPasswordExpiresAt.getTime() < Date.now() ||
      !isTokenHashValid(usuario.resetPasswordTokenHash, token)
    ) {
      logAppEvent({
        domain: "auth",
        event: "auth.password_reset.confirm.invalid_token",
        level: "warn",
        requestId,
        meta: withLogDuration(startedAt, withRequestPath(req)),
        filters: { email },
      });

      return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });

    logAppEvent({
      domain: "auth",
      event: "auth.password_reset.confirm.succeeded",
      requestId,
      entityId: usuario.id,
      empresaId: usuario.empresaId ?? null,
      meta: withLogDuration(startedAt, withRequestPath(req)),
    });

    return res.json({
      message: "Senha redefinida com sucesso",
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return sendDatabaseUnavailableResponse(
        res,
        startedAt,
        requestId,
        req,
        "auth.password_reset.confirm.database_unavailable",
        error
      );
    }

    logAppEvent({
      domain: "auth",
      event: "auth.password_reset.confirm.failed",
      level: "error",
      requestId,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

export async function me(req: AuthRequest, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  const actor = buildActorLogPayload(getAuthUserFromRequest(req));

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user!.id },
      include: { empresa: true },
    });

    if (!usuario) {
      logAppEvent({
        domain: "auth",
        event: "auth.me.not_found",
        level: "warn",
        requestId,
        actor,
        entityId: req.user?.id ?? null,
        empresaId: req.user?.empresaId ?? null,
        meta: withLogDuration(startedAt, withRequestPath(req)),
      });

      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { senha, resetPasswordTokenHash, resetPasswordExpiresAt, ...safe } =
      usuario;

    logAppEvent({
      domain: "auth",
      event: "auth.me.succeeded",
      requestId,
      actor,
      entityId: usuario.id,
      empresaId: usuario.empresaId ?? null,
      meta: withLogDuration(startedAt, withRequestPath(req)),
    });

    res.json(safe);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return sendDatabaseUnavailableResponse(
        res,
        startedAt,
        requestId,
        req,
        "auth.me.database_unavailable",
        error
      );
    }

    logAppEvent({
      domain: "auth",
      event: "auth.me.failed",
      level: "error",
      requestId,
      actor,
      entityId: req.user?.id ?? null,
      empresaId: req.user?.empresaId ?? null,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
