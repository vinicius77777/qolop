import { Response } from "express";

const DATABASE_UNAVAILABLE_STATUS = 503;
const DATABASE_UNAVAILABLE_ERROR = "Serviço temporariamente indisponível";

function getErrorName(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const maybeError = error as { name?: unknown };

  return typeof maybeError.name === "string" ? maybeError.name : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const maybeError = error as { message?: unknown };

  return typeof maybeError.message === "string" ? maybeError.message : undefined;
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const name = getErrorName(error);
  const message = getErrorMessage(error);

  if (name === "PrismaClientInitializationError") {
    return true;
  }

  if (!message) {
    return false;
  }

  return /can't reach database server/i.test(message) || /can't connect to database/i.test(message);
}

export function sendDatabaseUnavailableError(res: Response): Response {
  return res.status(DATABASE_UNAVAILABLE_STATUS).json({
    error: DATABASE_UNAVAILABLE_ERROR,
  });
}
