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
import { connectionState } from './mongoConnection';
import { DatabaseUnavailableError } from '../errors';
import {
  ITenant,
  IUser,
  ICourse,
  IEnrollment,
  IAssessment,
  ISubmission,
  ICertificate,
  ILiveSession,
  IAuditLog,
  UserRole,
  TenantStatus
} from '../types';

export class DatabaseRepository {
  public isMongoActive(): boolean {
    return connectionState.isConnected;
  }

  /** Fail closed in every environment when durable MongoDB storage is unavailable. */
  private assertActiveStorage(): void {
    if (!this.isMongoActive()) {
      throw new DatabaseUnavailableError(
        'MongoDB persistence is unavailable. Operation halted to prevent in-memory data divergence.'
      );
    }
  }

  // ==========================================================================
  // TENANTS
  // ==========================================================================
  async getTenants(filters?: { status?: string; type?: string }): Promise<ITenant[]> {
    this.assertActiveStorage();

    const query: any = {};
    if (filters?.status) query.status = filters.status.toUpperCase();
    if (filters?.type) query.type = filters.type.toUpperCase();
    return await TenantModel.find(query).lean() as any;
  }

  async getTenantById(idOrSlug: string): Promise<ITenant | null> {
    this.assertActiveStorage();

    const doc = await TenantModel.findOne({
      $or: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }]
    }).lean();
    return (doc as any) || null;
  }

  async createTenant(tenantData: ITenant): Promise<ITenant> {
    this.assertActiveStorage();

    await TenantModel.create(tenantData);
    return tenantData;
  }

  async updateTenantStatus(id: string, status: TenantStatus, remarks?: string): Promise<ITenant | null> {
    this.assertActiveStorage();

    const doc = await TenantModel.findOneAndUpdate(
      { $or: [{ id }, { slug: id }] },
      { $set: { status } },
      { new: true }
    ).lean();
    return (doc as any) || null;
  }

  // ==========================================================================
  // USERS & IAM
  // ==========================================================================
  async getUsers(): Promise<IUser[]> {
    this.assertActiveStorage();

    return await UserModel.find().lean() as any;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    this.assertActiveStorage();

    const normalized = email.toLowerCase().trim();
    const doc = await UserModel.findOne({ email: normalized }).lean();
    return (doc as any) || null;
  }

  async getUserById(id: string): Promise<IUser | null> {
    this.assertActiveStorage();

    const doc = await UserModel.findOne({ id }).lean();
    return (doc as any) || null;
  }

  async getUserTokenVersion(id: string): Promise<number | null> {
    this.assertActiveStorage();

    const doc = await UserModel.findOne({ id }).select('tokenVersion').lean();
    const user = Array.isArray(doc) ? doc[0] : doc;
    return user ? user.tokenVersion ?? 0 : null;
  }

  async createUser(userData: IUser): Promise<IUser> {
    this.assertActiveStorage();

    await UserModel.create(userData);
    return userData;
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<IUser | null> {
    this.assertActiveStorage();

    const doc = await UserModel.findOneAndUpdate(
      { id: userId },
      { $set: { activeRole: newRole } },
      { new: true }
    ).lean();
    return (doc as any) || null;
  }

  // ==========================================================================
  // COURSES & CURRICULUM (With strict Tenant Isolation)
  // ==========================================================================
  async getCourses(filters?: {
    category?: string;
    search?: string;
    level?: string;
    tenantId?: string | null;
  }, tenantContextId?: string | null): Promise<ICourse[]> {
    this.assertActiveStorage();

    const query: Record<string, any> = { isPublished: true };
    if (filters?.category && filters.category !== 'All') {
      const category = filters.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.category = new RegExp(category, 'i');
    }
    if (filters?.level) query.level = filters.level;

    if (tenantContextId) {
      query.$or = [
        { tenantId: tenantContextId, visibility: 'INSTITUTION_RESTRICTED' },
        { visibility: 'PUBLIC' },
      ];
    } else {
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

    return await CourseModel.find(query).lean() as any;
  }

  async getCourseById(id: string, tenantContextId?: string | null): Promise<ICourse | null> {
    this.assertActiveStorage();

    const doc = await CourseModel.findOne({ $or: [{ id }, { slug: id }] }).lean();
    if (!doc) return null;
    const course = doc as any;
    if (tenantContextId && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId !== tenantContextId) {
      return null;
    }
    return course;
  }

  async createCourse(courseData: ICourse): Promise<ICourse> {
    this.assertActiveStorage();

    await CourseModel.create(courseData);
    return courseData;
  }

  // ==========================================================================
  // ENROLLMENTS & PROGRESS
  // ==========================================================================
  async getEnrollmentsByLearner(learnerId: string): Promise<IEnrollment[]> {
    this.assertActiveStorage();

    return await EnrollmentModel.find({ learnerId }).lean() as any;
  }

  async createEnrollment(enrollmentData: IEnrollment): Promise<IEnrollment> {
    this.assertActiveStorage();

    await EnrollmentModel.create(enrollmentData);
    return enrollmentData;
  }

  async updateProgress(courseId: string, learnerId: string, lessonId: string): Promise<IEnrollment | null> {
    this.assertActiveStorage();

    const doc = await EnrollmentModel.findOne({ courseId, learnerId });
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
      return doc.toObject() as any;
    }
    return null;
  }

  // ==========================================================================
  // ASSESSMENTS & SUBMISSIONS
  // ==========================================================================
  async getAssessmentById(id: string): Promise<IAssessment | null> {
    this.assertActiveStorage();

    const doc = await AssessmentModel.findOne({ id }).lean();
    return (doc as any) || null;
  }

  async getAssessmentByCourseId(courseId: string): Promise<IAssessment | null> {
    this.assertActiveStorage();

    const doc = await AssessmentModel.findOne({ courseId }).lean();
    return (doc as any) || null;
  }

  async createSubmission(submissionData: ISubmission): Promise<ISubmission> {
    this.assertActiveStorage();

    await SubmissionModel.create(submissionData);
    return submissionData;
  }

  // ==========================================================================
  // CERTIFICATES & DIPLOMAS
  // ==========================================================================
  async getCertificates(learnerId?: string): Promise<ICertificate[]> {
    this.assertActiveStorage();

    const query = learnerId ? { learnerId } : {};
    return await CertificateModel.find(query).lean() as any;
  }

  async getCertificateByCode(code: string): Promise<ICertificate | null> {
    this.assertActiveStorage();

    const trimmed = code.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await CertificateModel.findOne({
      $or: [
        { certificateNumber: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { verificationHash: trimmed }
      ]
    }).lean();
    return (doc as any) || null;
  }

  async createCertificate(certData: ICertificate): Promise<ICertificate> {
    this.assertActiveStorage();

    await CertificateModel.create(certData);
    return certData;
  }

  async revokeCertificate(idOrNumber: string, reason: string): Promise<ICertificate | null> {
    this.assertActiveStorage();

    const doc = await CertificateModel.findOneAndUpdate(
      { $or: [{ id: idOrNumber }, { certificateNumber: idOrNumber }] },
      { $set: { status: 'REVOKED', revocationReason: reason } },
      { new: true }
    ).lean();
    return (doc as any) || null;
  }

  // ==========================================================================
  // LIVE SESSIONS (Multi-Tenant WebRTC Classrooms)
  // ==========================================================================
  async getLiveSessions(): Promise<ILiveSession[]> {
    this.assertActiveStorage();

    return await LiveSessionModel.find().lean() as any;
  }

  async getLiveSessionById(id: string): Promise<ILiveSession | null> {
    this.assertActiveStorage();

    const doc = await LiveSessionModel.findOne({ id }).lean();
    return doc as any;
  }

  async createLiveSession(session: ILiveSession): Promise<ILiveSession> {
    this.assertActiveStorage();

    const doc = await LiveSessionModel.create(session);
    return doc.toObject() as any;
  }

  async updateLiveSession(id: string, updates: Partial<ILiveSession>): Promise<ILiveSession | null> {
    this.assertActiveStorage();

    const doc = await LiveSessionModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    return doc as any;
  }

  // ==========================================================================
  // ADMISSIONS & AUDIT LOGS
  // ==========================================================================
  async getAdmissions(filters?: { institutionId?: string; status?: string }, tenantContextId?: string | null): Promise<any[]> {
    this.assertActiveStorage();

    const query: any = {};
    if (tenantContextId) query.institutionId = tenantContextId;
    else if (filters?.institutionId) query.institutionId = filters.institutionId;
    if (filters?.status) query.status = filters.status.toUpperCase();
    return await AdmissionModel.find(query).lean() as any;
  }

  async createAuditLog(log: IAuditLog): Promise<void> {
    this.assertActiveStorage();

    await AuditLogModel.create(log);
  }

  async getAuditLogs(tenantContextId?: string | null): Promise<IAuditLog[]> {
    this.assertActiveStorage();

    const query = tenantContextId ? { tenantId: tenantContextId } : {};
    return await AuditLogModel.find(query).sort({ timestamp: -1 }).limit(20).lean() as any;
  }
}

export const repo = new DatabaseRepository();
