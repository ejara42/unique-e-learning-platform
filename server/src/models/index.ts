import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITenant, IUser, ICourse, IEnrollment, IAssessment, ISubmission, ICertificate, IAuditLog, ILiveSession } from '../types';

// ============================================================================
// 1. TENANT SCHEMA
// ============================================================================
export interface ITenantDocument extends Document {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  type: 'UNIVERSITY' | 'K12_SCHOOL' | 'TRAINING_CENTER' | 'INDEPENDENT_PROVIDER';
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED';
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  verificationDocuments: Array<{
    title: string;
    fileUrl: string;
    uploadedAt: string;
    verifiedAt?: string;
  }>;
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  settings: {
    allowIndependentEnrollment: boolean;
    requireEnrollmentApproval: boolean;
    maxStorageQuotaGb: number;
    enabledFeatures: string[];
  };
  stats?: {
    totalStudents: number;
    totalCourses: number;
    totalInstructors: number;
  };
  createdAt: string;
}

export const TenantSchema = new Schema<ITenantDocument>({
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

TenantSchema.index({ domains: 1 });
TenantSchema.index({ status: 1, type: 1 });

// ============================================================================
// 2. USER SCHEMA
// ============================================================================
export interface IUserDocument extends Document {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  globalRole: 'PLATFORM_SUPERADMIN' | 'STANDARD_USER';
  activeRole: 'PLATFORM_ADMIN' | 'INSTITUTION_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'INDEPENDENT_LEARNER';
  authorizedRoles: Array<'PLATFORM_ADMIN' | 'INSTITUTION_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'INDEPENDENT_LEARNER'>;
  institutionId?: string | null;
  security: {
    isEmailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  createdAt: string;
}

export const UserSchema = new Schema<IUserDocument>({
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

UserSchema.index({ institutionId: 1, activeRole: 1 });

// ============================================================================
// 3. COURSE SCHEMA
// ============================================================================
export interface ICourseDocument extends Document {
  id: string;
  tenantId?: string | null;
  institutionName?: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  level: string;
  durationHours: number;
  instructorId: string;
  instructorName: string;
  thumbnailUrl: string;
  visibility: 'PUBLIC' | 'INSTITUTION_RESTRICTED';
  price: number;
  rating: number;
  ratingCount: number;
  enrolledCount: number;
  isPublished: boolean;
  learningOutcomes: string[];
  modules: any[];
  completionCriteria: {
    minimumPassingGradePct: number;
    requiredQuizId?: string;
  };
  createdAt: string;
}

export const CourseSchema = new Schema<ICourseDocument>({
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
    default: 'All Levels',
    index: true
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

CourseSchema.index({ tenantId: 1, isPublished: 1 });
CourseSchema.index({ visibility: 1, category: 1 });
CourseSchema.index({ slug: 1, tenantId: 1 });

// ============================================================================
// 4. ENROLLMENT SCHEMA
// ============================================================================
export interface IEnrollmentDocument extends Document {
  id: string;
  courseId: string;
  learnerId: string;
  tenantId?: string | null;
  status: 'PENDING_APPROVAL' | 'ENROLLED' | 'COMPLETED' | 'REJECTED';
  enrolledAt: string;
  completedAt?: string;
  progressPercentage: number;
  completedLessonIds: string[];
  finalGrade?: number;
  certificateId?: string;
}

export const EnrollmentSchema = new Schema<IEnrollmentDocument>({
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

EnrollmentSchema.index({ courseId: 1, learnerId: 1 }, { unique: true });
EnrollmentSchema.index({ learnerId: 1, status: 1 });

// ============================================================================
// 5. ASSESSMENT SCHEMA
// ============================================================================
export interface IAssessmentDocument extends Document {
  id: string;
  courseId: string;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT' | 'MIDTERM' | 'FINAL_EXAM';
  instructions: string;
  durationMinutes: number;
  passingScorePct: number;
  questions: Array<{
    id: string;
    type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
    prompt: string;
    options?: string[];
    correctAnswerIndex?: number;
    points: number;
  }>;
}

export const AssessmentSchema = new Schema<IAssessmentDocument>({
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

// ============================================================================
// 6. SUBMISSION SCHEMA
// ============================================================================
export interface ISubmissionDocument extends Document {
  id: string;
  assessmentId: string;
  courseId: string;
  learnerId: string;
  startedAt: string;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    selectedOption?: number;
    textAnswer?: string;
    scoreAwarded?: number;
  }>;
  totalScoreEarned: number;
  totalScoreMax: number;
  percentageScore: number;
  passed: boolean;
  proctoringFlags: Array<{
    type: 'TAB_BLUR' | 'FULLSCREEN_EXIT' | 'COPY_PASTE_ATTEMPT';
    timestamp: string;
    details?: string;
  }>;
  status: 'GRADED' | 'NEEDS_MANUAL_REVIEW';
}

export const SubmissionSchema = new Schema<ISubmissionDocument>({
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

SubmissionSchema.index({ assessmentId: 1, learnerId: 1 });

// ============================================================================
// 7. CERTIFICATE SCHEMA (Cryptographic Seal)
// ============================================================================
export interface ICertificateDocument extends Document {
  id: string;
  certificateNumber: string;
  verificationHash: string;
  tenantId?: string | null;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  institutionName?: string;
  issueDate: string;
  gradePercentage: number;
  qrCodeData: string;
  status: 'VALID' | 'REVOKED';
  revocationReason?: string;
}

export const CertificateSchema = new Schema<ICertificateDocument>({
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

// ============================================================================
// 8. ADMISSION SCHEMA (Student Application for Institutions)
// ============================================================================
export interface IAdmissionDocument extends Document {
  id: string;
  studentName: string;
  studentEmail: string;
  institutionId: string;
  institutionName: string;
  programOrCourse: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedDate: string;
  qualifications: string;
  remarks?: string;
}

export const AdmissionSchema = new Schema<IAdmissionDocument>({
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

AdmissionSchema.index({ institutionId: 1, status: 1 });

// ============================================================================
// 9. AUDIT LOG SCHEMA
// ============================================================================
export interface IAuditLogDocument extends Document {
  id: string;
  tenantId?: string | null;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export const AuditLogSchema = new Schema<IAuditLogDocument>({
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

AuditLogSchema.index({ tenantId: 1, timestamp: -1 });

// ============================================================================
// 10. PROCESSED WEBHOOK EVENT SCHEMA (Idempotency Ledger)
// ============================================================================
export interface IProcessedWebhookEventDocument extends Document {
  eventId: string;
  eventType: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  receivedAt: string;
  processedAt?: string;
  errorMessage?: string;
  payloadSummary?: any;
}

export const ProcessedWebhookEventSchema = new Schema<IProcessedWebhookEventDocument>({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true },
  status: { type: String, enum: ['PROCESSING', 'COMPLETED', 'FAILED'], default: 'PROCESSING', index: true },
  receivedAt: { type: String, default: () => new Date().toISOString() },
  processedAt: { type: String },
  errorMessage: { type: String },
  payloadSummary: { type: Schema.Types.Mixed },
}, { timestamps: true });

// ============================================================================
// 11. SCORM RUNTIME CMI SESSION SCHEMA
// ============================================================================
export interface IScormSessionDocument extends Document {
  sessionId: string;
  learnerId: string;
  courseId: string;
  cmiData: Record<string, string>;
  isCompleted: boolean;
}

export const ScormSessionSchema = new Schema<IScormSessionDocument>({
  sessionId: { type: String, required: true, unique: true, index: true },
  learnerId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  cmiData: { type: Map, of: String, default: {} },
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

// ============================================================================
// 12. LTI 1.3 STATE & NONCE SCHEMAS (Distributed Replay Protection)
// ============================================================================
export interface ILtiStateDocument extends Document {
  state: string;
  nonce: string;
  iss: string;
  createdAt: Date;
}

export const LtiStateSchema = new Schema<ILtiStateDocument>({
  state: { type: String, required: true, unique: true, index: true },
  nonce: { type: String, required: true },
  iss: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 } // TTL 15 minutes
});

export interface ILtiConsumedNonceDocument extends Document {
  nonce: string;
  consumedAt: Date;
}

export const LtiConsumedNonceSchema = new Schema<ILtiConsumedNonceDocument>({
  nonce: { type: String, required: true, unique: true, index: true },
  consumedAt: { type: Date, default: Date.now, expires: 900 } // TTL 15 minutes
});

// Export Model Factory / Getters
export const TenantModel = mongoose.models.Tenant || mongoose.model<ITenantDocument>('Tenant', TenantSchema);
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
export const CourseModel = mongoose.models.Course || mongoose.model<ICourseDocument>('Course', CourseSchema);
export const EnrollmentModel = mongoose.models.Enrollment || mongoose.model<IEnrollmentDocument>('Enrollment', EnrollmentSchema);
export const AssessmentModel = mongoose.models.Assessment || mongoose.model<IAssessmentDocument>('Assessment', AssessmentSchema);
export const SubmissionModel = mongoose.models.Submission || mongoose.model<ISubmissionDocument>('Submission', SubmissionSchema);
export const CertificateModel = mongoose.models.Certificate || mongoose.model<ICertificateDocument>('Certificate', CertificateSchema);
export const AdmissionModel = mongoose.models.Admission || mongoose.model<IAdmissionDocument>('Admission', AdmissionSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
export const ProcessedWebhookEventModel = mongoose.models.ProcessedWebhookEvent || mongoose.model<IProcessedWebhookEventDocument>('ProcessedWebhookEvent', ProcessedWebhookEventSchema);
export const ScormSessionModel = mongoose.models.ScormSession || mongoose.model<IScormSessionDocument>('ScormSession', ScormSessionSchema);
export const LtiStateModel = mongoose.models.LtiState || mongoose.model<ILtiStateDocument>('LtiState', LtiStateSchema);
export const LtiConsumedNonceModel = mongoose.models.LtiConsumedNonce || mongoose.model<ILtiConsumedNonceDocument>('LtiConsumedNonce', LtiConsumedNonceSchema);

// ============================================================================
// 13. FILE ASSET SCHEMA (Cloudflare R2 Persistent Object Storage)
// ============================================================================
export interface IFileAssetDocument extends Document {
  id: string;
  key: string;
  bucket: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  tenantId?: string | null;
  ownerId: string;
  category: 'COURSE_MATERIAL' | 'IMAGE' | 'VIDEO_SOURCE' | 'TRANSCODED_HLS' | 'VERIFICATION_DOC';
  isPublic: boolean;
  status: 'PENDING' | 'READY' | 'DELETED';
  createdAt: string;
}

export const FileAssetSchema = new Schema<IFileAssetDocument>({
  id: { type: String, required: true, unique: true, index: true },
  key: { type: String, required: true, unique: true, index: true },
  bucket: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  tenantId: { type: String, default: null, index: true },
  ownerId: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['COURSE_MATERIAL', 'IMAGE', 'VIDEO_SOURCE', 'TRANSCODED_HLS', 'VERIFICATION_DOC'],
    default: 'COURSE_MATERIAL',
  },
  isPublic: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['PENDING', 'READY', 'DELETED'],
    default: 'PENDING',
    index: true,
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

FileAssetSchema.index({ tenantId: 1, category: 1 });
FileAssetSchema.index({ ownerId: 1, status: 1 });

// ============================================================================
// 14. SECURITY TOKEN SCHEMA (Password Reset & Verification Single-Use Tokens)
// ============================================================================
export interface ISecurityTokenDocument extends Document {
  id: string;
  userId: string;
  tokenHash: string;
  type: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export const SecurityTokenSchema = new Schema<ISecurityTokenDocument>({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  type: {
    type: String,
    enum: ['PASSWORD_RESET', 'EMAIL_VERIFICATION'],
    required: true,
  },
  expiresAt: { type: Date, required: true, index: true },
  isUsed: { type: Boolean, default: false, index: true },
  usedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ============================================================================
// 15. PERSISTENT TRANSCODE JOB SCHEMA (MongoDB & BullMQ Worker Status)
// ============================================================================
export interface ITranscodeJobDocument extends Document {
  id: string;
  courseId: string;
  lessonId: string;
  tenantId?: string | null;
  sourceUrl: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progressPercentage: number;
  outputMasterPlaylist?: string;
  renditions: Array<{
    resolution: string;
    bitrateKbps: number;
    playlistUrl: string;
  }>;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  completedAt?: string;
}

export const TranscodeJobSchema = new Schema<ITranscodeJobDocument>({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  lessonId: { type: String, required: true, index: true },
  tenantId: { type: String, default: null, index: true },
  sourceUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'QUEUED',
    index: true,
  },
  progressPercentage: { type: Number, default: 0 },
  outputMasterPlaylist: String,
  renditions: [{
    resolution: String,
    bitrateKbps: Number,
    playlistUrl: String,
  }],
  errorMessage: String,
  attempts: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  completedAt: String,
}, { timestamps: true });

TranscodeJobSchema.index({ courseId: 1, lessonId: 1 });

export const FileAssetModel = mongoose.models.FileAsset || mongoose.model<IFileAssetDocument>('FileAsset', FileAssetSchema);
export const SecurityTokenModel = mongoose.models.SecurityToken || mongoose.model<ISecurityTokenDocument>('SecurityToken', SecurityTokenSchema);
export const TranscodeJobModel = mongoose.models.TranscodeJob || mongoose.model<ITranscodeJobDocument>('TranscodeJob', TranscodeJobSchema);

// ============================================================================
// 16. LIVE SESSION SCHEMA (Interactive WebRTC Live Classrooms)
// ============================================================================
export interface ILiveSessionDocument extends Document {
  id: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  title: string;
  scheduledStartTime: string;
  durationMinutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'CONCLUDED';
  roomToken?: string;
  recordingUrl?: string;
  attendanceCount: number;
}

export const LiveSessionSchema = new Schema<ILiveSessionDocument>({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  courseTitle: { type: String, required: true },
  instructorId: { type: String, required: true, index: true },
  instructorName: { type: String, required: true },
  title: { type: String, required: true },
  scheduledStartTime: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  status: {
    type: String,
    enum: ['SCHEDULED', 'LIVE', 'CONCLUDED'],
    default: 'SCHEDULED',
    index: true,
  },
  roomToken: String,
  recordingUrl: String,
  attendanceCount: { type: Number, default: 0 },
}, { timestamps: true });

LiveSessionSchema.index({ courseId: 1, status: 1 });

export const LiveSessionModel = mongoose.models.LiveSession || mongoose.model<ILiveSessionDocument>('LiveSession', LiveSessionSchema);

// ============================================================================
// 17. COURSE REVIEWS & RATINGS SCHEMA (WEB-10)
// ============================================================================
export interface ICourseReviewDocument extends Document {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export const CourseReviewSchema = new Schema<ICourseReviewDocument>({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

CourseReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });

export const CourseReviewModel = mongoose.models.CourseReview || mongoose.model<ICourseReviewDocument>('CourseReview', CourseReviewSchema);

// ============================================================================
// 18. COURSE ANNOUNCEMENTS SCHEMA (LRN-07)
// ============================================================================
export interface ICourseAnnouncementDocument extends Document {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
}

export const CourseAnnouncementSchema = new Schema<ICourseAnnouncementDocument>({
  id: { type: String, required: true, unique: true, index: true },
  courseId: { type: String, required: true, index: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

export const CourseAnnouncementModel = mongoose.models.CourseAnnouncement || mongoose.model<ICourseAnnouncementDocument>('CourseAnnouncement', CourseAnnouncementSchema);

// ============================================================================
// 19. SUPPORT TICKETS SCHEMA (WEB-02, ADM-04)
// ============================================================================
export interface ISupportTicketDocument extends Document {
  id: string;
  fullName: string;
  email: string;
  category: 'GENERAL' | 'TECHNICAL' | 'ACADEMIC' | 'BILLING' | 'ACCREDITATION';
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
}

export const SupportTicketSchema = new Schema<ISupportTicketDocument>({
  id: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  category: {
    type: String,
    enum: ['GENERAL', 'TECHNICAL', 'ACADEMIC', 'BILLING', 'ACCREDITATION'],
    default: 'GENERAL',
  },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['OPEN', 'IN_REVIEW', 'RESOLVED'],
    default: 'OPEN',
    index: true,
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

export const SupportTicketModel = mongoose.models.SupportTicket || mongoose.model<ISupportTicketDocument>('SupportTicket', SupportTicketSchema);




