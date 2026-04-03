export type AppLogLevel = "info" | "warn" | "error";

export type AppLogActor = {
  id?: number | string | null;
  role?: string | null;
  empresaId?: number | string | null;
} | null;

export type AppLogPayload = {
  domain: string;
  event: string;
  level?: AppLogLevel;
  requestId?: string | null;
  actor?: AppLogActor;
  entityId?: number | string | null;
  empresaId?: number | string | null;
  filters?: Record<string, unknown> | null;
  changes?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  error?: unknown;
};

const SENSITIVE_KEYS = new Set([
  "nome",
  "nomeCliente",
  "email",
  "telefone",
  "whatsapp",
  "cep",
  "mensagem",
  "local",
  "search",
  "senha",
  "password",
  "clienteEmail",
  "ip",
  "userAgent",
  "endereco",
  "descricao",
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

export const withLogDuration = (
  startedAt: number,
  meta?: Record<string, unknown> | null
) => ({
  ...(meta ?? {}),
  durationMs: Math.max(0, Date.now() - startedAt),
});

export const logAppEvent = (payload: AppLogPayload) => {
  const { level = "info", error, filters, changes, ...rest } = payload;

  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...rest,
    filters: filters ? sanitizeRecordForLog(filters) : undefined,
    changes: changes ? sanitizeRecordForLog(changes) : undefined,
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

export const sanitizeLogFilters = (filters: Record<string, unknown>) => {
  return sanitizeRecordForLog(filters);
};

export const sanitizeLogChanges = (changes: Record<string, unknown>) => {
  return sanitizeRecordForLog(changes);
};
