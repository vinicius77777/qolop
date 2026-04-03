import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AuthRequest, AuthUser, PagamentoHistoricoEntry, PagamentoStatus } from "../types";
import { sendPedidoCompleto } from "../email";
import {
  logPedidoEvent,
  sanitizePedidoFiltersForLog,
  withPedidoLogDuration,
} from "../utils/pedidoLogging";
import {
  normalizeCep,
  normalizeNomeCliente,
  normalizePagamentoStatusValue,
  normalizePedidoQueryFilters,
  normalizePedidoStatus,
  normalizeTelefone,
} from "../utils/pedidoDomain";

type PedidoRecord = {
  id: number | string;
  nomeCliente?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresaId?: number | string | null;
  tipoServico?: string | null;
  area?: number | string | null;
  local?: string | null;
  cep?: string | null;
  mensagem?: string | null;
  valorSimulado?: number | string | null;
  status?: string | null;
  pago?: boolean | null;
  pagamentoStatus?: string | null;
  pagamentoHistorico?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  empresa?: {
    id?: number | string | null;
    nome?: string | null;
  } | null;
};

type PedidoQueryFilters = {
  search?: string;
  status?: string;
  pagamentoStatus?: string;
  empresaId?: number;
};

type PedidoRepository = {
  findMany: (args: Record<string, unknown>) => Promise<PedidoRecord[]>;
  create: (args: Record<string, unknown>) => Promise<PedidoRecord>;
  update: (args: Record<string, unknown>) => Promise<PedidoRecord>;
  delete: (args: Record<string, unknown>) => Promise<PedidoRecord>;
  findUnique: (args: Record<string, unknown>) => Promise<PedidoRecord | null>;
};

type UsuarioRecord = {
  id: number;
  email: string;
  role?: string | null;
  empresaId?: number | null;
};

type UsuarioRepository = {
  findUnique: (args: Record<string, unknown>) => Promise<UsuarioRecord | null>;
};

type PrismaLike = {
  pedido: PedidoRepository;
  usuario: UsuarioRepository;
};

const prismaRef = (): PrismaLike => {
  if (!prisma) {
    throw new Error("Prisma client is not initialized.");
  }

  return prisma as unknown as PrismaLike;
};

const getAuthUser = (req: Request): AuthUser | null => {
  const candidate = (req as AuthRequest).user;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate;
};

const toNullableNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toNullableString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const toNullableNormalizedString = (
  value: unknown,
  normalizer?: (candidate: unknown) => string | undefined
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = normalizer ? normalizer(value) : toNullableString(value);

  if (normalized === undefined) {
    return typeof value === "string" ? value.trim() || null : undefined;
  }

  return normalized === "" ? null : normalized;
};

const normalizePagamentoHistorico = (
  existing: unknown
): PagamentoHistoricoEntry[] => {
  if (!Array.isArray(existing)) {
    return [];
  }

  return existing.filter(
    (item): item is PagamentoHistoricoEntry =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as PagamentoHistoricoEntry).status === "string" &&
      typeof (item as PagamentoHistoricoEntry).updatedAt === "string"
  );
};

const serializePedido = (pedido: PedidoRecord) => ({
  id: pedido.id,
  nomeCliente: pedido.nomeCliente ?? null,
  email: pedido.email ?? null,
  telefone: pedido.telefone ?? null,
  empresaId: pedido.empresaId ?? null,
  tipoServico: pedido.tipoServico ?? null,
  area: pedido.area ?? null,
  local: pedido.local ?? null,
  cep: pedido.cep ?? null,
  mensagem: pedido.mensagem ?? null,
  valorSimulado: pedido.valorSimulado ?? null,
  status: pedido.status ?? null,
  pago: pedido.pago ?? false,
  pagamentoStatus: pedido.pagamentoStatus ?? "nao_pago",
  pagamentoHistorico: Array.isArray(pedido.pagamentoHistorico)
    ? pedido.pagamentoHistorico
    : [],
  createdAt: pedido.createdAt ?? null,
  updatedAt: pedido.updatedAt ?? null,
  empresa: pedido.empresa
    ? {
        id: pedido.empresa.id ?? null,
        nome: pedido.empresa.nome ?? null,
      }
    : null,
});

const isPedidoCompleted = (status: unknown) =>
  normalizePedidoStatus(status) === "concluido";

const buildPedidoWhereClause = (
  user: AuthUser | null,
  filters: PedidoQueryFilters
) => {
  const where: Prisma.pedidoWhereInput = {};

  if (user?.role === "empresa" && user.empresaId) {
    where.empresaId = Number(user.empresaId);
  } else if (filters.empresaId !== undefined) {
    where.empresaId = filters.empresaId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.pagamentoStatus) {
    where.pagamentoStatus = filters.pagamentoStatus;
  }

  if (filters.search) {
    where.OR = [
      { nomeCliente: { contains: filters.search } },
      { email: { contains: filters.search } },
      { telefone: { contains: filters.search } },
      { mensagem: { contains: filters.search } },
      { local: { contains: filters.search } },
      { cep: { contains: filters.search } },
      { empresa: { is: { nome: { contains: filters.search } } } },
    ];
  }

  return where;
};

const extractPedidoFilters = (
  req: Request,
  user: AuthUser | null
): PedidoQueryFilters => {
  const normalized = normalizePedidoQueryFilters({
    search: req.query.search,
    q: req.query.q,
    status: req.query.status,
    pagamentoStatus: req.query.pagamentoStatus,
    paymentStatus: req.query.paymentStatus,
    pago: req.query.pago,
    paid: req.query.paid,
    empresaId: req.query.empresaId,
    companyId: req.query.companyId,
  });

  return {
    ...normalized,
    empresaId:
      user?.role === "empresa"
        ? toNullableNumber(user.empresaId)
        : normalized.empresaId,
  };
};

const getRequestId = (req: Request) =>
  req.header("x-request-id") ||
  req.header("x-correlation-id") ||
  null;

const buildActorLogPayload = (user: AuthUser | null) =>
  user
    ? {
        id: user.id,
        role: user.role,
        empresaId: user.empresaId ?? null,
      }
    : null;

const buildCreateData = (req: AuthRequest, user: AuthUser | null) => {
  const nomeCliente =
    toNullableNormalizedString(req.body?.nomeCliente, normalizeNomeCliente) ??
    (typeof user?.nome === "string" ? user.nome : undefined);

  const email =
    toNullableString(req.body?.email) ||
    (typeof user?.email === "string" ? user.email : undefined);

  const mensagem = toNullableString(req.body?.mensagem);
  const telefone = toNullableNormalizedString(req.body?.telefone, normalizeTelefone);
  const local = toNullableString(req.body?.local);
  const cep = toNullableNormalizedString(req.body?.cep, normalizeCep);
  const tipoServico = toNullableString(req.body?.tipoServico);
  const area = toNullableNumber(req.body?.area);
  const valorSimulado = toNullableNumber(req.body?.valorSimulado);
  const status = normalizePedidoStatus(req.body?.status) ?? "novo";
  const pagamentoStatus =
    normalizePagamentoStatusValue(req.body?.pagamentoStatus ?? req.body?.pago) ??
    "nao_pago";
  const pago = pagamentoStatus !== "nao_pago";
  const empresaId =
    user?.role === "empresa"
      ? user.empresaId ?? undefined
      : toNullableNumber(req.body?.empresaId);

  if (!email) {
    return { error: "Email é obrigatório." as const, reason: "missing_email" as const };
  }

  if (!mensagem) {
    return { error: "Mensagem é obrigatória." as const, reason: "missing_mensagem" as const };
  }

  return {
    data: {
      nomeCliente,
      email,
      telefone,
      empresaId: empresaId ?? null,
      tipoServico,
      area,
      local,
      cep,
      mensagem,
      valorSimulado,
      status,
      pagamentoStatus,
      pago,
      pagamentoHistorico: [],
    },
  };
};

const buildUpdateData = (req: AuthRequest, existing: PedidoRecord, user: AuthUser | null) => {
  const data: Record<string, unknown> = {};
  const changes: Record<string, unknown> = {};

  if ("nomeCliente" in req.body) {
    const value = toNullableNormalizedString(req.body.nomeCliente, normalizeNomeCliente);
    data.nomeCliente = value;
    changes.nomeCliente = value;
  }

  if ("email" in req.body) {
    const value = toNullableString(req.body.email) ?? null;
    data.email = value;
    changes.email = value;
  }

  if ("telefone" in req.body) {
    const value = toNullableNormalizedString(req.body.telefone, normalizeTelefone);
    data.telefone = value;
    changes.telefone = value;
  }

  if ("mensagem" in req.body) {
    const value = toNullableString(req.body.mensagem) ?? null;
    data.mensagem = value;
    changes.mensagem = value;
  }

  if ("local" in req.body) {
    const value = toNullableString(req.body.local) ?? null;
    data.local = value;
    changes.local = value;
  }

  if ("cep" in req.body) {
    const value = toNullableNormalizedString(req.body.cep, normalizeCep);
    data.cep = value;
    changes.cep = value;
  }

  if ("tipoServico" in req.body) {
    const value = toNullableString(req.body.tipoServico) ?? null;
    data.tipoServico = value;
    changes.tipoServico = value;
  }

  if ("area" in req.body) {
    const value = toNullableNumber(req.body.area) ?? null;
    data.area = value;
    changes.area = value;
  }

  if ("valorSimulado" in req.body) {
    const value = toNullableNumber(req.body.valorSimulado) ?? null;
    data.valorSimulado = value;
    changes.valorSimulado = value;
  }

  if ("status" in req.body) {
    const value = normalizePedidoStatus(req.body.status);
    if (value) {
      data.status = value;
      changes.status = value;
    }
  }

  if ("empresaId" in req.body && user?.role !== "empresa") {
    const value = toNullableNumber(req.body.empresaId) ?? null;
    data.empresaId = value;
    changes.empresaId = value;
  }

  if ("pagamentoStatus" in req.body || "pago" in req.body) {
    const pagamentoStatus =
      normalizePagamentoStatusValue(req.body.pagamentoStatus ?? req.body.pago) ??
      normalizePagamentoStatusValue(existing.pagamentoStatus ?? existing.pago) ??
      "nao_pago";

    const pago = pagamentoStatus !== "nao_pago";
    const historicoAtual = normalizePagamentoHistorico(existing.pagamentoHistorico);

    data.pagamentoStatus = pagamentoStatus;
    data.pago = pago;
    changes.pagamentoStatus = pagamentoStatus;
    changes.pago = pago;

    if (pagamentoStatus !== (existing.pagamentoStatus ?? null)) {
      const historyEntry: PagamentoHistoricoEntry = {
        status: pagamentoStatus as PagamentoStatus,
        updatedAt: new Date().toISOString(),
        updatedById: typeof user?.id === "number" ? user.id : undefined,
        updatedByNome: user?.nome,
        updatedByRole: user?.role,
      };

      data.pagamentoHistorico = [...historicoAtual, historyEntry];
      changes.pagamentoHistorico = historyEntry;
    }
  }

  return { data, changes };
};

export const getPedidos = async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const user = getAuthUser(req);
  const filters = extractPedidoFilters(req, user);
  const where = buildPedidoWhereClause(user, filters);
  const requestId = getRequestId(req);

  try {
    logPedidoEvent({
      event: "pedido.list.request",
      requestId,
      actor: buildActorLogPayload(user),
      filters: sanitizePedidoFiltersForLog(filters),
      meta: {
        path: req.originalUrl,
      },
    });

    const pedidos = await prismaRef().pedido.findMany({
      where,
      include: {
        empresa: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const serialized = pedidos.map(serializePedido);

    logPedidoEvent({
      event: "pedido.list.success",
      requestId,
      actor: buildActorLogPayload(user),
      filters: sanitizePedidoFiltersForLog(filters),
      meta: withPedidoLogDuration(startedAt, {
        total: serialized.length,
        path: req.originalUrl,
      }),
    });

    return res.json(serialized);
  } catch (error) {
    logPedidoEvent({
      event: "pedido.list.error",
      level: "error",
      requestId,
      actor: buildActorLogPayload(user),
      filters: sanitizePedidoFiltersForLog(filters),
      error,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
      }),
    });

    return res.status(500).json({ message: "Erro ao listar pedidos." });
  }
};

export const getHistoricoPedidos = async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const user = getAuthUser(req);
  const requestId = getRequestId(req);
  const usuarioId = Number(req.params.usuarioId);

  if (!Number.isFinite(usuarioId)) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }

  try {
    const usuario = await prismaRef().usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (user?.role === "user" && user.id !== usuarioId) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    if (
      user?.role === "empresa" &&
      user.empresaId &&
      usuario.empresaId &&
      Number(user.empresaId) !== Number(usuario.empresaId)
    ) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    logPedidoEvent({
      event: "pedido.history.request",
      requestId,
      actor: buildActorLogPayload(user),
      meta: {
        path: req.originalUrl,
        usuarioId,
      },
    });

    const pedidos = await prismaRef().pedido.findMany({
      where: {
        email: usuario.email,
      },
      include: {
        empresa: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const serialized = pedidos.map(serializePedido);

    logPedidoEvent({
      event: "pedido.history.success",
      requestId,
      actor: buildActorLogPayload(user),
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        usuarioId,
        total: serialized.length,
      }),
    });

    return res.json(serialized);
  } catch (error) {
    logPedidoEvent({
      event: "pedido.history.error",
      level: "error",
      requestId,
      actor: buildActorLogPayload(user),
      error,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        usuarioId,
      }),
    });

    return res.status(500).json({ error: "Erro ao carregar histórico de pedidos." });
  }
};

export const createPedido = async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const authReq = req as AuthRequest;
  const user = getAuthUser(req);
  const requestId = getRequestId(req);
  const payload = buildCreateData(authReq, user);

  if ("error" in payload) {
    logPedidoEvent({
      event: "pedido.create.rejected",
      level: "warn",
      requestId,
      actor: buildActorLogPayload(user),
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        reason: payload.reason,
      }),
    });

    return res.status(400).json({ error: payload.error });
  }

  try {
    logPedidoEvent({
      event: "pedido.create.request",
      requestId,
      actor: buildActorLogPayload(user),
      changes: payload.data,
      meta: {
        path: req.originalUrl,
      },
    });

    const created = await prismaRef().pedido.create({
      data: payload.data,
      include: {
        empresa: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    logPedidoEvent({
      event: "pedido.create.success",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: created.id,
      empresaId: created.empresaId ?? null,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        status: created.status ?? null,
        pagamentoStatus: created.pagamentoStatus ?? null,
      }),
    });

    return res.status(201).json(serializePedido(created));
  } catch (error) {
    logPedidoEvent({
      event: "pedido.create.error",
      level: "error",
      requestId,
      actor: buildActorLogPayload(user),
      changes: payload.data,
      error,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
      }),
    });

    return res.status(500).json({ error: "Erro ao criar pedido." });
  }
};

export const updatePedido = async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const authReq = req as AuthRequest;
  const user = getAuthUser(req);
  const requestId = getRequestId(req);
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    logPedidoEvent({
      event: "pedido.update.rejected",
      level: "warn",
      requestId,
      actor: buildActorLogPayload(user),
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        reason: "invalid_id",
        rawId: req.params.id ?? null,
      }),
    });

    return res.status(400).json({ error: "ID de pedido inválido." });
  }

  try {
    const existing = await prismaRef().pedido.findUnique({
      where: { id },
      include: {
        empresa: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!existing) {
      logPedidoEvent({
        event: "pedido.update.not_found",
        level: "warn",
        requestId,
        actor: buildActorLogPayload(user),
        pedidoId: id,
        meta: withPedidoLogDuration(startedAt, {
          path: req.originalUrl,
          reason: "pedido_not_found",
        }),
      });

      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    if (user?.role === "empresa" && Number(existing.empresaId) !== Number(user.empresaId)) {
      logPedidoEvent({
        event: "pedido.update.forbidden",
        level: "warn",
        requestId,
        actor: buildActorLogPayload(user),
        pedidoId: id,
        empresaId: existing.empresaId ?? null,
        meta: withPedidoLogDuration(startedAt, {
          path: req.originalUrl,
          reason: "empresa_scope_mismatch",
        }),
      });

      return res.status(403).json({ error: "Acesso negado a este pedido." });
    }

    const { data, changes } = buildUpdateData(authReq, existing, user);

    logPedidoEvent({
      event: "pedido.update.request",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: id,
      empresaId: existing.empresaId ?? null,
      changes,
      meta: {
        path: req.originalUrl,
        changedFields: Object.keys(changes),
      },
    });

    const updated = await prismaRef().pedido.update({
      where: { id },
      data,
      include: {
        empresa: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    const shouldSendCompletionEmail =
      isPedidoCompleted(updated.status) && !isPedidoCompleted(existing.status);

    if (shouldSendCompletionEmail && updated.email) {
      try {
        await sendPedidoCompleto({
          email: updated.email,
          nome: updated.nomeCliente ?? undefined,
          pedidoId: Number(updated.id),
          empresaNome: updated.empresa?.nome ?? undefined,
          concluidoEm: new Date(),
        });

        logPedidoEvent({
          event: "pedido.complete_email.success",
          requestId,
          actor: buildActorLogPayload(user),
          pedidoId: id,
          empresaId: updated.empresaId ?? null,
          meta: {
            path: req.originalUrl,
            email: updated.email,
          },
        });
      } catch (error) {
        logPedidoEvent({
          event: "pedido.complete_email.error",
          level: "error",
          requestId,
          actor: buildActorLogPayload(user),
          pedidoId: id,
          empresaId: updated.empresaId ?? null,
          error,
          meta: {
            path: req.originalUrl,
            email: updated.email,
          },
        });
      }
    }

    logPedidoEvent({
      event: "pedido.update.success",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: id,
      empresaId: updated.empresaId ?? null,
      changes,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        changedFields: Object.keys(changes),
        status: updated.status ?? null,
        pagamentoStatus: updated.pagamentoStatus ?? null,
      }),
    });

    return res.json(serializePedido(updated));
  } catch (error) {
    logPedidoEvent({
      event: "pedido.update.error",
      level: "error",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: id,
      error,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
      }),
    });

    return res.status(500).json({ error: "Erro ao atualizar pedido." });
  }
};

export const deletePedido = async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const user = getAuthUser(req);
  const requestId = getRequestId(req);
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    logPedidoEvent({
      event: "pedido.delete.rejected",
      level: "warn",
      requestId,
      actor: buildActorLogPayload(user),
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
        reason: "invalid_id",
        rawId: req.params.id ?? null,
      }),
    });

    return res.status(400).json({ error: "ID de pedido inválido." });
  }

  try {
    const existing = await prismaRef().pedido.findUnique({
      where: { id },
    });

    if (!existing) {
      logPedidoEvent({
        event: "pedido.delete.not_found",
        level: "warn",
        requestId,
        actor: buildActorLogPayload(user),
        pedidoId: id,
        meta: withPedidoLogDuration(startedAt, {
          path: req.originalUrl,
          reason: "pedido_not_found",
        }),
      });

      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    if (user?.role === "empresa" && Number(existing.empresaId) !== Number(user.empresaId)) {
      logPedidoEvent({
        event: "pedido.delete.forbidden",
        level: "warn",
        requestId,
        actor: buildActorLogPayload(user),
        pedidoId: id,
        empresaId: existing.empresaId ?? null,
        meta: withPedidoLogDuration(startedAt, {
          path: req.originalUrl,
          reason: "empresa_scope_mismatch",
        }),
      });

      return res.status(403).json({ error: "Acesso negado a este pedido." });
    }

    logPedidoEvent({
      event: "pedido.delete.request",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: id,
      empresaId: existing.empresaId ?? null,
      meta: {
        path: req.originalUrl,
      },
    });

    await prismaRef().pedido.delete({
      where: { id },
    });

    logPedidoEvent({
      event: "pedido.delete.success",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: id,
      empresaId: existing.empresaId ?? null,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
      }),
    });

    return res.json({ success: true });
  } catch (error) {
    logPedidoEvent({
      event: "pedido.delete.error",
      level: "error",
      requestId,
      actor: buildActorLogPayload(user),
      pedidoId: id,
      error,
      meta: withPedidoLogDuration(startedAt, {
        path: req.originalUrl,
      }),
    });

    return res.status(500).json({ error: "Erro ao excluir pedido." });
  }
};
