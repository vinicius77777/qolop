import {
  normalizeCep,
  normalizeNomeCliente,
  normalizeOptionalPedidoMultilineString,
  normalizeOptionalPedidoString,
  normalizePagamentoStatusValue,
  normalizePedidoEmail,
  normalizePedidoStatus,
  normalizeTelefone,
} from "../utils/pedidoDomain";
import { logPedidoEvent } from "../utils/pedidoLogging";

type LegacyPedidoRecord = {
  id: number | string;
  nomeCliente?: string | null;
  email?: string | null;
  telefone?: string | null;
  local?: string | null;
  cep?: string | null;
  mensagem?: string | null;
  observacoes?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status?: string | null;
  pagamentoStatus?: string | null;
  pago?: boolean | null;
};

type NormalizedLegacyPedido = Record<string, unknown>;

type NormalizeLegacyPedidoResult<T extends LegacyPedidoRecord> = {
  normalized: T & NormalizedLegacyPedido;
  changes: Partial<Record<keyof T | string, unknown>>;
  changedFields: string[];
};

type PrismaLegacyClient = {
  pedido: {
    findMany: (args?: Record<string, unknown>) => Promise<LegacyPedidoRecord[]>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
    count?: (args?: Record<string, unknown>) => Promise<number>;
  };
  $disconnect?: () => Promise<void>;
};

const nullableStringFieldNames = new Set([
  "nomeCliente",
  "email",
  "telefone",
  "local",
  "cep",
  "mensagem",
  "observacoes",
  "rua",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado",
]);

export const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const toNormalizedNullableValue = (value: unknown, normalized: string | undefined) => {
  if (normalized === undefined) {
    return normalizeNullableString(value);
  }

  return normalized === "" ? null : normalized;
};

const normalizeLegacyFieldValue = (key: string, value: unknown): unknown => {
  switch (key) {
    case "nomeCliente":
      return toNormalizedNullableValue(value, normalizeNomeCliente(value));
    case "email":
      return toNormalizedNullableValue(value, normalizePedidoEmail(value));
    case "telefone":
      return toNormalizedNullableValue(value, normalizeTelefone(value));
    case "cep":
      return toNormalizedNullableValue(value, normalizeCep(value));
    case "mensagem":
    case "observacoes":
      return toNormalizedNullableValue(value, normalizeOptionalPedidoMultilineString(value));
    case "local":
    case "rua":
    case "numero":
    case "complemento":
    case "bairro":
    case "cidade":
    case "estado":
      return toNormalizedNullableValue(value, normalizeOptionalPedidoString(value));
    case "status":
      return normalizePedidoStatus(value) ?? "novo";
    case "pagamentoStatus": {
      const pagamentoStatus = normalizePagamentoStatusValue(value);
      return pagamentoStatus ?? undefined;
    }
    default:
      if (nullableStringFieldNames.has(key)) {
        return normalizeNullableString(value);
      }

      return value;
  }
};

const areValuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export const normalizeLegacyPedido = <T extends LegacyPedidoRecord>(
  pedido: T
): NormalizeLegacyPedidoResult<T> => {
  const normalizedBase: Record<string, unknown> = { ...pedido };

  for (const [key, value] of Object.entries(pedido)) {
    if (key === "pagamentoStatus" || key === "pago" || key === "status") {
      continue;
    }

    normalizedBase[key] = normalizeLegacyFieldValue(key, value);
  }

  normalizedBase.status = normalizePedidoStatus(pedido.status) ?? "novo";

  const pagamentoStatus =
    normalizePagamentoStatusValue(pedido.pagamentoStatus ?? pedido.pago) ?? "nao_pago";
  normalizedBase.pagamentoStatus = pagamentoStatus;
  normalizedBase.pago = pagamentoStatus !== "nao_pago";

  const changes: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(normalizedBase)) {
    if (!areValuesEqual(value, (pedido as Record<string, unknown>)[key])) {
      changes[key] = value;
      changedFields.push(key);
    }
  }

  return {
    normalized: normalizedBase as T & NormalizedLegacyPedido,
    changes: changes as Partial<Record<keyof T | string, unknown>>,
    changedFields,
  };
};

const getPrismaClient = (): PrismaLegacyClient => {
  const prisma = (globalThis as typeof globalThis & {
    prisma?: PrismaLegacyClient;
  }).prisma;

  if (!prisma) {
    throw new Error("Prisma client is not available in global scope.");
  }

  return prisma;
};

type NormalizeLegacyCliOptions = {
  dryRun: boolean;
  limit?: number;
  offset: number;
};

const parsePositiveInteger = (value: string | undefined, flagName: string) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid value for ${flagName}: ${value}`);
  }

  return parsed;
};

export const parseNormalizeLegacyCliOptions = (
  argv: string[] = process.argv.slice(2)
): NormalizeLegacyCliOptions => {
  const options: NormalizeLegacyCliOptions = {
    dryRun: false,
    offset: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--limit") {
      options.limit = parsePositiveInteger(argv[index + 1], "--limit");
      index += 1;
      continue;
    }

    if (arg === "--offset") {
      options.offset = parsePositiveInteger(argv[index + 1], "--offset") ?? 0;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

export const main = async (
  rawOptions: Partial<NormalizeLegacyCliOptions> = {}
) => {
  const startedAt = Date.now();
  const prisma = getPrismaClient();
  const options: NormalizeLegacyCliOptions = {
    dryRun: rawOptions.dryRun ?? false,
    limit: rawOptions.limit,
    offset: rawOptions.offset ?? 0,
  };

  let total = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let totalAvailable: number | null = null;

  logPedidoEvent({
    event: "pedido.normalize_legacy.start",
    meta: {
      startedAt: new Date(startedAt).toISOString(),
      dryRun: options.dryRun,
      limit: options.limit ?? null,
      offset: options.offset,
    },
  });

  try {
    if (typeof prisma.pedido.count === "function") {
      totalAvailable = await prisma.pedido.count();
    }

    const pedidos = await prisma.pedido.findMany({
      orderBy: { id: "asc" },
      ...(options.offset > 0 ? { skip: options.offset } : {}),
      ...(options.limit !== undefined ? { take: options.limit } : {}),
    });
    total = pedidos.length;

    for (const pedido of pedidos) {
      try {
        const result = normalizeLegacyPedido(pedido);

        if (!result.changedFields.length) {
          skipped += 1;

          logPedidoEvent({
            event: "pedido.normalize_legacy.skip",
            pedidoId: pedido.id,
            meta: {
              reason: "already_normalized",
            },
          });

          continue;
        }

        if (!options.dryRun) {
          await prisma.pedido.update({
            where: { id: pedido.id },
            data: result.changes,
          });
        }

        updated += 1;

        logPedidoEvent({
          event: options.dryRun
            ? "pedido.normalize_legacy.preview"
            : "pedido.normalize_legacy.updated",
          pedidoId: pedido.id,
          changes: result.changes,
          meta: {
            changedFields: result.changedFields,
            dryRun: options.dryRun,
          },
        });
      } catch (error) {
        errors += 1;

        logPedidoEvent({
          event: "pedido.normalize_legacy.item_error",
          level: "error",
          pedidoId: pedido.id,
          error,
        });
      }
    }

    logPedidoEvent({
      event: "pedido.normalize_legacy.finish",
      meta: {
        total,
        totalAvailable,
        updated,
        skipped,
        errors,
        dryRun: options.dryRun,
        limit: options.limit ?? null,
        offset: options.offset,
        durationMs: Math.max(0, Date.now() - startedAt),
      },
    });
  } finally {
    if (typeof prisma.$disconnect === "function") {
      await prisma.$disconnect();
    }
  }

  return {
    total,
    totalAvailable,
    updated,
    skipped,
    errors,
    dryRun: options.dryRun,
    limit: options.limit ?? null,
    offset: options.offset,
  };
};

if (require.main === module) {
  main(parseNormalizeLegacyCliOptions())
    .then((summary) => {
      console.log(
        JSON.stringify({
          event: "pedido.normalize_legacy.complete",
          ...summary,
        })
      );
    })
    .catch((error) => {
      logPedidoEvent({
        event: "pedido.normalize_legacy.fatal_error",
        level: "error",
        error,
      });
      process.exitCode = 1;
    });
}
