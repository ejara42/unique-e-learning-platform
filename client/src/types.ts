export type UserRole = 
  | 'PLATFORM_ADMIN'
  | 'INSTITUTION_ADMIN'
  | 'INSTRUCTOR'
  | 'STUDENT'
  | 'INDEPENDENT_LEARNER';

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  activeRole: UserRole;
  authorizedRoles?: UserRole[];
  institutionId?: string | null;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  type: string;
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
    primaryColor: string;
    secondaryColor: string;
  };
  stats?: {
    totalStudents: number;
    totalCourses: number;
    totalInstructors: number;
  };
  createdAt: string;
}

export interface ILesson {
  id: string;
  title: string;
  order: number;
  contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ';
  durationMinutes: number;
  contentUrl?: string;
  body?: string;
  isFreePreview?: boolean;
}

export interface IModule {
  id: string;
  title: string;
  order: number;
  lessons: ILesson[];
}

export interface ICourse {
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
  modules: IModule[];
  completionCriteria?: {
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
  course?: ICourse;
}

export interface IQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
  prompt: string;
  options?: string[];
  points: number;
}

export interface IAssessment {
  id: string;
  courseId: string;
  title: string;
  type: string;
  instructions: string;
  durationMinutes: number;
  passingScorePct: number;
  questions: IQuestion[];
}

export interface ICertificate {
  id: string;
  certificateNumber: string;
  verificationHash: string;
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
  attendanceCount: number;
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
