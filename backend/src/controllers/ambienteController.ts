import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../types";
import {
  validateAmbienteViewPayload,
  validateCreateAmbientePayload,
  validateNumericId,
  validateUpdateAmbientePayload,
} from "../validators/ambientes";
import { createImageUpload } from "../utils/upload";

export const uploadAmbienteImagem = createImageUpload();

function sendValidationError(res: Response, details: string[]) {
  return res.status(400).json({
    error: "Dados inválidos",
    details,
  });
}

function normalizeIp(ip?: string) {
  if (!ip) return undefined;

  const normalized = ip.replace("::ffff:", "").trim();

  if (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized === "localhost"
  ) {
    return "127.0.0.1";
  }

  return normalized;
}

async function resolveGeoFromIp(ip?: string) {
  const normalizedIp = normalizeIp(ip);

  if (!normalizedIp || normalizedIp === "127.0.0.1") {
    return {
      cidade: "Ambiente local",
      pais: "Desenvolvimento",
    };
  }

  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(normalizedIp)}`
    );
    const data = (await response.json()) as any;

    if (!response.ok || data?.success === false) {
      return { cidade: undefined, pais: undefined };
    }

    return {
      cidade: data?.city || undefined,
      pais: data?.country || undefined,
    };
  } catch (error) {
    console.error("Erro ao resolver geolocalização por IP:", error);
    return { cidade: undefined, pais: undefined };
  }
}

function mapAmbienteWithEmpresaPedido(ambiente: any) {
  return {
    ...ambiente,
    empresaPedido: ambiente.usuario?.empresa ?? null,
  };
}

export async function listPublicAmbientes(_req: AuthRequest, res: Response) {
  const ambientes = await prisma.ambiente.findMany({
    where: { publico: true },
    include: {
      empresa: true,
      pedido: {
        select: {
          id: true,
          pagamentoStatus: true,
          pago: true,
          telefone: true,
          email: true,
        },
      },
      usuario: {
        include: {
          empresa: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(ambientes.map(mapAmbienteWithEmpresaPedido));
}

export async function listAdminAmbientes(_req: AuthRequest, res: Response) {
  const ambientes = await prisma.ambiente.findMany({
    include: {
      empresa: true,
      pedido: {
        select: {
          id: true,
          pagamentoStatus: true,
          pago: true,
          telefone: true,
          email: true,
        },
      },
      usuario: {
        include: {
          empresa: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(ambientes.map(mapAmbienteWithEmpresaPedido));
}

export async function listEmpresaAmbientes(req: AuthRequest, res: Response) {
  const empresaId = req.user?.empresaId;

  if (!empresaId) {
    return res.status(403).json({ error: "Sem permissão" });
  }

  const ambientes = await prisma.ambiente.findMany({
    where: {
      empresaId,
    },
    include: {
      empresa: true,
      pedido: {
        select: {
          id: true,
          pagamentoStatus: true,
          pago: true,
          telefone: true,
          email: true,
        },
      },
      usuario: {
        include: {
          empresa: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(ambientes.map(mapAmbienteWithEmpresaPedido));
}

export async function createAmbiente(req: AuthRequest, res: Response) {
  const validation = validateCreateAmbientePayload(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const {
    titulo,
    descricao,
    linkVR,
    siteUrl,
    empresaId,
    categoria,
    publico,
    cidade,
    pais,
    latitude,
    longitude,
    endereco,
    cep,
    clienteEmail,
    pedidoId,
  } = validation.data;

  if (latitude == null || longitude == null) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: ["latitude e longitude são obrigatórias"],
    });
  }

  const usuarioCliente =
    clienteEmail && typeof clienteEmail === "string"
      ? await prisma.usuario.findUnique({ where: { email: clienteEmail } })
      : null;

  const finalEmpresaId =
    req.user!.role === "admin"
      ? usuarioCliente?.empresaId ?? empresaId ?? null
      : req.user!.empresaId!;

  const finalUsuarioId = usuarioCliente?.id ?? req.user!.id;

  const ambiente = await prisma.ambiente.create({
    data: {
      titulo,
      descricao,
      linkVR,
      siteUrl: siteUrl ?? null,
      empresaId: finalEmpresaId,
      usuarioId: finalUsuarioId,
      categoria: categoria ?? null,
      publico,
      cidade: cidade ?? null,
      pais: pais ?? null,
      latitude,
      longitude,
      endereco: endereco ?? null,
      cep: cep ?? null,
      pedidoId: pedidoId ?? null,
      imagemPreview: req.file ? `/uploads/${req.file.filename}` : null,
      updatedAt: new Date(),
    },
  });

  return res.json(ambiente);
}

export async function updateAmbiente(req: AuthRequest, res: Response) {
  const idValidation = validateNumericId(req.params);

  if (!idValidation.success) {
    return sendValidationError(res, idValidation.errors);
  }

  const validation = validateUpdateAmbientePayload(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const id = idValidation.data.id;
  const ambiente = await prisma.ambiente.findUnique({ where: { id } });

  if (!ambiente) {
    return res.status(404).json({ error: "Ambiente não encontrado" });
  }

  if (
    req.user!.role !== "admin" &&
    ambiente.empresaId !== req.user!.empresaId
  ) {
    return res.status(403).json({ error: "Sem permissão" });
  }

  const atualizado = await prisma.ambiente.update({
    where: { id },
    data: {
      ...(validation.data.titulo !== undefined && {
        titulo: validation.data.titulo,
      }),
      ...(validation.data.descricao !== undefined && {
        descricao: validation.data.descricao,
      }),
      ...(validation.data.linkVR !== undefined && {
        linkVR: validation.data.linkVR,
      }),
      ...(validation.data.siteUrl !== undefined && {
        siteUrl: validation.data.siteUrl,
      }),
      ...(validation.data.categoria !== undefined && {
        categoria: validation.data.categoria,
      }),
      ...(validation.data.publico !== undefined && {
        publico: validation.data.publico,
      }),
      ...(validation.data.cidade !== undefined && {
        cidade: validation.data.cidade,
      }),
      ...(validation.data.pais !== undefined && {
        pais: validation.data.pais,
      }),
      ...(validation.data.latitude !== undefined && {
        latitude: validation.data.latitude,
      }),
      ...(validation.data.longitude !== undefined && {
        longitude: validation.data.longitude,
      }),
      ...(validation.data.endereco !== undefined && {
        endereco: validation.data.endereco,
      }),
      ...(validation.data.cep !== undefined && {
        cep: validation.data.cep,
      }),
      ...(req.file && { imagemPreview: `/uploads/${req.file.filename}` }),
    },
  });

  return res.json(atualizado);
}

export async function deleteAmbiente(req: AuthRequest, res: Response) {
  const idValidation = validateNumericId(req.params);

  if (!idValidation.success) {
    return sendValidationError(res, idValidation.errors);
  }

  const id = idValidation.data.id;
  const ambiente = await prisma.ambiente.findUnique({ where: { id } });

  if (!ambiente) {
    return res.status(404).json({ error: "Ambiente não encontrado" });
  }

  if (
    req.user!.role !== "admin" &&
    ambiente.empresaId !== req.user!.empresaId
  ) {
    return res.status(403).json({ error: "Sem permissão" });
  }

  try {
    await prisma.$transaction([
      prisma.tourview.deleteMany({ where: { ambienteId: id } }),
      prisma.ambiente.delete({ where: { id } }),
    ]);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir ambiente:", error);
    return res.status(500).json({
      error: "Não foi possível excluir o ambiente",
    });
  }
}

export async function getAmbienteById(req: AuthRequest, res: Response) {
  const validation = validateNumericId(req.params);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const ambiente = await prisma.ambiente.findUnique({
    where: { id: validation.data.id },
    include: {
      empresa: true,
      pedido: {
        select: {
          id: true,
          pagamentoStatus: true,
          pago: true,
          telefone: true,
          email: true,
        },
      },
      usuario: {
        include: {
          empresa: true,
        },
      },
    },
  });

  if (!ambiente) {
    return res.status(404).json({ error: "Ambiente não encontrado" });
  }

  return res.json(ambiente);
}

export async function registerAmbienteView(req: AuthRequest, res: Response) {
  const idValidation = validateNumericId(req.params);

  if (!idValidation.success) {
    return sendValidationError(res, idValidation.errors);
  }

  const bodyValidation = validateAmbienteViewPayload(req.body);

  if (!bodyValidation.success) {
    return sendValidationError(res, bodyValidation.errors);
  }

  const id = idValidation.data.id;
  const ambiente = await prisma.ambiente.findUnique({ where: { id } });

  if (!ambiente) {
    return res.status(404).json({ error: "Ambiente não encontrado" });
  }

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    undefined;
  const userAgent = req.headers["user-agent"] || undefined;
  const normalizedIp = normalizeIp(ip);
  const frontendCidade = bodyValidation.data.cidade;
  const frontendPais = bodyValidation.data.pais;
  const geo =
    frontendCidade || frontendPais
      ? { cidade: frontendCidade, pais: frontendPais }
      : await resolveGeoFromIp(normalizedIp);

  try {
    await prisma.$transaction([
      prisma.ambiente.update({
        where: { id },
        data: { visualizacoes: { increment: 1 } },
      }),
      prisma.tourview.create({
        data: {
          ambienteId: id,
          ip: normalizedIp,
          cidade: geo.cidade,
          pais: geo.pais,
          userAgent,
        },
      }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao registrar view:", err);
    return res.status(500).json({ error: "Erro ao registrar visualização" });
  }
}

export async function listExplorerAmbientes(_req: AuthRequest, res: Response) {
  const ambientes = await prisma.ambiente.findMany({
    where: {
      publico: true,
      latitude: {
        not: null,
      },
      longitude: {
        not: null,
      },
    },
    select: {
      id: true,
      titulo: true,
      categoria: true,
      descricao: true,
      siteUrl: true,
      latitude: true,
      longitude: true,
      imagemPreview: true,
      cidade: true,
      pais: true,
      endereco: true,
      cep: true,
    },
  });

  const ambientesComCoordenadasValidas = ambientes.filter(
    (ambiente) =>
      typeof ambiente.latitude === "number" &&
      Number.isFinite(ambiente.latitude) &&
      typeof ambiente.longitude === "number" &&
      Number.isFinite(ambiente.longitude)
  );

  return res.json(ambientesComCoordenadasValidas);
}
