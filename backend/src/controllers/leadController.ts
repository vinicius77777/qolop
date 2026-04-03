import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { validateCreateLeadPayload } from "../validators/leads";

export const leadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

function sendValidationError(res: Response, details: string[]) {
  return res.status(400).json({
    error: "Dados inválidos",
    details,
  });
}

export async function createLead(req: Request, res: Response) {
  const validation = validateCreateLeadPayload(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.errors);
  }

  const lead = await prisma.lead.create({
    data: {
      empresaId: validation.data.empresaId,
      nome: validation.data.nome ?? null,
      email: validation.data.email ?? null,
      telefone: validation.data.telefone ?? null,
      mensagem: validation.data.mensagem ?? null,
    },
  });

  await prisma.empresa.update({
    where: { id: validation.data.empresaId },
    data: { leadsGerados: { increment: 1 } },
  });

  return res.json(lead);
}