"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
}
exports.config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
