type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

type NullableString = string | null;
type OptionalNullableString = string | null | undefined;

export type AmbienteCreateInput = {
  titulo: string;
  descricao: string;
  linkVR: string;
  siteUrl?: string | null;
  empresaId?: number | null;
  categoria?: OptionalNullableString;
  publico: boolean;
  cidade?: OptionalNullableString;
  pais?: OptionalNullableString;
  latitude: number;
  longitude: number;
  endereco?: OptionalNullableString;
  cep?: OptionalNullableString;
  clienteEmail?: string | null;
  pedidoId?: number | null;
};

export type AmbienteUpdateInput = {
  titulo?: string;
  descricao?: string;
  linkVR?: string;
  siteUrl?: OptionalNullableString;
  categoria?: OptionalNullableString;
  publico?: boolean;
  cidade?: OptionalNullableString;
  pais?: OptionalNullableString;
  latitude?: number | null;
  longitude?: number | null;
  endereco?: OptionalNullableString;
  cep?: OptionalNullableString;
};

export type NumericIdInput = {
  id: number;
};

export type AmbienteViewInput = {
  cidade?: string;
  pais?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseRequiredTrimmedString(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${fieldLabel} é obrigatório`);
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    errors.push(`${fieldLabel} é obrigatório`);
    return undefined;
  }

  return normalized;
}

function parseOptionalNumber(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldLabel} inválido`);
    return undefined;
  }

  return parsed;
}

function parseNullableNumber(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldLabel} inválido`);
    return undefined;
  }

  return parsed;
}

function parseBooleanLike(
  value: unknown,
  fieldLabel: string,
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

    if (["false", "0", "não", "nao", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  errors.push(`${fieldLabel} inválido`);
  return undefined;
}

function parseEmailLike(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): string | null | undefined {
  const normalized = normalizeNullableString(value);

  if (normalized === undefined) {
    if (value === undefined) {
      return undefined;
    }

    errors.push(`${fieldLabel} inválido`);
    return undefined;
  }

  if (normalized === null) {
    return null;
  }

  const email = normalized.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${fieldLabel} inválido`);
    return undefined;
  }

  return email;
}

function parseUrlLike(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): string | null | undefined {
  const normalized = normalizeNullableString(value);

  if (normalized === undefined) {
    if (value === undefined) {
      return undefined;
    }

    errors.push(`${fieldLabel} inválido`);
    return undefined;
  }

  if (normalized === null) {
    return null;
  }

  try {
    const url = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push(`${fieldLabel} inválido`);
      return undefined;
    }
    return url.toString();
  } catch {
    errors.push(`${fieldLabel} inválido`);
    return undefined;
  }
}

export function validateNumericId(input: unknown): ValidationResult<NumericIdInput> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["id inválido"],
    };
  }

  const id = parseOptionalNumber(input.id, "id", []);

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

export function validateCreateAmbientePayload(
  input: unknown
): ValidationResult<AmbienteCreateInput> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];

  const titulo = parseRequiredTrimmedString(input.titulo, "Título", errors);
  const descricao = parseRequiredTrimmedString(
    input.descricao,
    "Descrição",
    errors
  );
  const linkVR = parseRequiredTrimmedString(input.linkVR, "Link VR", errors);
  const siteUrl = parseUrlLike(input.siteUrl, "Site", errors);
  const empresaId = parseNullableNumber(input.empresaId, "empresaId", errors);
  const categoria = normalizeNullableString(input.categoria);
  const publico = parseBooleanLike(input.publico, "publico", errors);
  const cidade = normalizeNullableString(input.cidade);
  const pais = normalizeNullableString(input.pais);
  const latitude = parseOptionalNumber(input.latitude, "latitude", errors);
  const longitude = parseOptionalNumber(input.longitude, "longitude", errors);
  const endereco = normalizeNullableString(input.endereco);
  const cep = normalizeNullableString(input.cep);
  const clienteEmail = parseEmailLike(
    input.clienteEmail,
    "clienteEmail",
    errors
  );
  const pedidoId = parseNullableNumber(input.pedidoId, "pedidoId", errors);

  if (latitude === undefined) {
    errors.push("latitude é obrigatória");
  }

  if (longitude === undefined) {
    errors.push("longitude é obrigatória");
  }

  if (errors.length > 0 || !titulo || !descricao || !linkVR || latitude === undefined || longitude === undefined) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      titulo,
      descricao,
      linkVR,
      siteUrl,
      empresaId,
      categoria,
      publico: publico ?? true,
      cidade,
      pais,
      latitude,
      longitude,
      endereco,
      cep,
      clienteEmail,
      pedidoId,
    },
  };
}

export function validateUpdateAmbientePayload(
  input: unknown
): ValidationResult<AmbienteUpdateInput> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];
  const data: AmbienteUpdateInput = {};

  if (input.titulo !== undefined) {
    const titulo = parseRequiredTrimmedString(input.titulo, "Título", errors);
    if (titulo !== undefined) data.titulo = titulo;
  }

  if (input.descricao !== undefined) {
    const descricao = parseRequiredTrimmedString(
      input.descricao,
      "Descrição",
      errors
    );
    if (descricao !== undefined) data.descricao = descricao;
  }

  if (input.linkVR !== undefined) {
    const linkVR = parseRequiredTrimmedString(input.linkVR, "Link VR", errors);
    if (linkVR !== undefined) data.linkVR = linkVR;
  }

  if (input.siteUrl !== undefined) {
    const siteUrl = parseUrlLike(input.siteUrl, "Site", errors);
    if (siteUrl !== undefined) data.siteUrl = siteUrl;
  }

  if (input.categoria !== undefined) {
    const categoria = normalizeNullableString(input.categoria);
    if (categoria === undefined && input.categoria !== undefined) {
      errors.push("Categoria inválida");
    } else {
      data.categoria = categoria;
    }
  }

  if (input.publico !== undefined) {
    const publico = parseBooleanLike(input.publico, "publico", errors);
    if (publico !== undefined) data.publico = publico;
  }

  if (input.cidade !== undefined) {
    const cidade = normalizeNullableString(input.cidade);
    if (cidade === undefined && input.cidade !== undefined) {
      errors.push("Cidade inválida");
    } else {
      data.cidade = cidade;
    }
  }

  if (input.pais !== undefined) {
    const pais = normalizeNullableString(input.pais);
    if (pais === undefined && input.pais !== undefined) {
      errors.push("País inválido");
    } else {
      data.pais = pais;
    }
  }

  if (input.latitude !== undefined) {
    const latitude = parseNullableNumber(input.latitude, "latitude", errors);
    if (latitude !== undefined) data.latitude = latitude;
  }

  if (input.longitude !== undefined) {
    const longitude = parseNullableNumber(input.longitude, "longitude", errors);
    if (longitude !== undefined) data.longitude = longitude;
  }

  if (input.endereco !== undefined) {
    const endereco = normalizeNullableString(input.endereco);
    if (endereco === undefined && input.endereco !== undefined) {
      errors.push("Endereço inválido");
    } else {
      data.endereco = endereco;
    }
  }

  if (input.cep !== undefined) {
    const cep = normalizeNullableString(input.cep);
    if (cep === undefined && input.cep !== undefined) {
      errors.push("CEP inválido");
    } else {
      data.cep = cep;
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

export function validateAmbienteViewPayload(
  input: unknown
): ValidationResult<AmbienteViewInput> {
  if (input === undefined || input === null) {
    return {
      success: true,
      data: {},
    };
  }

  if (!isRecord(input)) {
    return {
      success: false,
      errors: ["Dados inválidos"],
    };
  }

  const errors: string[] = [];
  const cidade = normalizeOptionalString(input.cidade);
  const pais = normalizeOptionalString(input.pais);

  if (input.cidade !== undefined && cidade === undefined) {
    errors.push("cidade inválida");
  }

  if (input.pais !== undefined && pais === undefined) {
    errors.push("pais inválido");
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      ...(cidade !== undefined && { cidade }),
      ...(pais !== undefined && { pais }),
    },
  };
}
