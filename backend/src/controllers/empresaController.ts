import { Response } from "express";
import slugify from "slugify";
import prisma from "../lib/prisma";
import { AuthRequest } from "../types";
import {
  validateCreateEmpresaPayload,
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

/**
 * Calcula a mediana de um array de números.
 * Se o array estiver vazio, retorna null.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
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
    tempoPermanencia: {} as Record<number, { mediana: number | null; amostrasValidas: number; interpretacao: string; recomendacao: string | null }>,
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
      duration: true,
      createdAt: true,
      ambiente: {
        select: {
          titulo: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calcular mediana de tempo de permanência por ambiente
  // Filtra apenas visitas com duration > 5 segundos (descarta cliques acidentais)
  const MIN_DURATION_THRESHOLD = 5; // segundos

  const durationByAmbiente = new Map<number, number[]>();

  for (const acesso of acessosRecentes) {
    if (typeof acesso.duration === "number" && acesso.duration > MIN_DURATION_THRESHOLD) {
      const existing = durationByAmbiente.get(acesso.ambienteId);
      if (existing) {
        existing.push(acesso.duration);
      } else {
        durationByAmbiente.set(acesso.ambienteId, [acesso.duration]);
      }
    }
  }

  function interpretarPermanencia(medianaSegundos: number): { interpretacao: string; recomendacao: string | null } {
    if (medianaSegundos < 15) {
      return {
        interpretacao: "Baixa permanência",
        recomendacao: "Considere adicionar mais conteúdo interativo ou melhorar a descrição para reter visitantes por mais tempo.",
      };
    }

    if (medianaSegundos < 45) {
      return {
        interpretacao: "Permanência moderada",
        recomendacao: "O tempo está razoável, mas você pode otimizar com CTAs mais visíveis para aumentar o engajamento.",
      };
    }

    if (medianaSegundos < 120) {
      return {
        interpretacao: "Boa permanência",
        recomendacao: null,
      };
    }

    return {
      interpretacao: "Excelente permanência",
      recomendacao: null,
    };
  }

  const tempoPermanencia: Record<number, {
    mediana: number | null;
    amostrasValidas: number;
    interpretacao: string;
    recomendacao: string | null;
  }> = {};

  for (const ambiente of ambientes) {
    const durations = durationByAmbiente.get(ambiente.id) ?? [];
    const medianaSegundos = median(durations);

    if (medianaSegundos !== null) {
      const { interpretacao, recomendacao } = interpretarPermanencia(medianaSegundos);
      tempoPermanencia[ambiente.id] = {
        mediana: Math.round(medianaSegundos),
        amostrasValidas: durations.length,
        interpretacao,
        recomendacao,
      };
    } else {
      tempoPermanencia[ambiente.id] = {
        mediana: null,
        amostrasValidas: 0,
        interpretacao: "Sem dados suficientes",
        recomendacao: "Aguardando visitas com duração superior a 5 segundos para calcular a métrica.",
      };
    }
  }

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
    tempoPermanencia,
  });
}

export async function createEmpresa(req: AuthRequest, res: Response) {
  const validation = validateCreateEmpresaPayload(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const currentUser = await prisma.usuario.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      empresaId: true,
      role: true,
    },
  });

  if (!currentUser) {
    return res.status(401).json({ error: "Usuário inválido" });
  }

  if (currentUser.empresaId) {
    return res.status(409).json({ error: "Usuário já possui empresa vinculada" });
  }

  const baseSlug = slugify(validation.data.nome, { lower: true, strict: true, trim: true });
  let slug = baseSlug || `empresa-${currentUser.id}`;
  let suffix = 1;

  while (await prisma.empresa.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

    const empresa = await prisma.$transaction(async (tx) => {
      const createdEmpresa = await tx.empresa.create({
        data: {
          nome: validation.data.nome,
          email: validation.data.email ?? null,
          descricao: validation.data.descricao ?? null,
          telefone: validation.data.telefone ?? null,
          whatsapp: validation.data.whatsapp ?? null,
          logo: req.file ? `/uploads/${req.file.filename}` : validation.data.logo ?? null,
          publico: validation.data.publico ?? false,
          slug,
        },
      });

    await tx.usuario.update({
      where: { id: currentUser.id },
      data: {
        empresaId: createdEmpresa.id,
        role: "empresa",
      },
    });

    return createdEmpresa;
  });

  const usuarioAtualizado = await prisma.usuario.findUnique({
    where: { id: currentUser.id },
    include: { empresa: true },
  });

  return res.status(201).json({
    empresa,
    usuario: usuarioAtualizado,
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

  return res.json({
    ...empresa,
    ambientes: empresa.ambiente,
    ambiente: undefined,
  });
}

export async function listEmpresas(_req: AuthRequest, res: Response) {
  const empresas = await prisma.empresa.findMany({
    where: {
      ambiente: {
        some: {
          publico: true,
        },
      },
    },
    select: {
      id: true,
      nome: true,
      slug: true,
      logo: true,
      descricao: true,
      whatsapp: true,
      telefone: true,
      email: true,
      publico: true,
      visualizacoes: true,
      _count: {
        select: {
          ambiente: {
            where: { publico: true },
          },
        },
      },
    },
    orderBy: [{ visualizacoes: "desc" }, { nome: "asc" }],
  });

  return res.json(
    empresas.map((emp) => {
      const { _count, ...rest } = emp;
      return { ...rest, totalAmbientes: _count.ambiente };
    })
  );
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
