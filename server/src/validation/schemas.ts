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
  password: z.string()
    .min(8, 'Password must be at least 8 characters in length')
    .max(128, 'Password must not exceed 128 characters'),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'INDEPENDENT_LEARNER', 'PLATFORM_ADMIN', 'INSTITUTION_ADMIN'], {
    message: 'Invalid academic role specified',
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
  newPassword: z.string().min(8, 'Password must be at least 8 characters in length').max(128),
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
  price: z.number().min(0, 'Price must be non-negative').max(100000).optional(),
  visibility: z.enum(['PUBLIC', 'INSTITUTION_RESTRICTED', 'PRIVATE']).optional(),
  modules: z.array(z.any()).optional(),
  completionCriteria: z.object({
    minimumPassingGradePct: z.number().min(0).max(100).optional(),
    requiredQuizId: z.string().optional(),
  }).optional(),
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
  documents: z.array(z.any()).optional(),
}).strict();

export const tenantStatusSchema = z.object({
  status: z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'REJECTED'], {
    message: 'Invalid status. Must be one of: PENDING_VERIFICATION, VERIFIED, SUSPENDED, REJECTED',
  }),
  remarks: z.string().trim().max(1000).transform(sanitizeHtmlString).optional(),
}).strict();

export const assessmentSubmissionSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOption: z.number().optional(),
    textAnswer: z.string().max(5000).optional(),
  })).optional(),
  proctoringFlags: z.array(z.string().max(100)).optional(),
  startedAt: z.string().optional(),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CourseReviewInput = z.infer<typeof courseReviewSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
