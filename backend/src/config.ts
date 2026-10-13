import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function required(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value && value.trim() !== '') return value;
  if (!isProduction && devFallback !== undefined) return devFallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

export const config = {
  isProduction,
  port: Number(process.env.PORT || 3000),
  // In production a missing secret must stop the server, never fall back
  // to a guessable default.
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // When set, uploaded logos and signatures are stored in this Cloud Storage
  // bucket. When empty (local dev), they go to ./uploads on disk.
  gcsBucket: process.env.GCS_BUCKET || '',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
