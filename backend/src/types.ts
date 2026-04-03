import express from "express";

export type UserRole = "admin" | "empresa" | "user";

export interface AuthUser {
  id: number;
  email: string;
  nome?: string;
  role: UserRole;
  empresaId?: number | null;
}

export interface AuthRequest extends express.Request {
  user?: AuthUser;
}

export type PedidoStatus = "novo" | "em_andamento" | "concluido";

export type PagamentoStatus = "nao_pago" | "pago" | "pago_a_mais";

export type PagamentoHistoricoEntry = {
  status: PagamentoStatus;
  updatedAt: string;
  updatedById?: number;
  updatedByNome?: string;
  updatedByRole?: string;
};

export type ApiErrorResponse = {
  error: string;
  details?: string[];
};
