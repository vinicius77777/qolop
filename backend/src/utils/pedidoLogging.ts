export type PedidoLogLevel = "info" | "warn" | "error";

export type PedidoLogPayload = {
  event: string;
  level?: PedidoLogLevel;
  requestId?: string | null;
  actor?: {
    id?: number | string | null;
    role?: string | null;
    empresaId?: number | string | null;
  } | null;
  pedidoId?: number | string | null;
  empresaId?: number | string | null;
  filters?: Record<string, unknown> | null;
  changes?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  error?: unknown;
};

const SENSITIVE_KEYS = new Set([
  "nomeCliente",
  "email",
  "telefone",
  "cep",
  "mensagem",
  "local",
  "search",
]);

const toSerializableError = (error: unknown) => {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
};

const maskString = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("@")) {
    const [localPart, domainPart] = trimmed.split("@");
    const localMasked =
      localPart.length <= 2
        ? `${localPart.charAt(0) || "*"}***`
        : `${localPart.slice(0, 2)}***`;

    return `${localMasked}@${domainPart || "***"}`;
  }

  const digits = trimmed.replace(/\D+/g, "");

  if (digits.length >= 8) {
    return `***${digits.slice(-4)}`;
  }

  if (trimmed.length <= 2) {
    return "***";
  }

  return `${trimmed.slice(0, 2)}***`;
};

const sanitizeUnknownValue = (key: string, value: unknown): unknown => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    const sanitizedItems = value
      .map((item) => sanitizeUnknownValue(key, item))
      .filter((item) => item !== undefined);

    return sanitizedItems.length ? sanitizedItems : undefined;
  }

  if (typeof value === "object") {
    return sanitizeRecordForLog(value as Record<string, unknown>);
  }

  if (typeof value === "string" && SENSITIVE_KEYS.has(key)) {
    return maskString(value);
  }

  return value;
};

const sanitizeRecordForLog = (record: Record<string, unknown>) => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const sanitizedValue = sanitizeUnknownValue(key, value);

    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  }

  return sanitized;
};

export const withPedidoLogDuration = (
  startedAt: number,
  meta?: Record<string, unknown> | null
) => ({
  ...(meta ?? {}),
  durationMs: Math.max(0, Date.now() - startedAt),
});

export const logPedidoEvent = (payload: PedidoLogPayload) => {
  const { level = "info", error, filters, changes, ...rest } = payload;

  const entry = {
    domain: "pedido",
    level,
    timestamp: new Date().toISOString(),
    ...rest,
    filters: filters ? sanitizePedidoFiltersForLog(filters) : undefined,
    changes: changes ? sanitizePedidoChangesForLog(changes) : undefined,
    error: toSerializableError(error),
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

export const sanitizePedidoFiltersForLog = (filters: Record<string, unknown>) => {
  return sanitizeRecordForLog(filters);
};

export const sanitizePedidoChangesForLog = (changes: Record<string, unknown>) => {
  return sanitizeRecordForLog(changes);
};