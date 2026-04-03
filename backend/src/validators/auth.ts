type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type RegisterPayload = {
  nome: string;
  email: string;
  senha: string;
  empresaNome?: string | null;
  orgaoPublico?: boolean;
};

export type LoginPayload = {
  email: string;
  senha: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  errors: string[],
  options?: {
    minLength?: number;
  }
): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${fieldName} é obrigatório`);
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    errors.push(`${fieldName} é obrigatório`);
    return undefined;
  }

  if (options?.minLength && normalized.length < options.minLength) {
    errors.push(`${fieldName} deve ter no mínimo ${options.minLength} caracteres`);
    return undefined;
  }

  return normalized;
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} deve ser um texto`);
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${fieldName} é obrigatório`);
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    errors.push(`${fieldName} é obrigatório`);
    return undefined;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    errors.push(`${fieldName} é inválido`);
    return undefined;
  }

  return normalized;
}

function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
  errors: string[]
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "sim", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "nao", "não", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  errors.push(`${fieldName} deve ser booleano`);
  return undefined;
}

export function validateRegisterPayload(
  input: unknown
): ValidationResult<RegisterPayload> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];

  const nome = normalizeRequiredString(input.nome, "nome", errors, {
    minLength: 2,
  });
  const email = normalizeEmail(input.email, "email", errors);
  const senha = normalizeRequiredString(input.senha, "senha", errors, {
    minLength: 6,
  });
  const empresaNome = normalizeOptionalString(
    input.empresaNome,
    "empresaNome",
    errors
  );
  const orgaoPublico = normalizeOptionalBoolean(
    input.orgaoPublico,
    "orgaoPublico",
    errors
  );

  if (errors.length > 0 || !nome || !email || !senha) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      nome,
      email,
      senha,
      ...(empresaNome !== undefined && { empresaNome }),
      ...(orgaoPublico !== undefined && { orgaoPublico }),
    },
  };
}

export function validateLoginPayload(
  input: unknown
): ValidationResult<LoginPayload> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];

  const email = normalizeEmail(input.email, "email", errors);
  const senha = normalizeRequiredString(input.senha, "senha", errors, {
    minLength: 6,
  });

  if (errors.length > 0 || !email || !senha) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      email,
      senha,
    },
  };
}
