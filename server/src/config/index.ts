import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function resolveJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();

  if (isProduction) {
    if (!configuredSecret) {
      throw new Error('[FATAL] In production mode, JWT_SECRET must be explicitly configured to a secure, unique secret.');
    }
    if (configuredSecret.length < 32) {
      throw new Error('[FATAL] In production mode, JWT_SECRET must be at least 32 characters in length.');
    }
    return configuredSecret;
  }

  return configuredSecret || 'edusphere-development-secret-do-not-use-in-production';
}

function resolveApiBaseUrl(): string {
  const configured = (process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL)?.trim();
  if (isProduction) {
    if (!configured) {
      // In Render deployments, RENDER_EXTERNAL_URL is automatically injected by Render
      const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
      if (renderUrl) return renderUrl.replace(/\/+$/, '');
      return 'https://unique-e-learning-platform.onrender.com';
    }
    return configured.replace(/\/+$/, '');
  }
  return (configured || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
}

function resolveStoragePublicUrl(): string {
  const configured = (
    process.env.STORAGE_PUBLIC_URL ||
    process.env.R2_PUBLIC_DOMAIN ||
    process.env.CDN_HOSTNAME
  )?.trim();
  if (configured) {
    return configured.startsWith('http') ? configured.replace(/\/+$/, '') : `https://${configured.replace(/\/+$/, '')}`;
  }
  return 'https://stream.edusphere.io';
}

if (isProduction) {
  const mongoUri = process.env.MONGODB_URI || '';
  if (!mongoUri || mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
    throw new Error(
      '[FATAL] In production mode, MONGODB_URI must be a remote MongoDB Atlas connection string. ' +
      'A localhost URI will fail on Render — configure MONGODB_URI in the Render environment variables panel.'
    );
  }
}

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv,
  isProduction,
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  apiBaseUrl: resolveApiBaseUrl(),
  storagePublicUrl: resolveStoragePublicUrl(),
};
