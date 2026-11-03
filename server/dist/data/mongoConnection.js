"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionState = void 0;
exports.connectMongoDB = connectMongoDB;
exports.disconnectMongoDB = disconnectMongoDB;
exports.seedInitialMongoData = seedInitialMongoData;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
const db_1 = require("./db");
const models_1 = require("../models");
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
        // Seed data if collections are empty
        await seedInitialMongoData();
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
        console.warn(`[EduSphere DB] MongoDB unavailable (${err.message}). Active dual-mode fallback to persistent in-memory repository.`);
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
/**
 * Idempotent seeder: Seeds database only if collections are empty.
 * Never overwrites or deletes existing records!
 */
async function seedInitialMongoData() {
    if (!exports.connectionState.isConnected)
        return;
    try {
        // 1. Tenants
        const tenantCount = await models_1.TenantModel.countDocuments();
        if (tenantCount === 0 && db_1.db.tenants.length > 0) {
            await models_1.TenantModel.insertMany(db_1.db.tenants);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.tenants.length} tenants into MongoDB`);
        }
        // 2. Users
        const userCount = await models_1.UserModel.countDocuments();
        if (userCount === 0 && db_1.db.users.length > 0) {
            await models_1.UserModel.insertMany(db_1.db.users);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.users.length} users into MongoDB`);
        }
        // 3. Courses
        const courseCount = await models_1.CourseModel.countDocuments();
        if (courseCount === 0 && db_1.db.courses.length > 0) {
            await models_1.CourseModel.insertMany(db_1.db.courses);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.courses.length} courses into MongoDB`);
        }
        // 4. Enrollments
        const enrollmentCount = await models_1.EnrollmentModel.countDocuments();
        if (enrollmentCount === 0 && db_1.db.enrollments.length > 0) {
            await models_1.EnrollmentModel.insertMany(db_1.db.enrollments);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.enrollments.length} enrollments into MongoDB`);
        }
        // 5. Assessments
        const assessmentCount = await models_1.AssessmentModel.countDocuments();
        if (assessmentCount === 0 && db_1.db.assessments.length > 0) {
            await models_1.AssessmentModel.insertMany(db_1.db.assessments);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.assessments.length} assessments into MongoDB`);
        }
        // 6. Certificates
        const certCount = await models_1.CertificateModel.countDocuments();
        if (certCount === 0 && db_1.db.certificates.length > 0) {
            await models_1.CertificateModel.insertMany(db_1.db.certificates);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.certificates.length} certificates into MongoDB`);
        }
        // 7. Audit Logs
        const auditCount = await models_1.AuditLogModel.countDocuments();
        if (auditCount === 0 && db_1.db.auditLogs.length > 0) {
            await models_1.AuditLogModel.insertMany(db_1.db.auditLogs);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.auditLogs.length} audit logs into MongoDB`);
        }
        // 8. Live Sessions
        const liveCount = await models_1.LiveSessionModel.countDocuments();
        if (liveCount === 0 && db_1.db.liveSessions.length > 0) {
            await models_1.LiveSessionModel.insertMany(db_1.db.liveSessions);
            console.log(`[EduSphere Seeder] Seeded ${db_1.db.liveSessions.length} live sessions into MongoDB`);
        }
    }
    catch (err) {
        console.error('[EduSphere Seeder Error]', err.message);
    }
}
