import mongoose from 'mongoose';
import { config } from '../config';
import { db } from './db';
import {
  TenantModel,
  UserModel,
  CourseModel,
  EnrollmentModel,
  AssessmentModel,
  SubmissionModel,
  CertificateModel,
  AdmissionModel,
  AuditLogModel,
  LiveSessionModel
} from '../models';

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
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });

    connectionState.isConnected = true;
    connectionState.databaseName = mongoose.connection.name;
    connectionState.error = null;

    console.log(`[EduSphere DB] Connected to MongoDB: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);

    // Seed data if collections are empty
    await seedInitialMongoData();

    return true;
  } catch (err: any) {
    connectionState.isConnected = false;
    connectionState.error = err.message || 'Failed to connect to MongoDB';

    // Production fail-safe: Never silently fallback to in-memory in production!
    if (config.isProduction) {
      console.error(`[FATAL] [EduSphere DB] Production MongoDB connection failure (${err.message}). Halting startup to prevent data loss.`);
      throw new Error(`Production MongoDB connection failure: ${err.message}`);
    }

    console.warn(`[EduSphere DB] MongoDB unavailable (${err.message}). Active dual-mode fallback to persistent in-memory repository.`);
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

/**
 * Idempotent seeder: Seeds database only if collections are empty.
 * Never overwrites or deletes existing records!
 */
export async function seedInitialMongoData(): Promise<void> {
  if (!connectionState.isConnected) return;

  try {
    // 1. Tenants
    const tenantCount = await TenantModel.countDocuments();
    if (tenantCount === 0 && db.tenants.length > 0) {
      await TenantModel.insertMany(db.tenants);
      console.log(`[EduSphere Seeder] Seeded ${db.tenants.length} tenants into MongoDB`);
    }

    // 2. Users
    const userCount = await UserModel.countDocuments();
    if (userCount === 0 && db.users.length > 0) {
      await UserModel.insertMany(db.users);
      console.log(`[EduSphere Seeder] Seeded ${db.users.length} users into MongoDB`);
    }

    // 3. Courses
    const courseCount = await CourseModel.countDocuments();
    if (courseCount === 0 && db.courses.length > 0) {
      await CourseModel.insertMany(db.courses);
      console.log(`[EduSphere Seeder] Seeded ${db.courses.length} courses into MongoDB`);
    }

    // 4. Enrollments
    const enrollmentCount = await EnrollmentModel.countDocuments();
    if (enrollmentCount === 0 && db.enrollments.length > 0) {
      await EnrollmentModel.insertMany(db.enrollments);
      console.log(`[EduSphere Seeder] Seeded ${db.enrollments.length} enrollments into MongoDB`);
    }

    // 5. Assessments
    const assessmentCount = await AssessmentModel.countDocuments();
    if (assessmentCount === 0 && db.assessments.length > 0) {
      await AssessmentModel.insertMany(db.assessments);
      console.log(`[EduSphere Seeder] Seeded ${db.assessments.length} assessments into MongoDB`);
    }

    // 6. Certificates
    const certCount = await CertificateModel.countDocuments();
    if (certCount === 0 && db.certificates.length > 0) {
      await CertificateModel.insertMany(db.certificates);
      console.log(`[EduSphere Seeder] Seeded ${db.certificates.length} certificates into MongoDB`);
    }

    // 7. Audit Logs
    const auditCount = await AuditLogModel.countDocuments();
    if (auditCount === 0 && db.auditLogs.length > 0) {
      await AuditLogModel.insertMany(db.auditLogs);
      console.log(`[EduSphere Seeder] Seeded ${db.auditLogs.length} audit logs into MongoDB`);
    }

    // 8. Live Sessions
    const liveCount = await LiveSessionModel.countDocuments();
    if (liveCount === 0 && db.liveSessions.length > 0) {
      await LiveSessionModel.insertMany(db.liveSessions);
      console.log(`[EduSphere Seeder] Seeded ${db.liveSessions.length} live sessions into MongoDB`);
    }
  } catch (err: any) {
    console.error('[EduSphere Seeder Error]', err.message);
  }
}
