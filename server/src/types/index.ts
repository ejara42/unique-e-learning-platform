export type GlobalRole = 'PLATFORM_SUPERADMIN' | 'STANDARD_USER';

export type TenantRole = 'INSTITUTION_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'TEACHING_ASSISTANT';

export type UserRole = 
  | 'PLATFORM_ADMIN'
  | 'INSTITUTION_ADMIN'
  | 'INSTRUCTOR'
  | 'STUDENT'
  | 'INDEPENDENT_LEARNER';

export type TenantType = 'UNIVERSITY' | 'K12_SCHOOL' | 'TRAINING_CENTER' | 'INDEPENDENT_PROVIDER';

export type TenantStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED';

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  type: TenantType;
  status: TenantStatus;
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

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  globalRole: GlobalRole;
  activeRole: UserRole;
  authorizedRoles?: UserRole[];
  institutionId?: string | null;
  security: {
    isEmailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  createdAt: string;
}

export interface ICourse {
  id: string;
  tenantId?: string | null; // null for Independent Public Course
  institutionName?: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
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
  modules: Array<{
    id: string;
    title: string;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      order: number;
      contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ';
      durationMinutes: number;
      contentUrl?: string;
      body?: string;
      isFreePreview?: boolean;
    }>;
  }>;
  completionCriteria: {
    minimumPassingGradePct: number;
    requiredQuizId?: string;
  };
  createdAt: string;
}

export interface IEnrollment {
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

export interface IAssessment {
  id: string;
  courseId: string;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT' | 'MIDTERM' | 'FINAL_EXAM';
  instructions: string;
  durationMinutes: number; // 0 = untimed
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

export interface ISubmission {
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

export interface ILiveSession {
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

export interface ICertificate {
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

export interface IAuditLog {
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
