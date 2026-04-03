type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type CreateLeadPayload = {
  empresaId: number;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  mensagem?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequiredNumber(
  value: unknown,
  fieldName: string,
  errors: string[]
): number | undefined {
  if (value === undefined || value === null || value === "") {
    errors.push(`${fieldName} é obrigatório`);
    return undefined;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldName} deve ser numérico`);
    return undefined;
  }

  return parsed;
}

function parseOptionalNullableString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} deve ser um texto`);
    return undefined;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function parseOptionalNullableEmail(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | null | undefined {
  const normalized = parseOptionalNullableString(value, fieldName, errors);

  if (normalized === undefined || normalized === null) {
    return normalized;
  }

  const email = normalized.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${fieldName} inválido`);
    return undefined;
  }

  return email;
}

export function validateCreateLeadPayload(
  input: unknown
): ValidationResult<CreateLeadPayload> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];

  const empresaId = parseRequiredNumber(input.empresaId, "empresaId", errors);
  const nome = parseOptionalNullableString(input.nome, "nome", errors);
  const email = parseOptionalNullableEmail(input.email, "email", errors);
  const telefone = parseOptionalNullableString(input.telefone, "telefone", errors);
  const mensagem = parseOptionalNullableString(input.mensagem, "mensagem", errors);

  const hasContactContent = [nome, email, telefone, mensagem].some(
    (field) => field !== undefined && field !== null
  );

  if (!hasContactContent) {
    errors.push("Informe ao menos um campo entre nome, email, telefone ou mensagem");
  }

  if (errors.length > 0 || empresaId === undefined) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      empresaId,
      ...(nome !== undefined && { nome }),
      ...(email !== undefined && { email }),
      ...(telefone !== undefined && { telefone }),
      ...(mensagem !== undefined && { mensagem }),
    },
  };
}