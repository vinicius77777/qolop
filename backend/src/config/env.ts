import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

function parseAllowedOrigins(value?: string): string[] {
  if (!value) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function parseNodeEnv(value?: string): 'development' | 'test' | 'production' {
  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

export const NODE_ENV = parseNodeEnv(process.env.NODE_ENV);
export const JWT_SECRET = process.env.JWT_SECRET || 'seu_jwt_secret_super_seguro';
export const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}
