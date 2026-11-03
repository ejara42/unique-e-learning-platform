import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || 'edusphere-super-secret-jwt-key-2026-production';

// Production security barrier: Disallow default fallback JWT secret in production mode
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'edusphere-super-secret-jwt-key-2026-production') {
    throw new Error('[FATAL] In production mode, JWT_SECRET must be explicitly configured to a secure, unique secret.');
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('[FATAL] In production mode, JWT_SECRET must be at least 32 characters in length.');
  }

  // Production safety barrier: Prevent localhost MongoDB connection on Render
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
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
