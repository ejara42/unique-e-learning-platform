import mongoose from 'mongoose';
import { config } from '../config';

export interface MongoConnectionState {
  isConnected: boolean;
  uri: string;
  databaseName?: string;
  error?: string | null;
}

export const connectionState: MongoConnectionState = {
  isConnected: false,
  uri: config.mongoUri,
  error: null,
};

// Global Mongoose connection lifecycle listeners
mongoose.connection.on('connected', () => {
  connectionState.isConnected = true;
  connectionState.databaseName = mongoose.connection.name;
  connectionState.error = null;
  console.log(`[EduSphere DB] Mongoose connected to database: ${mongoose.connection.name}`);
});

mongoose.connection.on('disconnected', () => {
  connectionState.isConnected = false;
  console.warn('[EduSphere DB] Mongoose connection lost (disconnected). Readiness check will signal degradation.');
});

mongoose.connection.on('reconnected', () => {
  connectionState.isConnected = true;
  connectionState.error = null;
  console.log('[EduSphere DB] Mongoose successfully reconnected.');
});

mongoose.connection.on('error', (err) => {
  connectionState.error = err?.message || 'Database connection error';
  console.error('[EduSphere DB Error]', err);
});

export async function connectMongoDB(customUri?: string): Promise<boolean> {
  const targetUri = customUri || config.mongoUri;
  connectionState.uri = targetUri;

  try {
    if (mongoose.connection.readyState === 1) {
      connectionState.isConnected = true;
      return true;
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    connectionState.isConnected = true;
    connectionState.databaseName = mongoose.connection.name;
    connectionState.error = null;

    console.log(`[EduSphere DB] Connected to MongoDB: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);

    return true;
  } catch (err: any) {
    connectionState.isConnected = false;
    connectionState.error = err.message || 'Failed to connect to MongoDB';

    // Production fail-safe: Never silently fallback to in-memory in production!
    if (config.isProduction) {
      console.error(`[FATAL] [EduSphere DB] Production MongoDB connection failure (${err.message}). Halting startup to prevent data loss.`);
      throw new Error(`Production MongoDB connection failure: ${err.message}`);
    }

    console.error(`[EduSphere DB] MongoDB unavailable (${err.message}). Database-backed operations will fail closed.`);
    return false;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionState.isConnected = false;
    console.log('[EduSphere DB] Disconnected from MongoDB');
  }
}
