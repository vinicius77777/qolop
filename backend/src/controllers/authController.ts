import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import slugify from "slugify";
import prisma from "../lib/prisma";
import { JWT_SECRET } from "../config/env";
import { AuthRequest, AuthUser } from "../types";
import { logAppEvent, withLogDuration } from "../utils/appLogging";
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
  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome ?? undefined,
    role: usuario.role,
    empresaId: usuario.empresaId,
  };
}

function sendValidationError(res: Response, details: string[]) {
  return res.status(400).json({
    error: "Dados inválidos",
    details,
  });
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

    const { nome, email, senha, empresaNome, orgaoPublico } = validation.data;

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      logAppEvent({
        domain: "auth",
        event: "auth.register.duplicate_email",
        level: "warn",
        requestId,
        meta: withLogDuration(
          startedAt,
          withRequestPath(req, {
            hasEmpresaNome: Boolean(empresaNome),
            orgaoPublico: Boolean(orgaoPublico),
          })
        ),
        filters: { email },
      });

      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    let empresaId: number | null = null;

    if (empresaNome || orgaoPublico) {
      const nomeEmpresaFinal =
        empresaNome?.trim() || `${nome.trim()}-orgao-publico`;

      const slug = slugify(nomeEmpresaFinal, { lower: true });
      let slugFinal = slug;
      let count = 1;

      while (await prisma.empresa.findUnique({ where: { slug: slugFinal } })) {
        slugFinal = `${slug}-${count++}`;
      }

      const empresa = await prisma.empresa.create({
        data: { nome: nomeEmpresaFinal, slug: slugFinal },
      });

      empresaId = empresa.id;
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        empresaId,
        role: empresaId ? "empresa" : "user",
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
      empresaId: empresaId ?? null,
      meta: withLogDuration(
        startedAt,
        withRequestPath(req, {
          hasEmpresa: Boolean(empresaId),
          role: usuario.role,
        })
      ),
      filters: { email, empresaNome, orgaoPublico },
    });

    res.json({ token, usuario: safe });
  } catch (error) {
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
        actor: buildActorLogPayload(buildAuthUser({
          ...usuario,
          role: usuario.role as AuthUser["role"],
        })),
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

    logAppEvent({
      domain: "auth",
      event: "auth.me.succeeded",
      requestId,
      actor,
      entityId: usuario.id,
      empresaId: usuario.empresaId ?? null,
      meta: withLogDuration(startedAt, withRequestPath(req)),
    });

    res.json(usuario);
  } catch (error) {
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
