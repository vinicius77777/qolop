import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../types";
import {
  validateEmpresaAmbientesQuery,
  validateEmpresaAnalyticsQuery,
  validateEmpresaSlugParams,
  validateUpdateEmpresaPayload,
} from "../validators/empresa";

function sendValidationError(res: Response, details: string[]) {
  return res.status(400).json({
    error: "Dados inválidos",
    details,
  });
}

export async function listEmpresaAmbientes(
  req: AuthRequest,
  res: Response
) {
  const validation = validateEmpresaAmbientesQuery(req.query);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const requestedEmpresaId = validation.data.empresaId;
  const empresaId =
    req.user!.role === "admin"
      ? requestedEmpresaId
      : req.user!.empresaId ?? null;

  const where =
    req.user!.role === "admin"
      ? {}
      : {
          OR: [
            { publico: true },
            { empresaId },
            {
              usuario: {
                empresaId,
              },
            },
          ],
        };

  const ambientes = await prisma.ambiente.findMany({
    where,
    include: {
      empresa: true,
      pedido: {
        select: {
          id: true,
          pagamentoStatus: true,
          pago: true,
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

  return res.json(
    ambientes.map((ambiente) => ({
      ...ambiente,
      empresaPedido: ambiente.usuario?.empresa ?? null,
    }))
  );
}

export async function getEmpresaAnalytics(
  req: AuthRequest,
  res: Response
) {
  const validation = validateEmpresaAnalyticsQuery(req.query);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const emptyResponse = {
    parceiro: false,
    empresa: null,
    resumo: {
      totalAmbientes: 0,
      totalVisualizacoes: 0,
      totalToursPublicos: 0,
      totalVisitasEmpresa: 0,
    },
    ambientes: [],
    acessosRecentes: [],
  };

  const empresaId =
    req.user!.role === "admin"
      ? validation.data.empresaId
      : req.user!.empresaId ?? null;

  if (!empresaId || !Number.isFinite(empresaId)) {
    return res.json(emptyResponse);
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { id: true, nome: true, visualizacoes: true },
  });

  if (!empresa) {
    return res.json(emptyResponse);
  }

  const ambientes = await prisma.ambiente.findMany({
    where: {
      OR: [
        { empresaId: empresa.id },
        {
          usuario: {
            empresaId: empresa.id,
          },
        },
      ],
    },
    select: {
      id: true,
      titulo: true,
      publico: true,
      visualizacoes: true,
      createdAt: true,
    },
    orderBy: [{ visualizacoes: "desc" }, { createdAt: "desc" }],
  });

  const parceiro = ambientes.length > 0;

  if (!parceiro) {
    return res.json({
      ...emptyResponse,
      empresa,
    });
  }

  const resumo = ambientes.reduce(
    (acc, ambiente) => {
      acc.totalAmbientes += 1;
      acc.totalVisualizacoes += ambiente.visualizacoes ?? 0;

      if (ambiente.publico) {
        acc.totalToursPublicos += 1;
      }

      return acc;
    },
    {
      totalAmbientes: 0,
      totalVisualizacoes: 0,
      totalToursPublicos: 0,
      totalVisitasEmpresa: empresa.visualizacoes ?? 0,
    }
  );

  const acessosRecentes = await prisma.tourview.findMany({
    where: {
      OR: [
        {
          ambiente: {
            empresaId: empresa.id,
          },
        },
        {
          ambiente: {
            usuario: {
              empresaId: empresa.id,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      ambienteId: true,
      ip: true,
      cidade: true,
      pais: true,
      userAgent: true,
      createdAt: true,
      ambiente: {
        select: {
          titulo: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    parceiro,
    empresa,
    resumo: {
      ...resumo,
      totalVisualizacoes: Math.max(
        resumo.totalVisualizacoes,
        acessosRecentes.length
      ),
      totalVisitasEmpresa: Math.max(
        resumo.totalVisitasEmpresa,
        acessosRecentes.length
      ),
    },
    ambientes,
    acessosRecentes: acessosRecentes.map((acesso: any) => ({
      id: acesso.id,
      ambienteId: acesso.ambienteId,
      ambienteTitulo: acesso.ambiente.titulo,
      ip: acesso.ip ?? undefined,
      cidade: acesso.cidade ?? undefined,
      pais: acesso.pais ?? undefined,
      userAgent: acesso.userAgent ?? undefined,
      createdAt: acesso.createdAt,
    })),
  });
}

export async function getEmpresaBySlug(req: AuthRequest, res: Response) {
  const validation = validateEmpresaSlugParams(req.params);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const empresa = await prisma.empresa.findUnique({
    where: { slug: validation.data.slug },
    include: { ambiente: { where: { publico: true } } },
  });

  if (!empresa) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { visualizacoes: { increment: 1 } },
  });

  return res.json(empresa);
}

export async function updateEmpresa(req: AuthRequest, res: Response) {
  const validation = validateUpdateEmpresaPayload(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const empresaId =
    req.user!.role === "admin"
      ? validation.data.empresaId
      : req.user!.empresaId ?? null;

  if (!empresaId) {
    return res.status(400).json({ error: "empresaId necessário" });
  }

  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      ...(validation.data.descricao !== undefined && {
        descricao: validation.data.descricao,
      }),
      ...(validation.data.telefone !== undefined && {
        telefone: validation.data.telefone,
      }),
      ...(validation.data.whatsapp !== undefined && {
        whatsapp: validation.data.whatsapp,
      }),
      ...(validation.data.publico !== undefined && {
        publico: validation.data.publico,
      }),
    },
  });

  return res.json(empresa);
}