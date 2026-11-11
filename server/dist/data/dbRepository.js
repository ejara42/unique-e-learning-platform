"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repo = exports.DatabaseRepository = void 0;
const models_1 = require("../models");
const mongoConnection_1 = require("./mongoConnection");
const errors_1 = require("../errors");
class DatabaseRepository {
    isMongoActive() {
        return mongoConnection_1.connectionState.isConnected;
    }
    /** Fail closed in every environment when durable MongoDB storage is unavailable. */
    assertActiveStorage() {
        if (!this.isMongoActive()) {
            throw new errors_1.DatabaseUnavailableError('MongoDB persistence is unavailable. Operation halted to prevent in-memory data divergence.');
        }
    }
    // ==========================================================================
    // TENANTS
    // ==========================================================================
    async getTenants(filters) {
        this.assertActiveStorage();
        const query = {};
        if (filters?.status)
            query.status = filters.status.toUpperCase();
        if (filters?.type)
            query.type = filters.type.toUpperCase();
        return await models_1.TenantModel.find(query).lean();
    }
    async getTenantById(idOrSlug) {
        this.assertActiveStorage();
        const doc = await models_1.TenantModel.findOne({
            $or: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }]
        }).lean();
        return doc || null;
    }
    async createTenant(tenantData) {
        this.assertActiveStorage();
        await models_1.TenantModel.create(tenantData);
        return tenantData;
    }
    async updateTenantStatus(id, status, remarks) {
        this.assertActiveStorage();
        const doc = await models_1.TenantModel.findOneAndUpdate({ $or: [{ id }, { slug: id }] }, { $set: { status } }, { new: true }).lean();
        return doc || null;
    }
    // ==========================================================================
    // USERS & IAM
    // ==========================================================================
    async getUsers() {
        this.assertActiveStorage();
        return await models_1.UserModel.find().lean();
    }
    async getUserByEmail(email) {
        this.assertActiveStorage();
        const normalized = email.toLowerCase().trim();
        const doc = await models_1.UserModel.findOne({ email: normalized }).lean();
        return doc || null;
    }
    async getUserById(id) {
        this.assertActiveStorage();
        const doc = await models_1.UserModel.findOne({ id }).lean();
        return doc || null;
    }
    async getUserTokenVersion(id) {
        this.assertActiveStorage();
        const doc = await models_1.UserModel.findOne({ id }).select('tokenVersion').lean();
        const user = Array.isArray(doc) ? doc[0] : doc;
        return user ? user.tokenVersion ?? 0 : null;
    }
    async createUser(userData) {
        this.assertActiveStorage();
        await models_1.UserModel.create(userData);
        return userData;
    }
    async updateUserRole(userId, newRole) {
        this.assertActiveStorage();
        const doc = await models_1.UserModel.findOneAndUpdate({ id: userId }, { $set: { activeRole: newRole } }, { new: true }).lean();
        return doc || null;
    }
    // ==========================================================================
    // COURSES & CURRICULUM (With strict Tenant Isolation)
    // ==========================================================================
    async getCourses(filters, tenantContextId) {
        this.assertActiveStorage();
        const query = { isPublished: true };
        if (filters?.category && filters.category !== 'All') {
            const category = filters.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.category = new RegExp(category, 'i');
        }
        if (filters?.level)
            query.level = filters.level;
        if (tenantContextId) {
            query.$or = [
                { tenantId: tenantContextId, visibility: 'INSTITUTION_RESTRICTED' },
                { visibility: 'PUBLIC' },
            ];
        }
        else {
            query.visibility = 'PUBLIC';
        }
        if (filters?.search) {
            const term = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$and = [{
                    $or: [
                        { title: new RegExp(term, 'i') },
                        { description: new RegExp(term, 'i') },
                        { category: new RegExp(term, 'i') },
                    ],
                }];
        }
        return await models_1.CourseModel.find(query).lean();
    }
    async getCourseById(id, tenantContextId) {
        this.assertActiveStorage();
        const doc = await models_1.CourseModel.findOne({ $or: [{ id }, { slug: id }] }).lean();
        if (!doc)
            return null;
        const course = doc;
        if (tenantContextId && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId !== tenantContextId) {
            return null;
        }
        return course;
    }
    async createCourse(courseData) {
        this.assertActiveStorage();
        await models_1.CourseModel.create(courseData);
        return courseData;
    }
    // ==========================================================================
    // ENROLLMENTS & PROGRESS
    // ==========================================================================
    async getEnrollmentsByLearner(learnerId) {
        this.assertActiveStorage();
        return await models_1.EnrollmentModel.find({ learnerId }).lean();
    }
    async createEnrollment(enrollmentData) {
        this.assertActiveStorage();
        await models_1.EnrollmentModel.create(enrollmentData);
        return enrollmentData;
    }
    async updateProgress(courseId, learnerId, lessonId) {
        this.assertActiveStorage();
        const doc = await models_1.EnrollmentModel.findOne({ courseId, learnerId });
        if (doc) {
            if (!doc.completedLessonIds.includes(lessonId)) {
                doc.completedLessonIds.push(lessonId);
                doc.progressPercentage = Math.min(100, doc.progressPercentage + 20);
                if (doc.progressPercentage >= 100) {
                    doc.status = 'COMPLETED';
                    doc.completedAt = new Date().toISOString();
                }
                await doc.save();
            }
            return doc.toObject();
        }
        return null;
    }
    // ==========================================================================
    // ASSESSMENTS & SUBMISSIONS
    // ==========================================================================
    async getAssessmentById(id) {
        this.assertActiveStorage();
        const doc = await models_1.AssessmentModel.findOne({ id }).lean();
        return doc || null;
    }
    async getAssessmentByCourseId(courseId) {
        this.assertActiveStorage();
        const doc = await models_1.AssessmentModel.findOne({ courseId }).lean();
        return doc || null;
    }
    async createAssessment(assessmentData) {
        this.assertActiveStorage();
        await models_1.AssessmentModel.create(assessmentData);
        return assessmentData;
    }
    async createSubmission(submissionData) {
        this.assertActiveStorage();
        await models_1.SubmissionModel.create(submissionData);
        return submissionData;
    }
    // ==========================================================================
    // CERTIFICATES & DIPLOMAS
    // ==========================================================================
    async getCertificates(learnerId) {
        this.assertActiveStorage();
        const query = learnerId ? { learnerId } : {};
        return await models_1.CertificateModel.find(query).lean();
    }
    async getCertificateByCode(code) {
        this.assertActiveStorage();
        const trimmed = code.trim();
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const doc = await models_1.CertificateModel.findOne({
            $or: [
                { certificateNumber: { $regex: new RegExp(`^${escaped}$`, 'i') } },
                { verificationHash: trimmed }
            ]
        }).lean();
        return doc || null;
    }
    async createCertificate(certData) {
        this.assertActiveStorage();
        await models_1.CertificateModel.create(certData);
        return certData;
    }
    async revokeCertificate(idOrNumber, reason) {
        this.assertActiveStorage();
        const doc = await models_1.CertificateModel.findOneAndUpdate({ $or: [{ id: idOrNumber }, { certificateNumber: idOrNumber }] }, { $set: { status: 'REVOKED', revocationReason: reason } }, { new: true }).lean();
        return doc || null;
    }
    // ==========================================================================
    // LIVE SESSIONS (Multi-Tenant WebRTC Classrooms)
    // ==========================================================================
    async getLiveSessions() {
        this.assertActiveStorage();
        return await models_1.LiveSessionModel.find().lean();
    }
    async getLiveSessionById(id) {
        this.assertActiveStorage();
        const doc = await models_1.LiveSessionModel.findOne({ id }).lean();
        return doc;
    }
    async createLiveSession(session) {
        this.assertActiveStorage();
        const doc = await models_1.LiveSessionModel.create(session);
        return doc.toObject();
    }
    async updateLiveSession(id, updates) {
        this.assertActiveStorage();
        const doc = await models_1.LiveSessionModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
        return doc;
    }
    // ==========================================================================
    // ADMISSIONS & AUDIT LOGS
    // ==========================================================================
    async getAdmissions(filters, tenantContextId) {
        this.assertActiveStorage();
        const query = {};
        if (tenantContextId)
            query.institutionId = tenantContextId;
        else if (filters?.institutionId)
            query.institutionId = filters.institutionId;
        if (filters?.status)
            query.status = filters.status.toUpperCase();
        return await models_1.AdmissionModel.find(query).lean();
    }
    async createAuditLog(log) {
        this.assertActiveStorage();
        await models_1.AuditLogModel.create(log);
    }
    async getAuditLogs(tenantContextId) {
        this.assertActiveStorage();
        const query = tenantContextId ? { tenantId: tenantContextId } : {};
        return await models_1.AuditLogModel.find(query).sort({ timestamp: -1 }).limit(20).lean();
    }
}
exports.DatabaseRepository = DatabaseRepository;
exports.repo = new DatabaseRepository();
