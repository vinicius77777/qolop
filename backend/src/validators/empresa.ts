type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type EmpresaAnalyticsQuery = {
  empresaId: number | null;
};

export type EmpresaAmbientesQuery = {
  empresaId: number | null;
};

export type EmpresaSlugParams = {
  slug: string;
};

export type UpdateEmpresaPayload = {
  empresaId?: number;
  descricao?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  publico?: boolean;
};

function normalizeTrimmedString(
  value: unknown,
  fieldName: string,
  errors: string[],
  options?: {
    required?: boolean;
    allowNull?: boolean;
    emptyAsNull?: boolean;
  }
): string | null | undefined {
  const required = options?.required ?? false;
  const allowNull = options?.allowNull ?? false;
  const emptyAsNull = options?.emptyAsNull ?? false;

  if (value === undefined) {
    if (required) {
      errors.push(`${fieldName} é obrigatório`);
    }
    return undefined;
  }

  if (value === null) {
    if (allowNull) {
      return null;
    }

    errors.push(`${fieldName} é inválido`);
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
      return undefined;
    }

    return emptyAsNull ? null : "";
  }

  return normalized;
}

function normalizeOptionalNumber(
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

    if (["true", "1", "sim", "yes"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "nao", "não", "no"].includes(normalized)) {
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

export function validateEmpresaAnalyticsQuery(
  input: unknown
): ValidationResult<EmpresaAnalyticsQuery> {
  const errors: string[] = [];
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const empresaId = normalizeOptionalNumber(
    source.empresaId,
    "empresaId",
    errors
  );

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      empresaId: empresaId ?? null,
    },
  };
}

export function validateEmpresaAmbientesQuery(
  input: unknown
): ValidationResult<EmpresaAmbientesQuery> {
  const errors: string[] = [];
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const empresaId = normalizeOptionalNumber(
    source.empresaId,
    "empresaId",
    errors
  );

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      empresaId: empresaId ?? null,
    },
  };
}

export function validateEmpresaSlugParams(
  input: unknown
): ValidationResult<EmpresaSlugParams> {
  const errors: string[] = [];
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const slug = normalizeTrimmedString(source.slug, "slug", errors, {
    required: true,
  });

  if (slug && slug.includes("/")) {
    errors.push("slug é inválido");
  }

  if (errors.length > 0 || !slug) {
    return {
      success: false,
      errors: errors.length > 0 ? errors : ["slug é obrigatório"],
    };
  }

  return {
    success: true,
    data: { slug },
  };
}

export function validateUpdateEmpresaPayload(
  input: unknown
): ValidationResult<UpdateEmpresaPayload> {
  const errors: string[] = [];
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const empresaId = normalizeOptionalNumber(
    source.empresaId,
    "empresaId",
    errors
  );
  const descricao = normalizeTrimmedString(source.descricao, "descrição", errors, {
    allowNull: true,
    emptyAsNull: true,
  });
  const telefone = normalizeTrimmedString(source.telefone, "telefone", errors, {
    allowNull: true,
    emptyAsNull: true,
  });
  const whatsapp = normalizeTrimmedString(source.whatsapp, "whatsapp", errors, {
    allowNull: true,
    emptyAsNull: true,
  });
  const publico = normalizeOptionalBoolean(source.publico, "publico", errors);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const data: UpdateEmpresaPayload = {};

  if (empresaId !== undefined && empresaId !== null) {
    data.empresaId = empresaId;
  }

  if (descricao !== undefined) {
    data.descricao = descricao;
  }

  if (telefone !== undefined) {
    data.telefone = telefone;
  }

  if (whatsapp !== undefined) {
    data.whatsapp = whatsapp;
  }

  if (publico !== undefined) {
    data.publico = publico;
  }

  return {
    success: true,
    data,
  };
}