"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LtiConsumedNonceModel = exports.LtiStateModel = exports.ScormSessionModel = exports.ProcessedWebhookEventModel = exports.AuditLogModel = exports.AdmissionModel = exports.CertificateModel = exports.SubmissionModel = exports.AssessmentModel = exports.EnrollmentModel = exports.CourseModel = exports.UserModel = exports.TenantModel = exports.LtiConsumedNonceSchema = exports.LtiStateSchema = exports.ScormSessionSchema = exports.ProcessedWebhookEventSchema = exports.AuditLogSchema = exports.AdmissionSchema = exports.CertificateSchema = exports.SubmissionSchema = exports.AssessmentSchema = exports.EnrollmentSchema = exports.CourseSchema = exports.UserSchema = exports.TenantSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.TenantSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    domains: [{ type: String, lowercase: true, trim: true }],
    type: {
        type: String,
        required: true,
        enum: ['UNIVERSITY', 'K12_SCHOOL', 'TRAINING_CENTER', 'INDEPENDENT_PROVIDER'],
        default: 'UNIVERSITY'
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'REJECTED'],
        default: 'PENDING_VERIFICATION',
        index: true
    },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    verificationDocuments: [{
            title: String,
            fileUrl: String,
            uploadedAt: { type: String, default: () => new Date().toISOString() },
            verifiedAt: String
        }],
    branding: {
        logoUrl: String,
        primaryColor: { type: String, default: '#2563EB' },
        secondaryColor: { type: String, default: '#1E40AF' }
    },
    settings: {
        allowIndependentEnrollment: { type: Boolean, default: true },
        requireEnrollmentApproval: { type: Boolean, default: true },
        maxStorageQuotaGb: { type: Number, default: 100 },
        enabledFeatures: [{ type: String }]
    },
    stats: {
        totalStudents: { type: Number, default: 0 },
        totalCourses: { type: Number, default: 0 },
        totalInstructors: { type: Number, default: 0 }
    },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });
exports.TenantSchema.index({ domains: 1 });
exports.TenantSchema.index({ status: 1, type: 1 });
exports.UserSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    avatarUrl: String,
    bio: String,
    globalRole: {
        type: String,
        enum: ['PLATFORM_SUPERADMIN', 'STANDARD_USER'],
        default: 'STANDARD_USER'
    },
    activeRole: {
        type: String,
        required: true,
        enum: ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN', 'INSTRUCTOR', 'STUDENT', 'INDEPENDENT_LEARNER'],
        default: 'STUDENT',
        index: true
    },
    authorizedRoles: {
        type: [String],
        enum: ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN', 'INSTRUCTOR', 'STUDENT', 'INDEPENDENT_LEARNER'],
        default: ['STUDENT']
    },
    institutionId: { type: String, default: null, index: true },
    security: {
        isEmailVerified: { type: Boolean, default: true },
        twoFactorEnabled: { type: Boolean, default: false }
    },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });
exports.UserSchema.index({ institutionId: 1, activeRole: 1 });
exports.CourseSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, default: null, index: true },
    institutionName: { type: String, default: 'EduSphere Open Academy' },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    tagline: String,
    description: String,
    category: { type: String, required: true, index: true },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        default: 'All Levels'
    },
    durationHours: { type: Number, default: 0 },
    instructorId: { type: String, required: true, index: true },
    instructorName: { type: String, required: true },
    thumbnailUrl: String,
    visibility: {
        type: String,
        enum: ['PUBLIC', 'INSTITUTION_RESTRICTED'],
        default: 'PUBLIC',
        index: true
    },
    price: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    ratingCount: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
    learningOutcomes: [{ type: String }],
    modules: [{
            id: String,
            title: String,
            order: Number,
            lessons: [{
                    id: String,
                    title: String,
                    order: Number,
                    contentType: { type: String, enum: ['VIDEO', 'DOCUMENT', 'QUIZ'] },
                    durationMinutes: Number,
                    contentUrl: String,
                    body: String,
                    isFreePreview: Boolean
                }]
        }],
    completionCriteria: {
        minimumPassingGradePct: { type: Number, default: 70 },
        requiredQuizId: String
    },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });
exports.CourseSchema.index({ tenantId: 1, isPublished: 1 });
exports.CourseSchema.index({ visibility: 1, category: 1 });
exports.CourseSchema.index({ slug: 1, tenantId: 1 });
exports.EnrollmentSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    courseId: { type: String, required: true, index: true },
    learnerId: { type: String, required: true, index: true },
    tenantId: { type: String, default: null, index: true },
    status: {
        type: String,
        enum: ['PENDING_APPROVAL', 'ENROLLED', 'COMPLETED', 'REJECTED'],
        default: 'ENROLLED',
        index: true
    },
    enrolledAt: { type: String, default: () => new Date().toISOString() },
    completedAt: String,
    progressPercentage: { type: Number, default: 0 },
    completedLessonIds: [{ type: String }],
    finalGrade: Number,
    certificateId: String
}, { timestamps: true });
exports.EnrollmentSchema.index({ courseId: 1, learnerId: 1 }, { unique: true });
exports.EnrollmentSchema.index({ learnerId: 1, status: 1 });
exports.AssessmentSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    courseId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL_EXAM'],
        default: 'MIDTERM'
    },
    instructions: String,
    durationMinutes: { type: Number, default: 30 },
    passingScorePct: { type: Number, default: 70 },
    questions: [{
            id: String,
            type: { type: String, enum: ['MCQ', 'TRUE_FALSE', 'ESSAY'], default: 'MCQ' },
            prompt: String,
            options: [String],
            correctAnswerIndex: Number,
            points: { type: Number, default: 1 }
        }]
}, { timestamps: true });
exports.SubmissionSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    assessmentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    learnerId: { type: String, required: true, index: true },
    startedAt: String,
    submittedAt: String,
    answers: [{
            questionId: String,
            selectedOption: Number,
            textAnswer: String,
            scoreAwarded: Number
        }],
    totalScoreEarned: Number,
    totalScoreMax: Number,
    percentageScore: Number,
    passed: Boolean,
    proctoringFlags: [{
            type: { type: String, enum: ['TAB_BLUR', 'FULLSCREEN_EXIT', 'COPY_PASTE_ATTEMPT'] },
            timestamp: String,
            details: String
        }],
    status: { type: String, enum: ['GRADED', 'NEEDS_MANUAL_REVIEW'], default: 'GRADED' }
}, { timestamps: true });
exports.SubmissionSchema.index({ assessmentId: 1, learnerId: 1 });
exports.CertificateSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    certificateNumber: { type: String, required: true, unique: true, index: true },
    verificationHash: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, default: null, index: true },
    learnerId: { type: String, required: true, index: true },
    learnerName: { type: String, required: true },
    courseId: { type: String, required: true, index: true },
    courseTitle: { type: String, required: true },
    institutionName: String,
    issueDate: { type: String, default: () => new Date().toISOString() },
    gradePercentage: { type: Number, required: true },
    qrCodeData: { type: String, required: true },
    status: { type: String, enum: ['VALID', 'REVOKED'], default: 'VALID', index: true },
    revocationReason: String
}, { timestamps: true });
exports.AdmissionSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    institutionId: { type: String, required: true, index: true },
    institutionName: { type: String, required: true },
    programOrCourse: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING', index: true },
    appliedDate: { type: String, default: () => new Date().toISOString() },
    qualifications: String,
    remarks: String
}, { timestamps: true });
exports.AdmissionSchema.index({ institutionId: 1, status: 1 });
exports.AuditLogSchema = new mongoose_1.Schema({
    id: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, default: null, index: true },
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String, default: '127.0.0.1' },
    timestamp: { type: String, default: () => new Date().toISOString(), index: true }
}, { timestamps: true });
exports.AuditLogSchema.index({ tenantId: 1, timestamp: -1 });
exports.ProcessedWebhookEventSchema = new mongoose_1.Schema({
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    status: { type: String, enum: ['PROCESSING', 'COMPLETED', 'FAILED'], default: 'PROCESSING', index: true },
    receivedAt: { type: String, default: () => new Date().toISOString() },
    processedAt: { type: String },
    errorMessage: { type: String },
    payloadSummary: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.ScormSessionSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    learnerId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    cmiData: { type: Map, of: String, default: {} },
    isCompleted: { type: Boolean, default: false },
}, { timestamps: true });
exports.LtiStateSchema = new mongoose_1.Schema({
    state: { type: String, required: true, unique: true, index: true },
    nonce: { type: String, required: true },
    iss: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 900 } // TTL 15 minutes
});
exports.LtiConsumedNonceSchema = new mongoose_1.Schema({
    nonce: { type: String, required: true, unique: true, index: true },
    consumedAt: { type: Date, default: Date.now, expires: 900 } // TTL 15 minutes
});
// Export Model Factory / Getters
exports.TenantModel = mongoose_1.default.models.Tenant || mongoose_1.default.model('Tenant', exports.TenantSchema);
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model('User', exports.UserSchema);
exports.CourseModel = mongoose_1.default.models.Course || mongoose_1.default.model('Course', exports.CourseSchema);
exports.EnrollmentModel = mongoose_1.default.models.Enrollment || mongoose_1.default.model('Enrollment', exports.EnrollmentSchema);
exports.AssessmentModel = mongoose_1.default.models.Assessment || mongoose_1.default.model('Assessment', exports.AssessmentSchema);
exports.SubmissionModel = mongoose_1.default.models.Submission || mongoose_1.default.model('Submission', exports.SubmissionSchema);
exports.CertificateModel = mongoose_1.default.models.Certificate || mongoose_1.default.model('Certificate', exports.CertificateSchema);
exports.AdmissionModel = mongoose_1.default.models.Admission || mongoose_1.default.model('Admission', exports.AdmissionSchema);
exports.AuditLogModel = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', exports.AuditLogSchema);
exports.ProcessedWebhookEventModel = mongoose_1.default.models.ProcessedWebhookEvent || mongoose_1.default.model('ProcessedWebhookEvent', exports.ProcessedWebhookEventSchema);
exports.ScormSessionModel = mongoose_1.default.models.ScormSession || mongoose_1.default.model('ScormSession', exports.ScormSessionSchema);
exports.LtiStateModel = mongoose_1.default.models.LtiState || mongoose_1.default.model('LtiState', exports.LtiStateSchema);
exports.LtiConsumedNonceModel = mongoose_1.default.models.LtiConsumedNonce || mongoose_1.default.model('LtiConsumedNonce', exports.LtiConsumedNonceSchema);
