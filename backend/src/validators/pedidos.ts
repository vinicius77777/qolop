import { PagamentoStatus, PedidoStatus } from "../types";
import {
  PAGAMENTO_STATUS_VALUES,
  PEDIDO_STATUS_VALUES,
  normalizeCep,
  normalizeNomeCliente,
  normalizePagamentoStatusValue,
  normalizePedidoStatus,
  normalizeTelefone,
} from "../utils/pedidoDomain";

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type PedidoStatusInput = PedidoStatus;

export type PedidoCreateInput = {
  email: string;
  mensagem: string;
  telefone?: string;
  local?: string;
  cep?: string;
  nomeCliente?: string;
  tipoServico?: string;
  area?: number | null;
  valorSimulado?: number | null;
  empresaId?: number | null;
  status?: PedidoStatusInput;
  pago?: boolean | null;
  pagamentoStatus?: PagamentoStatus;
};

export type PedidoUpdateInput = {
  email?: string;
  mensagem?: string;
  telefone?: string | null;
  local?: string | null;
  cep?: string | null;
  nomeCliente?: string | null;
  tipoServico?: string | null;
  area?: number | null;
  valorSimulado?: number | null;
  empresaId?: number | null;
  status?: PedidoStatusInput;
  pago?: boolean | null;
  pagamentoStatus?: PagamentoStatus;
};

const PEDIDO_STATUS_SET = new Set<PedidoStatusInput>(PEDIDO_STATUS_VALUES);
const PAGAMENTO_STATUS_SET = new Set<PagamentoStatus>(PAGAMENTO_STATUS_VALUES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

export function parseOptionalTrimmedString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    errors.push(`${fieldName} deve ser uma string`);
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} deve ser uma string`);
    return undefined;
  }

  return value.trim();
}

export function parseRequiredTrimmedString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${fieldName} deve ser uma string`);
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    errors.push(`${fieldName} é obrigatório`);
    return undefined;
  }

  return trimmed;
}

export function parseOptionalNumberLike(
  value: unknown,
  fieldName: string,
  errors: string[]
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`${fieldName} deve ser um número válido`);
      return undefined;
    }

    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed)) {
      errors.push(`${fieldName} deve ser um número válido`);
      return undefined;
    }

    return parsed;
  }

  errors.push(`${fieldName} deve ser numérico`);
  return undefined;
}

export function parseOptionalIntegerLike(
  value: unknown,
  fieldName: string,
  errors: string[]
): number | null | undefined {
  const parsed = parseOptionalNumberLike(value, fieldName, errors);

  if (parsed === undefined || parsed === null) {
    return parsed;
  }

  if (!Number.isInteger(parsed)) {
    errors.push(`${fieldName} deve ser um número inteiro`);
    return undefined;
  }

  return parsed;
}

export function parseOptionalPedidoStatus(
  value: unknown,
  errors: string[]
): PedidoStatusInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizePedidoStatus(value);

  if (!normalized || !PEDIDO_STATUS_SET.has(normalized)) {
    errors.push(
      `status inválido. Valores aceitos: ${PEDIDO_STATUS_VALUES.join(", ")}`
    );
    return undefined;
  }

  return normalized;
}

export function parseOptionalPagamentoStatus(
  value: unknown,
  errors: string[]
): PagamentoStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizePagamentoStatusValue(value);

  if (!normalized || !PAGAMENTO_STATUS_SET.has(normalized)) {
    errors.push(
      `pagamentoStatus inválido. Valores aceitos: ${PAGAMENTO_STATUS_VALUES.join(", ")}`
    );
    return undefined;
  }

  return normalized;
}

export function parseOptionalBooleanLike(
  value: unknown,
  fieldName: string,
  errors: string[]
): boolean | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  errors.push(`${fieldName} deve ser um booleano`);
  return undefined;
}

function parseOptionalTelefone(
  value: unknown,
  errors: string[]
): string | undefined {
  const parsed = parseOptionalTrimmedString(value, "telefone", errors);

  if (parsed === undefined) {
    return undefined;
  }

  const normalized = normalizeTelefone(parsed);

  if (normalized === undefined) {
    errors.push("telefone inválido");
    return undefined;
  }

  return normalized;
}

function parseOptionalCep(value: unknown, errors: string[]): string | undefined {
  const parsed = parseOptionalTrimmedString(value, "cep", errors);

  if (parsed === undefined) {
    return undefined;
  }

  const normalized = normalizeCep(parsed);

  if (normalized === undefined) {
    errors.push("cep inválido");
    return undefined;
  }

  return normalized;
}

function parseOptionalNomeCliente(
  value: unknown,
  errors: string[]
): string | undefined {
  const parsed = parseOptionalTrimmedString(value, "nomeCliente", errors);

  if (parsed === undefined) {
    return undefined;
  }

  const normalized = normalizeNomeCliente(parsed);

  if (normalized === undefined) {
    errors.push("nomeCliente inválido");
    return undefined;
  }

  return normalized;
}

export function validateCreatePedidoPayload(
  payload: unknown
): ValidationResult<PedidoCreateInput> {
  if (!isPlainObject(payload)) {
    return {
      success: false,
      errors: ["Payload inválido"],
    };
  }

  const errors: string[] = [];

  const data: PedidoCreateInput = {
    email: parseRequiredTrimmedString(payload.email, "email", errors) || "",
    mensagem:
      parseRequiredTrimmedString(payload.mensagem, "mensagem", errors) || "",
  };

  const telefone = parseOptionalTelefone(payload.telefone, errors);
  const local = parseOptionalTrimmedString(payload.local, "local", errors);
  const cep = parseOptionalCep(payload.cep, errors);
  const nomeCliente = parseOptionalNomeCliente(payload.nomeCliente, errors);
  const tipoServico = parseOptionalTrimmedString(
    payload.tipoServico,
    "tipoServico",
    errors
  );
  const area = parseOptionalNumberLike(payload.area, "area", errors);
  const valorSimulado = parseOptionalNumberLike(
    payload.valorSimulado,
    "valorSimulado",
    errors
  );
  const empresaId = parseOptionalIntegerLike(payload.empresaId, "empresaId", errors);
  const status = parseOptionalPedidoStatus(payload.status, errors);
  const pago = parseOptionalBooleanLike(payload.pago, "pago", errors);
  const pagamentoStatus = parseOptionalPagamentoStatus(
    payload.pagamentoStatus,
    errors
  );

  if (telefone !== undefined) data.telefone = telefone;
  if (local !== undefined) data.local = local;
  if (cep !== undefined) data.cep = cep;
  if (nomeCliente !== undefined) data.nomeCliente = nomeCliente;
  if (tipoServico !== undefined) data.tipoServico = tipoServico;
  if (area !== undefined) data.area = area;
  if (valorSimulado !== undefined) data.valorSimulado = valorSimulado;
  if (empresaId !== undefined) data.empresaId = empresaId;
  if (status !== undefined) data.status = status;
  if (pago !== undefined) data.pago = pago;
  if (pagamentoStatus !== undefined) data.pagamentoStatus = pagamentoStatus;

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data,
  };
}

export function validateUpdatePedidoPayload(
  payload: unknown
): ValidationResult<PedidoUpdateInput> {
  if (!isPlainObject(payload)) {
    return {
      success: false,
      errors: ["Payload inválido"],
    };
  }

  const errors: string[] = [];
  const data: PedidoUpdateInput = {};

  const email = parseOptionalTrimmedString(payload.email, "email", errors);
  const mensagem = parseOptionalTrimmedString(payload.mensagem, "mensagem", errors);
  const telefone = parseOptionalTelefone(payload.telefone, errors);
  const local = parseOptionalTrimmedString(payload.local, "local", errors);
  const cep = parseOptionalCep(payload.cep, errors);
  const nomeCliente = parseOptionalNomeCliente(payload.nomeCliente, errors);
  const tipoServico = parseOptionalTrimmedString(
    payload.tipoServico,
    "tipoServico",
    errors
  );
  const area = parseOptionalNumberLike(payload.area, "area", errors);
  const valorSimulado = parseOptionalNumberLike(
    payload.valorSimulado,
    "valorSimulado",
    errors
  );
  const empresaId = parseOptionalIntegerLike(payload.empresaId, "empresaId", errors);
  const status = parseOptionalPedidoStatus(payload.status, errors);
  const pago = parseOptionalBooleanLike(payload.pago, "pago", errors);
  const pagamentoStatus = parseOptionalPagamentoStatus(
    payload.pagamentoStatus,
    errors
  );

  if (payload.email !== undefined) {
    if (typeof payload.email === "string" && !payload.email.trim()) {
      errors.push("email não pode ser vazio");
    } else if (email !== undefined) {
      data.email = email;
    }
  }

  if (payload.mensagem !== undefined) {
    if (typeof payload.mensagem === "string" && !payload.mensagem.trim()) {
      errors.push("mensagem não pode ser vazia");
    } else if (mensagem !== undefined) {
      data.mensagem = mensagem;
    }
  }

  if (payload.telefone !== undefined) data.telefone = telefone ?? null;
  if (payload.local !== undefined) data.local = local ?? null;
  if (payload.cep !== undefined) data.cep = cep ?? null;
  if (payload.nomeCliente !== undefined) data.nomeCliente = nomeCliente ?? null;
  if (payload.tipoServico !== undefined) data.tipoServico = tipoServico ?? null;
  if (area !== undefined) data.area = area;
  if (valorSimulado !== undefined) data.valorSimulado = valorSimulado;
  if (empresaId !== undefined) data.empresaId = empresaId;
  if (status !== undefined) data.status = status;
  if (pago !== undefined) data.pago = pago;
  if (pagamentoStatus !== undefined) data.pagamentoStatus = pagamentoStatus;

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data,
  };
}
