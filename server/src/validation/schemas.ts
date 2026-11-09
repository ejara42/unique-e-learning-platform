import { z } from 'zod';

/**
 * Enterprise Schema Definitions for EduSphere (Zod)
 * Strictly enforces payload shapes, input length boundaries, email normalization,
 * password complexity, and `.strict()` stripping to prevent Mass Assignment / Prototype Pollution.
 */

// =============================================================================
// Helper Sanitizers & Transformers
// =============================================================================

export function sanitizeHtmlString(val: string): string {
  if (!val) return val;
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}

const sanitizedString = (min = 1, max = 2000) =>
  z.string()
    .trim()
    .min(min, `Must be at least ${min} characters`)
    .max(max, `Must not exceed ${max} characters`)
    .transform(sanitizeHtmlString);

const strongPassword = z.string()
  .min(12, 'Password must be at least 12 characters in length')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const identifierParamsSchema = z.object({
  id: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier format'),
}).strict();
export const assetIdParamsSchema = z.object({
  assetId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, 'Invalid asset identifier'),
}).strict();
export const transcodeJobParamsSchema = z.object({
  jobId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
export const transcodeLessonParamsSchema = z.object({
  courseId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  lessonId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

export const courseCatalogQuerySchema = z.object({
  category: z.string().trim().min(1).max(60).optional(),
  search: z.string().trim().max(120).optional(),
  level: z.string().trim().max(60).optional(),
}).strict();

export const liveSessionQuerySchema = z.object({
  courseId: z.string().trim().min(1).max(128).optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'CONCLUDED']).optional(),
}).strict();
export const tenantDirectoryQuerySchema = z.object({
  status: z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'REJECTED']).optional(),
  type: z.enum(['K12_SCHOOL', 'COLLEGE', 'UNIVERSITY', 'VOCATIONAL', 'TRAINING_CENTER']).optional(),
}).strict();
export const adminAdmissionsQuerySchema = z.object({
  institutionId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
  status: z.enum(['ACCEPTED', 'REJECTED', 'PENDING']).optional(),
}).strict();
export const searchCoursesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  level: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().finite().min(0).max(100000).optional(),
  maxPrice: z.coerce.number().finite().min(0).max(100000).optional(),
  minRating: z.coerce.number().finite().min(0).max(5).optional(),
  page: z.coerce.number().int().positive().max(100000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict().refine(value =>
  value.minPrice === undefined ||
  value.maxPrice === undefined ||
  value.minPrice <= value.maxPrice,
{ message: 'minPrice must not exceed maxPrice' });
export const certificateCodeParamsSchema = z.object({
  code: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
export const certificateRevokeSchema = z.object({
  reason: z.string().trim().max(1000).transform(sanitizeHtmlString).optional(),
}).strict();
export const ltiLoginSchema = z.object({
  iss: z.string().url().max(2048),
  login_hint: z.string().trim().max(500).optional(),
  target_link_uri: z.string().url().max(2048).optional(),
}).strict();
export const ltiLaunchSchema = z.object({
  id_token: z.string().min(1).max(20000),
  state: z.string().trim().min(8).max(512),
}).strict();
export const scormInitializeSchema = z.object({
  courseId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  sessionId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();
export const scormSessionParamsSchema = z.object({
  sessionId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
export const scormSetSchema = z.object({
  element: z.string().trim().min(1).max(100),
  value: z.union([z.string().max(5000), z.number().finite(), z.boolean()]),
}).strict();
export const scormGetQuerySchema = z.object({
  element: z.string().trim().min(1).max(100),
}).strict();

export const emptyBodySchema = z.object({}).strict().optional();
export const emptyQuerySchema = z.object({}).strict();

export const storageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255).refine(name => !/[\\/]/.test(name), 'File name must not contain path separators'),
  fileType: z.string().trim().min(3).max(100),
  fileSize: z.number().int().positive().max(1024 * 1024 * 1024),
  category: z.enum(['COURSE_MATERIAL', 'IMAGE', 'VIDEO_SOURCE', 'TRANSCODED_HLS', 'VERIFICATION_DOC']),
  isPublic: z.boolean().optional(),
}).strict();

export const storageConfirmSchema = z.object({
  assetId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

export const paymentCheckoutSchema = z.object({
  courseId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  successUrl: z.string().url().max(2048).optional(),
  cancelUrl: z.string().url().max(2048).optional(),
}).strict();

export const assessmentTelemetrySchema = z.object({
  eventType: z.enum(['TAB_BLUR', 'FULLSCREEN_EXIT', 'COPY_PASTE_ATTEMPT']),
  details: z.string().trim().max(500).optional(),
}).strict();

export const transcodeRequestSchema = z.object({
  courseId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  lessonId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  sourceUrl: z.string().url().max(2048).refine(value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Source URL must be a credential-free HTTPS URL'),
}).strict();

// =============================================================================
// Authentication Schemas
// =============================================================================

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email address is required').max(255).toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters in length').max(100),
  email: z.string().trim().email('A valid email address is required').max(255).toLowerCase(),
  password: strongPassword,
  role: z.enum(['STUDENT', 'INDEPENDENT_LEARNER'], {
    message: 'Public registration is limited to learner roles',
  }),
  institutionName: z.string().trim().max(150).optional(),
}).strict();

export const switchRoleSchema = z.object({
  newRole: z.enum(['PLATFORM_ADMIN', 'INSTITUTION_ADMIN', 'INSTRUCTOR', 'STUDENT', 'INDEPENDENT_LEARNER'], {
    message: 'Invalid role specified',
  }),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('A valid email address is required').max(255).toLowerCase(),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(8, 'Token is required').max(256),
  newPassword: strongPassword,
}).strict();

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(8, 'Verification token is required').max(256),
}).strict();

// =============================================================================
// Course Schemas
// =============================================================================

export const createCourseSchema = z.object({
  title: sanitizedString(3, 120),
  description: z.string().trim().max(5000).transform(sanitizeHtmlString).optional(),
  category: sanitizedString(2, 60),
  level: z.string().trim().max(60).optional(),
  price: z.number().finite().min(0, 'Price must be non-negative').max(100000).optional(),
  visibility: z.enum(['PUBLIC', 'INSTITUTION_RESTRICTED']).optional(),
  modules: z.array(z.object({
    id: z.string().trim().min(1).max(128),
    title: sanitizedString(2, 150),
    order: z.number().int().positive(),
    lessons: z.array(z.object({
      id: z.string().trim().min(1).max(128),
      title: sanitizedString(2, 150),
      order: z.number().int().positive(),
      contentType: z.enum(['VIDEO', 'DOCUMENT', 'QUIZ']),
      durationMinutes: z.number().int().min(0).max(1440),
      contentUrl: z.string().url().max(2048).optional(),
      body: z.string().max(20000).transform(sanitizeHtmlString).optional(),
      isFreePreview: z.boolean().optional(),
    }).strict()).max(100),
  }).strict()).max(100).optional(),
  completionCriteria: z.object({
    minimumPassingGradePct: z.number().finite().min(0).max(100).optional(),
    requiredQuizId: z.string().trim().min(1).max(128).optional(),
  }).strict().optional(),
  isPublished: z.boolean().optional(),
}).strict();

export const updateCourseSchema = createCourseSchema.partial().strict();

export const courseReviewSchema = z.object({
  rating: z.number()
    .min(1, 'Valid rating between 1 and 5 is required')
    .max(5, 'Valid rating between 1 and 5 is required'),
  comment: sanitizedString(1, 2000),
}).strict();

export const courseAnnouncementSchema = z.object({
  title: sanitizedString(2, 150),
  content: sanitizedString(3, 5000),
}).strict();

export const courseProgressSchema = z.object({
  lessonId: z.string().trim().min(1, 'lessonId is required').max(100),
}).strict();

// =============================================================================
// Support & Live Schemas
// =============================================================================

export const supportTicketSchema = z.object({
  fullName: sanitizedString(2, 100),
  email: z.string().trim().email('Valid institutional or personal email address required').max(255).toLowerCase(),
  category: z.string().trim().max(50).optional(),
  subject: sanitizedString(3, 150),
  message: sanitizedString(5, 3000),
}).strict();

export const liveRecordingSchema = z.object({
  action: z.enum(['START', 'STOP'], {
    message: "Action must be either 'START' or 'STOP'",
  }),
}).strict();

// =============================================================================
// Admin Schemas
// =============================================================================

export const admissionStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'PENDING'], {
    message: 'Status must be one of: ACCEPTED, REJECTED, PENDING',
  }),
  remarks: z.string().trim().max(1000).transform(sanitizeHtmlString).optional(),
}).strict();

// =============================================================================
// Tenant Schemas
// =============================================================================

export const tenantRegistrationSchema = z.object({
  institutionName: sanitizedString(2, 150),
  institutionType: z.enum(['K12_SCHOOL', 'COLLEGE', 'UNIVERSITY', 'VOCATIONAL', 'TRAINING_CENTER'], {
    message: 'Invalid institution type specified',
  }),
  contactEmail: z.string().trim().email('Valid institutional contact email required').max(255).toLowerCase(),
  contactPhone: z.string().trim().max(40).optional(),
  address: sanitizedString(2, 250).optional(),
  documents: z.array(z.object({
    title: sanitizedString(1, 150),
    fileUrl: z.string().url().max(2048),
    uploadedAt: z.string().datetime(),
  }).strict()).max(50).optional(),
}).strict();

export const tenantStatusSchema = z.object({
  status: z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'REJECTED'], {
    message: 'Invalid status. Must be one of: PENDING_VERIFICATION, VERIFIED, SUSPENDED, REJECTED',
  }),
  remarks: z.string().trim().max(1000).transform(sanitizeHtmlString).optional(),
}).strict();

export const assessmentSubmissionSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().trim().min(1).max(128),
    selectedOption: z.number().int().nonnegative().optional(),
    textAnswer: z.string().max(5000).optional(),
  }).strict()).max(200).optional(),
  proctoringFlags: z.array(z.object({
    type: z.enum(['TAB_BLUR', 'FULLSCREEN_EXIT', 'COPY_PASTE_ATTEMPT']),
    timestamp: z.string().datetime(),
    details: z.string().max(200).optional(),
  }).strict()).max(100).optional(),
  startedAt: z.string().datetime().optional(),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CourseReviewInput = z.infer<typeof courseReviewSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
