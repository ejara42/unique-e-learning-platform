"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
function resolveJwtSecret() {
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
if (isProduction) {
    const mongoUri = process.env.MONGODB_URI || '';
    if (!mongoUri || mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
        throw new Error('[FATAL] In production mode, MONGODB_URI must be a remote MongoDB Atlas connection string. ' +
            'A localhost URI will fail on Render — configure MONGODB_URI in the Render environment variables panel.');
    }
}
exports.config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
    nodeEnv,
    isProduction,
    jwtSecret: resolveJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
