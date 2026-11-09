"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionState = void 0;
exports.connectMongoDB = connectMongoDB;
exports.disconnectMongoDB = disconnectMongoDB;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
exports.connectionState = {
    isConnected: false,
    uri: config_1.config.mongoUri,
    error: null,
};
// Global Mongoose connection lifecycle listeners
mongoose_1.default.connection.on('connected', () => {
    exports.connectionState.isConnected = true;
    exports.connectionState.databaseName = mongoose_1.default.connection.name;
    exports.connectionState.error = null;
    console.log(`[EduSphere DB] Mongoose connected to database: ${mongoose_1.default.connection.name}`);
});
mongoose_1.default.connection.on('disconnected', () => {
    exports.connectionState.isConnected = false;
    console.warn('[EduSphere DB] Mongoose connection lost (disconnected). Readiness check will signal degradation.');
});
mongoose_1.default.connection.on('reconnected', () => {
    exports.connectionState.isConnected = true;
    exports.connectionState.error = null;
    console.log('[EduSphere DB] Mongoose successfully reconnected.');
});
mongoose_1.default.connection.on('error', (err) => {
    exports.connectionState.error = err?.message || 'Database connection error';
    console.error('[EduSphere DB Error]', err);
});
async function connectMongoDB(customUri) {
    const targetUri = customUri || config_1.config.mongoUri;
    exports.connectionState.uri = targetUri;
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            exports.connectionState.isConnected = true;
            return true;
        }
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(targetUri, {
            serverSelectionTimeoutMS: 4000,
            connectTimeoutMS: 4000,
        });
        exports.connectionState.isConnected = true;
        exports.connectionState.databaseName = mongoose_1.default.connection.name;
        exports.connectionState.error = null;
        console.log(`[EduSphere DB] Connected to MongoDB: ${mongoose_1.default.connection.host}:${mongoose_1.default.connection.port}/${mongoose_1.default.connection.name}`);
        return true;
    }
    catch (err) {
        exports.connectionState.isConnected = false;
        exports.connectionState.error = err.message || 'Failed to connect to MongoDB';
        // Production fail-safe: Never silently fallback to in-memory in production!
        if (config_1.config.isProduction) {
            console.error(`[FATAL] [EduSphere DB] Production MongoDB connection failure (${err.message}). Halting startup to prevent data loss.`);
            throw new Error(`Production MongoDB connection failure: ${err.message}`);
        }
        console.error(`[EduSphere DB] MongoDB unavailable (${err.message}). Database-backed operations will fail closed.`);
        return false;
    }
}
async function disconnectMongoDB() {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.disconnect();
        exports.connectionState.isConnected = false;
        console.log('[EduSphere DB] Disconnected from MongoDB');
    }
}
