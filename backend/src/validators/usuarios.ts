type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type UsuarioIdParams = {
  id: number;
};

export type UpdateUsuarioPayload = {
  nome?: string;
  email?: string;
  senha?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTrimmedString(
  value: unknown,
  fieldName: string,
  errors: string[],
  options?: {
    required?: boolean;
    minLength?: number;
  }
): string | undefined {
  const required = options?.required ?? false;
  const minLength = options?.minLength;

  if (value === undefined) {
    if (required) {
      errors.push(`${fieldName} é obrigatório`);
    }

    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} deve ser um texto`);
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    if (required) {
      errors.push(`${fieldName} é obrigatório`);
    } else {
      errors.push(`${fieldName} não pode ser vazio`);
    }

    return undefined;
  }

  if (minLength !== undefined && normalized.length < minLength) {
    errors.push(`${fieldName} deve ter no mínimo ${minLength} caracteres`);
    return undefined;
  }

  return normalized;
}

function normalizeEmail(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | undefined {
  const normalized = normalizeTrimmedString(value, fieldName, errors);

  if (!normalized) {
    return undefined;
  }

  const email = normalized.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${fieldName} inválido`);
    return undefined;
  }

  return email;
}

function normalizeId(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function validateUsuarioIdParams(
  input: unknown
): ValidationResult<UsuarioIdParams> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["id inválido"],
    };
  }

  const id = normalizeId(input.id);

  if (!Number.isFinite(id)) {
    return {
      success: false,
      errors: ["id inválido"],
    };
  }

  return {
    success: true,
    data: { id: id as number },
  };
}

export function validateUpdateUsuarioPayload(
  input: unknown
): ValidationResult<UpdateUsuarioPayload> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];
  const data: UpdateUsuarioPayload = {};

  if (input.nome !== undefined) {
    const nome = normalizeTrimmedString(input.nome, "nome", errors);
    if (nome !== undefined) {
      data.nome = nome;
    }
  }

  if (input.email !== undefined) {
    const email = normalizeEmail(input.email, "email", errors);
    if (email !== undefined) {
      data.email = email;
    }
  }

  if (input.senha !== undefined) {
    const senha = normalizeTrimmedString(input.senha, "senha", errors, {
      minLength: 6,
    });

    if (senha !== undefined) {
      data.senha = senha;
    }
  }

  if (Object.keys(data).length === 0 && errors.length === 0) {
    errors.push("Nenhum campo válido informado para atualização");
  }

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