import { Response } from 'express';

export function sendValidationError(res: Response, message: string, details?: string[]): Response {
  return res.status(400).json({
    error: message,
    details: details && details.length > 0 ? details : undefined,
  });
}