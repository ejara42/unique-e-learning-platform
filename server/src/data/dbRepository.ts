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
import { db } from './db';
import { connectionState } from './mongoConnection';
import { config } from '../config';
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

  /**
   * Fail-Safe Guard: In production mode, halts operations if MongoDB persistence is unavailable.
   */
  private assertActiveStorage(): void {
    if (config.isProduction && !this.isMongoActive()) {
      throw new DatabaseUnavailableError(
        'MongoDB persistence cluster is unavailable in production. Operation halted to prevent silent data loss or divergence.'
      );
    }
  }

  // ==========================================================================
  // TENANTS
  // ==========================================================================
  async getTenants(filters?: { status?: string; type?: string }): Promise<ITenant[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const query: any = {};
      if (filters?.status) query.status = filters.status.toUpperCase();
      if (filters?.type) query.type = filters.type.toUpperCase();
      const docs = await TenantModel.find(query).lean();
      return docs as any;
    }

    let results = [...db.tenants];
    if (filters?.status) results = results.filter(t => t.status === (filters.status as string).toUpperCase());
    if (filters?.type) results = results.filter(t => t.type === (filters.type as string).toUpperCase());
    return results;
  }

  async getTenantById(idOrSlug: string): Promise<ITenant | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await TenantModel.findOne({
        $or: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }]
      }).lean();
      return (doc as any) || null;
    }
    return db.tenants.find(t => t.id === idOrSlug || t.slug === idOrSlug) || null;
  }

  async createTenant(tenantData: ITenant): Promise<ITenant> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await TenantModel.create(tenantData);
      return tenantData;
    }
    db.tenants.unshift(tenantData);
    return tenantData;
  }

  async updateTenantStatus(id: string, status: TenantStatus, remarks?: string): Promise<ITenant | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await TenantModel.findOneAndUpdate(
        { $or: [{ id }, { slug: id }] },
        { $set: { status } },
        { new: true }
      ).lean();
      return (doc as any) || null;
    }

    const tenant = db.tenants.find(t => t.id === id || t.slug === id);
    if (tenant) {
      tenant.status = status;
      return tenant;
    }
    return null;
  }

  // ==========================================================================
  // USERS & IAM
  // ==========================================================================
  async getUsers(): Promise<IUser[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const docs = await UserModel.find().lean();
      return docs as any;
    }
    return db.users;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    this.assertActiveStorage();

    const normalized = email.toLowerCase().trim();
    if (this.isMongoActive()) {
      const doc = await UserModel.findOne({ email: normalized }).lean();
      return (doc as any) || null;
    }
    return db.users.find(u => u.email.toLowerCase() === normalized) || null;
  }

  async getUserById(id: string): Promise<IUser | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await UserModel.findOne({ id }).lean();
      return (doc as any) || null;
    }
    return db.users.find(u => u.id === id) || null;
  }

  async createUser(userData: IUser): Promise<IUser> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await UserModel.create(userData);
      return userData;
    }
    db.users.push(userData);
    return userData;
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<IUser | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await UserModel.findOneAndUpdate(
        { id: userId },
        { $set: { activeRole: newRole } },
        { new: true }
      ).lean();
      return (doc as any) || null;
    }
    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.activeRole = newRole;
      return user;
    }
    return null;
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

    if (this.isMongoActive()) {
      const query: any = {};
      if (filters?.category && filters.category !== 'All') query.category = new RegExp(filters.category, 'i');
      if (filters?.level) query.level = filters.level;

      if (tenantContextId) {
        query.$or = [{ tenantId: tenantContextId }, { visibility: 'PUBLIC' }];
      } else if (filters?.tenantId) {
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

      const docs = await CourseModel.find(query).lean();
      return docs as any;
    }

    let courses = [...db.courses];
    if (tenantContextId) {
      courses = courses.filter(c => c.tenantId === tenantContextId || c.visibility === 'PUBLIC');
    } else if (filters?.tenantId) {
      courses = courses.filter(c => c.tenantId === filters.tenantId);
    }
    if (filters?.category && filters.category !== 'All') {
      courses = courses.filter(c => c.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.level) {
      courses = courses.filter(c => c.level.toLowerCase() === filters.level!.toLowerCase());
    }
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      courses = courses.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term)
      );
    }
    return courses;
  }

  async getCourseById(id: string, tenantContextId?: string | null): Promise<ICourse | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await CourseModel.findOne({
        $or: [{ id }, { slug: id }]
      }).lean();
      if (doc) {
        const course = doc as any;
        // Cross-tenant barrier: institution-restricted courses cannot be accessed by other tenants
        if (tenantContextId && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId !== tenantContextId) {
          return null;
        }
        return course;
      }
      return null;
    }

    const course = db.courses.find(c => c.id === id || c.slug === id) || null;
    if (course && tenantContextId && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId !== tenantContextId) {
      return null;
    }
    return course;
  }

  async createCourse(courseData: ICourse): Promise<ICourse> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await CourseModel.create(courseData);
      return courseData;
    }
    db.courses.unshift(courseData);
    return courseData;
  }

  // ==========================================================================
  // ENROLLMENTS & PROGRESS
  // ==========================================================================
  async getEnrollmentsByLearner(learnerId: string): Promise<IEnrollment[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const docs = await EnrollmentModel.find({ learnerId }).lean();
      return docs as any;
    }
    return db.enrollments.filter(e => e.learnerId === learnerId);
  }

  async createEnrollment(enrollmentData: IEnrollment): Promise<IEnrollment> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await EnrollmentModel.create(enrollmentData);
      return enrollmentData;
    }
    db.enrollments.push(enrollmentData);
    return enrollmentData;
  }

  async updateProgress(courseId: string, learnerId: string, lessonId: string): Promise<IEnrollment | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
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

    const enrollment = db.enrollments.find(e => e.courseId === courseId && e.learnerId === learnerId);
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
  async getAssessmentById(id: string): Promise<IAssessment | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await AssessmentModel.findOne({ id }).lean();
      return (doc as any) || null;
    }
    return db.assessments.find(a => a.id === id) || null;
  }

  async getAssessmentByCourseId(courseId: string): Promise<IAssessment | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await AssessmentModel.findOne({ courseId }).lean();
      return (doc as any) || null;
    }
    return db.assessments.find(a => a.courseId === courseId) || null;
  }

  async createSubmission(submissionData: ISubmission): Promise<ISubmission> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await SubmissionModel.create(submissionData);
      return submissionData;
    }
    db.submissions.push(submissionData);
    return submissionData;
  }

  // ==========================================================================
  // CERTIFICATES & DIPLOMAS
  // ==========================================================================
  async getCertificates(learnerId?: string): Promise<ICertificate[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const query = learnerId ? { learnerId } : {};
      const docs = await CertificateModel.find(query).lean();
      return docs as any;
    }
    return learnerId ? db.certificates.filter(c => c.learnerId === learnerId) : db.certificates;
  }

  async getCertificateByCode(code: string): Promise<ICertificate | null> {
    this.assertActiveStorage();

    const trimmed = code.trim();
    if (this.isMongoActive()) {
      const doc = await CertificateModel.findOne({
        $or: [
          { certificateNumber: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
          { verificationHash: trimmed }
        ]
      }).lean();
      return (doc as any) || null;
    }
    return db.certificates.find(
      c => c.certificateNumber.toLowerCase() === trimmed.toLowerCase() || c.verificationHash === trimmed
    ) || null;
  }

  async createCertificate(certData: ICertificate): Promise<ICertificate> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await CertificateModel.create(certData);
      return certData;
    }
    db.certificates.unshift(certData);
    return certData;
  }

  async revokeCertificate(idOrNumber: string, reason: string): Promise<ICertificate | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await CertificateModel.findOneAndUpdate(
        { $or: [{ id: idOrNumber }, { certificateNumber: idOrNumber }] },
        { $set: { status: 'REVOKED', revocationReason: reason } },
        { new: true }
      ).lean();
      return (doc as any) || null;
    }

    const cert = db.certificates.find(c => c.id === idOrNumber || c.certificateNumber === idOrNumber);
    if (cert) {
      cert.status = 'REVOKED';
      cert.revocationReason = reason;
      return cert;
    }
    return null;
  }

  // ==========================================================================
  // LIVE SESSIONS (Multi-Tenant WebRTC Classrooms)
  // ==========================================================================
  async getLiveSessions(): Promise<ILiveSession[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const docs = await LiveSessionModel.find().lean();
      return docs as any;
    }

    return db.liveSessions;
  }

  async getLiveSessionById(id: string): Promise<ILiveSession | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await LiveSessionModel.findOne({ id }).lean();
      return doc as any;
    }

    return db.liveSessions.find(s => s.id === id) || null;
  }

  async createLiveSession(session: ILiveSession): Promise<ILiveSession> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await LiveSessionModel.create(session);
      return doc.toObject() as any;
    }

    db.liveSessions.push(session);
    return session;
  }

  async updateLiveSession(id: string, updates: Partial<ILiveSession>): Promise<ILiveSession | null> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const doc = await LiveSessionModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
      return doc as any;
    }

    const idx = db.liveSessions.findIndex(s => s.id === id);
    if (idx !== -1) {
      db.liveSessions[idx] = { ...db.liveSessions[idx], ...updates };
      return db.liveSessions[idx];
    }
    return null;
  }

  // ==========================================================================
  // ADMISSIONS & AUDIT LOGS
  // ==========================================================================
  async getAdmissions(filters?: { institutionId?: string; status?: string }, tenantContextId?: string | null): Promise<any[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const query: any = {};
      if (tenantContextId) query.institutionId = tenantContextId;
      else if (filters?.institutionId) query.institutionId = filters.institutionId;
      if (filters?.status) query.status = filters.status.toUpperCase();
      const docs = await AdmissionModel.find(query).lean();
      return docs as any;
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
    } else if (filters?.institutionId) {
      results = results.filter(r => r.institutionId === filters.institutionId);
    }
    if (filters?.status) {
      results = results.filter(r => r.status === filters.status!.toUpperCase());
    }
    return results;
  }

  async createAuditLog(log: IAuditLog): Promise<void> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      await AuditLogModel.create(log);
      return;
    }
    db.auditLogs.unshift(log);
  }

  async getAuditLogs(tenantContextId?: string | null): Promise<IAuditLog[]> {
    this.assertActiveStorage();

    if (this.isMongoActive()) {
      const query = tenantContextId ? { tenantId: tenantContextId } : {};
      const docs = await AuditLogModel.find(query).sort({ timestamp: -1 }).limit(20).lean();
      return docs as any;
    }
    return tenantContextId ? db.auditLogs.filter(l => l.tenantId === tenantContextId) : db.auditLogs;
  }
}

export const repo = new DatabaseRepository();
