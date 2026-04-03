import { PagamentoStatus, PedidoStatus } from "../types";

export type PedidoQueryFilters = {
  search?: string;
  status?: PedidoStatus;
  pagamentoStatus?: PagamentoStatus;
  empresaId?: number;
};

const PEDIDO_STATUS_ALIAS_MAP: Record<string, PedidoStatus> = {
  novo: "novo",
  pending: "novo",
  pendente: "novo",
  em_andamento: "em_andamento",
  "em andamento": "em_andamento",
  in_progress: "em_andamento",
  andamento: "em_andamento",
  completo: "concluido",
  concluido: "concluido",
  concluído: "concluido",
  completed: "concluido",
  finalizado: "concluido",
};

const PAGAMENTO_STATUS_ALIAS_MAP: Record<string, PagamentoStatus> = {
  nao_pago: "nao_pago",
  "não_pago": "nao_pago",
  "não pago": "nao_pago",
  nao_pago_: "nao_pago",
  "nao pago": "nao_pago",
  unpaid: "nao_pago",
  pago: "pago",
  paid: "pago",
  pago_a_mais: "pago_a_mais",
  "pago a mais": "pago_a_mais",
  overpaid: "pago_a_mais",
};

export const PEDIDO_STATUS_VALUES: PedidoStatus[] = [
  "novo",
  "em_andamento",
  "concluido",
];

export const PAGAMENTO_STATUS_VALUES: PagamentoStatus[] = [
  "nao_pago",
  "pago",
  "pago_a_mais",
];

function normalizeWhitespace(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function normalizePedidoStatus(
  value: unknown
): PedidoStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return PEDIDO_STATUS_ALIAS_MAP[normalizeWhitespace(value)];
}

export function normalizePagamentoStatusValue(
  value: unknown
): PagamentoStatus | undefined {
  if (value === true) return "pago";
  if (value === false || value === null || value === undefined) return "nao_pago";

  if (typeof value !== "string") {
    return undefined;
  }

  return PAGAMENTO_STATUS_ALIAS_MAP[normalizeWhitespace(value)];
}

export function isPedidoConcluidoStatus(value: unknown) {
  return normalizePedidoStatus(value) === "concluido";
}

export function normalizeDigits(value: string) {
  return value.replace(/\D+/g, "");
}

export function normalizeOptionalPedidoString(
  value: unknown
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || "";
}

export function normalizeOptionalPedidoMultilineString(
  value: unknown
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || "";
}

export function normalizePedidoEmail(value: unknown): string | undefined {
  const normalized = normalizeOptionalPedidoString(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (!normalized) {
    return "";
  }

  return normalized.toLowerCase();
}

export function normalizeTelefone(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const digits = normalizeDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.length === 10 || digits.length === 11) {
    return digits;
  }

  if (digits.length === 12 || digits.length === 13) {
    return digits.startsWith("55") ? digits : undefined;
  }

  return undefined;
}

export function normalizeCep(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const digits = normalizeDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.length !== 8) {
    return undefined;
  }

  return digits;
}

export function normalizeNomeCliente(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  return normalized;
}

export function normalizePedidoQueryFilters(input: {
  search?: unknown;
  q?: unknown;
  status?: unknown;
  pagamentoStatus?: unknown;
  paymentStatus?: unknown;
  paid?: unknown;
  pago?: unknown;
  empresaId?: unknown;
  companyId?: unknown;
}): PedidoQueryFilters {
  const search =
    normalizeOptionalPedidoString(input.search) ??
    normalizeOptionalPedidoString(input.q) ??
    undefined;

  const status = normalizePedidoStatus(input.status);
  const pagamentoStatus =
    normalizePagamentoStatusValue(input.pagamentoStatus) ??
    normalizePagamentoStatusValue(input.paymentStatus) ??
    normalizePagamentoStatusValue(input.pago) ??
    normalizePagamentoStatusValue(input.paid);

  const empresaIdCandidate = input.empresaId ?? input.companyId;
  const empresaId =
    empresaIdCandidate === undefined ||
    empresaIdCandidate === null ||
    empresaIdCandidate === ""
      ? undefined
      : Number.isFinite(Number(empresaIdCandidate))
        ? Number(empresaIdCandidate)
        : undefined;

  return {
    search: search || undefined,
    status,
    pagamentoStatus,
    empresaId,
  };
}

export function formatCep(value: string | null | undefined) {
  if (!value) return value ?? null;
  const digits = normalizeDigits(value);

  if (digits.length !== 8) {
    return value;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}