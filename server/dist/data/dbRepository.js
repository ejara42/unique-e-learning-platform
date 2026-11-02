"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repo = exports.DatabaseRepository = void 0;
const models_1 = require("../models");
const db_1 = require("./db");
const mongoConnection_1 = require("./mongoConnection");
const config_1 = require("../config");
const errors_1 = require("../errors");
class DatabaseRepository {
    isMongoActive() {
        return mongoConnection_1.connectionState.isConnected;
    }
    /**
     * Fail-Safe Guard: In production mode, halts operations if MongoDB persistence is unavailable.
     */
    assertActiveStorage() {
        if (config_1.config.isProduction && !this.isMongoActive()) {
            throw new errors_1.DatabaseUnavailableError('MongoDB persistence cluster is unavailable in production. Operation halted to prevent silent data loss or divergence.');
        }
    }
    // ==========================================================================
    // TENANTS
    // ==========================================================================
    async getTenants(filters) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const query = {};
            if (filters?.status)
                query.status = filters.status.toUpperCase();
            if (filters?.type)
                query.type = filters.type.toUpperCase();
            const docs = await models_1.TenantModel.find(query).lean();
            return docs;
        }
        let results = [...db_1.db.tenants];
        if (filters?.status)
            results = results.filter(t => t.status === filters.status.toUpperCase());
        if (filters?.type)
            results = results.filter(t => t.type === filters.type.toUpperCase());
        return results;
    }
    async getTenantById(idOrSlug) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.TenantModel.findOne({
                $or: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }]
            }).lean();
            return doc || null;
        }
        return db_1.db.tenants.find(t => t.id === idOrSlug || t.slug === idOrSlug) || null;
    }
    async createTenant(tenantData) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.TenantModel.create(tenantData);
            return tenantData;
        }
        db_1.db.tenants.unshift(tenantData);
        return tenantData;
    }
    async updateTenantStatus(id, status, remarks) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.TenantModel.findOneAndUpdate({ $or: [{ id }, { slug: id }] }, { $set: { status } }, { new: true }).lean();
            return doc || null;
        }
        const tenant = db_1.db.tenants.find(t => t.id === id || t.slug === id);
        if (tenant) {
            tenant.status = status;
            return tenant;
        }
        return null;
    }
    // ==========================================================================
    // USERS & IAM
    // ==========================================================================
    async getUsers() {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const docs = await models_1.UserModel.find().lean();
            return docs;
        }
        return db_1.db.users;
    }
    async getUserByEmail(email) {
        this.assertActiveStorage();
        const normalized = email.toLowerCase().trim();
        if (this.isMongoActive()) {
            const doc = await models_1.UserModel.findOne({ email: normalized }).lean();
            return doc || null;
        }
        return db_1.db.users.find(u => u.email.toLowerCase() === normalized) || null;
    }
    async getUserById(id) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.UserModel.findOne({ id }).lean();
            return doc || null;
        }
        return db_1.db.users.find(u => u.id === id) || null;
    }
    async createUser(userData) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.UserModel.create(userData);
            return userData;
        }
        db_1.db.users.push(userData);
        return userData;
    }
    async updateUserRole(userId, newRole) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.UserModel.findOneAndUpdate({ id: userId }, { $set: { activeRole: newRole } }, { new: true }).lean();
            return doc || null;
        }
        const user = db_1.db.users.find(u => u.id === userId);
        if (user) {
            user.activeRole = newRole;
            return user;
        }
        return null;
    }
    // ==========================================================================
    // COURSES & CURRICULUM (With strict Tenant Isolation)
    // ==========================================================================
    async getCourses(filters, tenantContextId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const query = {};
            if (filters?.category && filters.category !== 'All')
                query.category = new RegExp(filters.category, 'i');
            if (filters?.level)
                query.level = filters.level;
            if (tenantContextId) {
                query.$or = [{ tenantId: tenantContextId }, { visibility: 'PUBLIC' }];
            }
            else if (filters?.tenantId) {
                query.tenantId = filters.tenantId;
            }
            if (filters?.search) {
                const term = filters.search.trim();
                query.$or = [
                    { title: new RegExp(term, 'i') },
                    { description: new RegExp(term, 'i') },
                    { category: new RegExp(term, 'i') }
                ];
            }
            const docs = await models_1.CourseModel.find(query).lean();
            return docs;
        }
        let courses = [...db_1.db.courses];
        if (tenantContextId) {
            courses = courses.filter(c => c.tenantId === tenantContextId || c.visibility === 'PUBLIC');
        }
        else if (filters?.tenantId) {
            courses = courses.filter(c => c.tenantId === filters.tenantId);
        }
        if (filters?.category && filters.category !== 'All') {
            courses = courses.filter(c => c.category.toLowerCase() === filters.category.toLowerCase());
        }
        if (filters?.level) {
            courses = courses.filter(c => c.level.toLowerCase() === filters.level.toLowerCase());
        }
        if (filters?.search) {
            const term = filters.search.toLowerCase();
            courses = courses.filter(c => c.title.toLowerCase().includes(term) ||
                c.description.toLowerCase().includes(term) ||
                c.category.toLowerCase().includes(term));
        }
        return courses;
    }
    async getCourseById(id, tenantContextId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.CourseModel.findOne({
                $or: [{ id }, { slug: id }]
            }).lean();
            if (doc) {
                const course = doc;
                // Cross-tenant barrier: institution-restricted courses cannot be accessed by other tenants
                if (tenantContextId && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId !== tenantContextId) {
                    return null;
                }
                return course;
            }
            return null;
        }
        const course = db_1.db.courses.find(c => c.id === id || c.slug === id) || null;
        if (course && tenantContextId && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId !== tenantContextId) {
            return null;
        }
        return course;
    }
    async createCourse(courseData) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.CourseModel.create(courseData);
            return courseData;
        }
        db_1.db.courses.unshift(courseData);
        return courseData;
    }
    // ==========================================================================
    // ENROLLMENTS & PROGRESS
    // ==========================================================================
    async getEnrollmentsByLearner(learnerId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const docs = await models_1.EnrollmentModel.find({ learnerId }).lean();
            return docs;
        }
        return db_1.db.enrollments.filter(e => e.learnerId === learnerId);
    }
    async createEnrollment(enrollmentData) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.EnrollmentModel.create(enrollmentData);
            return enrollmentData;
        }
        db_1.db.enrollments.push(enrollmentData);
        return enrollmentData;
    }
    async updateProgress(courseId, learnerId, lessonId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
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
        const enrollment = db_1.db.enrollments.find(e => e.courseId === courseId && e.learnerId === learnerId);
        if (enrollment) {
            if (!enrollment.completedLessonIds.includes(lessonId)) {
                enrollment.completedLessonIds.push(lessonId);
                enrollment.progressPercentage = Math.min(100, enrollment.progressPercentage + 20);
                if (enrollment.progressPercentage >= 100) {
                    enrollment.status = 'COMPLETED';
                    enrollment.completedAt = new Date().toISOString();
                }
            }
            return enrollment;
        }
        return null;
    }
    // ==========================================================================
    // ASSESSMENTS & SUBMISSIONS
    // ==========================================================================
    async getAssessmentById(id) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.AssessmentModel.findOne({ id }).lean();
            return doc || null;
        }
        return db_1.db.assessments.find(a => a.id === id) || null;
    }
    async getAssessmentByCourseId(courseId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.AssessmentModel.findOne({ courseId }).lean();
            return doc || null;
        }
        return db_1.db.assessments.find(a => a.courseId === courseId) || null;
    }
    async createSubmission(submissionData) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.SubmissionModel.create(submissionData);
            return submissionData;
        }
        db_1.db.submissions.push(submissionData);
        return submissionData;
    }
    // ==========================================================================
    // CERTIFICATES & DIPLOMAS
    // ==========================================================================
    async getCertificates(learnerId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const query = learnerId ? { learnerId } : {};
            const docs = await models_1.CertificateModel.find(query).lean();
            return docs;
        }
        return learnerId ? db_1.db.certificates.filter(c => c.learnerId === learnerId) : db_1.db.certificates;
    }
    async getCertificateByCode(code) {
        this.assertActiveStorage();
        const trimmed = code.trim();
        if (this.isMongoActive()) {
            const doc = await models_1.CertificateModel.findOne({
                $or: [
                    { certificateNumber: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
                    { verificationHash: trimmed }
                ]
            }).lean();
            return doc || null;
        }
        return db_1.db.certificates.find(c => c.certificateNumber.toLowerCase() === trimmed.toLowerCase() || c.verificationHash === trimmed) || null;
    }
    async createCertificate(certData) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.CertificateModel.create(certData);
            return certData;
        }
        db_1.db.certificates.unshift(certData);
        return certData;
    }
    async revokeCertificate(idOrNumber, reason) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const doc = await models_1.CertificateModel.findOneAndUpdate({ $or: [{ id: idOrNumber }, { certificateNumber: idOrNumber }] }, { $set: { status: 'REVOKED', revocationReason: reason } }, { new: true }).lean();
            return doc || null;
        }
        const cert = db_1.db.certificates.find(c => c.id === idOrNumber || c.certificateNumber === idOrNumber);
        if (cert) {
            cert.status = 'REVOKED';
            cert.revocationReason = reason;
            return cert;
        }
        return null;
    }
    // ==========================================================================
    // LIVE SESSIONS
    // ==========================================================================
    async getLiveSessions() {
        return db_1.db.liveSessions;
    }
    async getLiveSessionById(id) {
        return db_1.db.liveSessions.find(s => s.id === id) || null;
    }
    // ==========================================================================
    // ADMISSIONS & AUDIT LOGS
    // ==========================================================================
    async getAdmissions(filters, tenantContextId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const query = {};
            if (tenantContextId)
                query.institutionId = tenantContextId;
            else if (filters?.institutionId)
                query.institutionId = filters.institutionId;
            if (filters?.status)
                query.status = filters.status.toUpperCase();
            const docs = await models_1.AdmissionModel.find(query).lean();
            return docs;
        }
        let results = [
            {
                id: 'adm-1',
                studentName: 'Learner Applicant',
                studentEmail: 'learner.applicant@institution.edu',
                institutionId: 'tenant-3',
                institutionName: 'Institution Partner',
                programOrCourse: 'Computer Science & Software Systems',
                status: 'PENDING',
                appliedDate: '2026-10-25T08:30:00Z',
                qualifications: 'Secondary School Diploma (94.5% GPA)',
            },
            {
                id: 'adm-2',
                studentName: 'Program Candidate',
                studentEmail: 'program.candidate@institution.edu',
                institutionId: 'tenant-1',
                institutionName: 'Academic Institution',
                programOrCourse: 'Full-Stack Web Development Bootcamp',
                status: 'PENDING',
                appliedDate: '2026-10-26T11:15:00Z',
                qualifications: 'Higher Diploma in Information Systems',
            },
            {
                id: 'adm-3',
                studentName: 'Qualified Applicant',
                studentEmail: 'qualified.applicant@institution.edu',
                institutionId: 'tenant-3',
                institutionName: 'Institution Partner',
                programOrCourse: 'Cloud Computing & Cyber Defense',
                status: 'ACCEPTED',
                appliedDate: '2026-10-24T14:00:00Z',
                qualifications: 'B.Sc. in Electrical Engineering',
            },
        ];
        if (tenantContextId) {
            results = results.filter(r => r.institutionId === tenantContextId);
        }
        else if (filters?.institutionId) {
            results = results.filter(r => r.institutionId === filters.institutionId);
        }
        if (filters?.status) {
            results = results.filter(r => r.status === filters.status.toUpperCase());
        }
        return results;
    }
    async createAuditLog(log) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            await models_1.AuditLogModel.create(log);
            return;
        }
        db_1.db.auditLogs.unshift(log);
    }
    async getAuditLogs(tenantContextId) {
        this.assertActiveStorage();
        if (this.isMongoActive()) {
            const query = tenantContextId ? { tenantId: tenantContextId } : {};
            const docs = await models_1.AuditLogModel.find(query).sort({ timestamp: -1 }).limit(20).lean();
            return docs;
        }
        return tenantContextId ? db_1.db.auditLogs.filter(l => l.tenantId === tenantContextId) : db_1.db.auditLogs;
    }
}
exports.DatabaseRepository = DatabaseRepository;
exports.repo = new DatabaseRepository();
