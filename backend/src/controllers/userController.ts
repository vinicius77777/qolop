import { Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import { AuthRequest } from "../types";
import { logAppEvent, withLogDuration } from "../utils/appLogging";
import {
  buildActorLogPayload,
  getAuthUserFromRequest,
  getRequestId,
  withRequestPath,
} from "../utils/requestLogging";
import {
  validateUpdateUsuarioPayload,
  validateUsuarioIdParams,
} from "../validators/usuarios";

function sendValidationError(res: Response, details: string[]) {
  return res.status(400).json({
    error: "Dados inválidos",
    details,
  });
}

export async function listUsuarios(req: AuthRequest, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  const actor = buildActorLogPayload(getAuthUserFromRequest(req));

  try {
    const usuarios = await prisma.usuario.findMany({
      include: { empresa: true },
      orderBy: { id: "asc" },
    });

    const safeUsuarios = usuarios.map(({ senha, ...usuario }) => usuario);

    logAppEvent({
      domain: "user",
      event: "user.list.succeeded",
      requestId,
      actor,
      meta: withLogDuration(
        startedAt,
        withRequestPath(req, {
          total: safeUsuarios.length,
        })
      ),
    });

    res.json(safeUsuarios);
  } catch (error) {
    logAppEvent({
      domain: "user",
      event: "user.list.failed",
      level: "error",
      requestId,
      actor,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    res.status(500).json({ error: "Erro ao listar usuários" });
  }
}

export async function updateUsuario(req: AuthRequest, res: Response) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  const actor = buildActorLogPayload(getAuthUserFromRequest(req));

  try {
    const paramsValidation = validateUsuarioIdParams(req.params);

    if (!paramsValidation.success) {
      logAppEvent({
        domain: "user",
        event: "user.update.params_validation_failed",
        level: "warn",
        requestId,
        actor,
        meta: withLogDuration(
          startedAt,
          withRequestPath(req, {
            detailsCount: paramsValidation.errors.length,
          })
        ),
      });

      return sendValidationError(res, paramsValidation.errors);
    }

    const bodyValidation = validateUpdateUsuarioPayload(req.body);

    if (!bodyValidation.success) {
      logAppEvent({
        domain: "user",
        event: "user.update.body_validation_failed",
        level: "warn",
        requestId,
        actor,
        entityId: paramsValidation.data.id,
        meta: withLogDuration(
          startedAt,
          withRequestPath(req, {
            detailsCount: bodyValidation.errors.length,
          })
        ),
      });

      return sendValidationError(res, bodyValidation.errors);
    }

    const { id } = paramsValidation.data;
    const usuario = await prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      logAppEvent({
        domain: "user",
        event: "user.update.not_found",
        level: "warn",
        requestId,
        actor,
        entityId: id,
        meta: withLogDuration(startedAt, withRequestPath(req)),
      });

      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: {
        ...(bodyValidation.data.nome !== undefined && {
          nome: bodyValidation.data.nome,
        }),
        ...(bodyValidation.data.email !== undefined && {
          email: bodyValidation.data.email,
        }),
        ...(bodyValidation.data.senha !== undefined && {
          senha: await bcrypt.hash(bodyValidation.data.senha, 10),
        }),
        ...(req.file && { foto: `/uploads/${req.file.filename}` }),
      },
      include: { empresa: true },
    });

    const { senha: _, ...safe } = updated;

    logAppEvent({
      domain: "user",
      event: "user.update.succeeded",
      requestId,
      actor,
      entityId: id,
      empresaId: updated.empresaId ?? null,
      meta: withLogDuration(
        startedAt,
        withRequestPath(req, {
          hasUpload: Boolean(req.file),
        })
      ),
      changes: {
        nome: bodyValidation.data.nome,
        email: bodyValidation.data.email,
        senha: bodyValidation.data.senha ? "[provided]" : undefined,
        foto: req.file ? req.file.filename : undefined,
      },
    });

    res.json(safe);
  } catch (error) {
    logAppEvent({
      domain: "user",
      event: "user.update.failed",
      level: "error",
      requestId,
      actor,
      entityId: req.params?.id ?? null,
      meta: withLogDuration(startedAt, withRequestPath(req)),
      error,
    });

    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
}
