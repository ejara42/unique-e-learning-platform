import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repo } from '../data/dbRepository';
import { cacheService } from '../cache/cacheService';
import { requireAuth, requireRole, optionalAuth, AuthRequest } from '../middleware/auth';
import { ICourse, IEnrollment } from '../types';
import { CourseReviewModel, CourseAnnouncementModel, CourseModel, EnrollmentModel } from '../models';
import { eventBus } from '../events/eventBus';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  createCourseSchema,
  courseReviewSchema,
  courseAnnouncementSchema,
  courseProgressSchema,
  courseCatalogQuerySchema,
  emptyBodySchema,
  emptyQuerySchema,
  identifierParamsSchema,
} from '../validation/schemas';

const router = Router();

// GET /api/courses - Catalog listing with search & tenant filtering
router.get('/', optionalAuth, validateQuery(courseCatalogQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, level } = req.query;
    const effectiveTenant = req.user?.institutionId || null;
    const filters = {
      category: typeof category === 'string' ? category : undefined,
      search: typeof search === 'string' ? search : undefined,
      level: typeof level === 'string' ? level : undefined,
    };
    const queryHash = cacheService.hashQuery({ ...filters, tenantId: effectiveTenant });
    const cacheKey = `courses:catalog:${effectiveTenant || 'public'}:${queryHash}`;
    const cached = await cacheService.get<{ courses: ICourse[]; total: number }>(cacheKey);

    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.json(cached);
      return;
    }

    const courses = await repo.getCourses(filters, effectiveTenant);

    const payload = { courses, total: courses.length };
    await cacheService.set(cacheKey, payload, { ttlSeconds: 300, tags: ['courses:catalog'] });

    res.setHeader('X-Cache-Status', 'MISS');
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving courses', error: err.message });
  }
});

// GET /api/courses/my-courses - Learner enrolled courses (Mockup 5)
router.get('/my-courses', requireAuth, validateQuery(emptyQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || '';
    const enrollments = await repo.getEnrollmentsByLearner(userId);

    const enriched = await Promise.all(
      enrollments.map(async enr => {
        const course = await repo.getCourseById(enr.courseId);
        return {
          ...enr,
          course,
        };
      })
    );

    res.json({ enrollments: enriched });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving your courses', error: err.message });
  }
});

// GET /api/courses/:id - Course Detail view (Mockup 4)
router.get('/:id', optionalAuth, validateParams(identifierParamsSchema), validateQuery(emptyQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const course = await repo.getCourseById(req.params.id as string);
    if (!course || !course.isPublished) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN' &&
      req.user.globalRole === 'PLATFORM_SUPERADMIN';
    const isOfferingTenantMember = Boolean(
      req.user?.institutionId &&
      course.tenantId &&
      req.user.institutionId === course.tenantId
    );
    if (course.visibility !== 'PUBLIC' && !isOfferingTenantMember && !isPlatformAdmin) {
      res.status(req.user ? 403 : 401).json({ message: 'This course is restricted to its offering institution.' });
      return;
    }

    const cacheKey = `course:detail:${req.params.id}:${req.user?.institutionId || 'public'}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.json(cached);
      return;
    }

    const assessment = await repo.getAssessmentByCourseId(course.id);

    const payload = {
      course,
      assessmentPreview: assessment ? { id: assessment.id, title: assessment.title, durationMinutes: assessment.durationMinutes } : null,
    };

    await cacheService.set(cacheKey, payload, { ttlSeconds: 600, tags: ['courses:catalog', `course:${course.id}`] });

    res.setHeader('X-Cache-Status', 'MISS');
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving course details', error: err.message });
  }
});

// POST /api/courses - Course Builder 4-Step Wizard (Mockup 6)
router.post('/', requireAuth, requireRole('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), validateBody(createCourseSchema), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      level,
      price,
      visibility,
      modules,
      completionCriteria,
      isPublished,
    } = req.body;

    if (!title || !category) {
      res.status(400).json({ message: 'Title and category are required' });
      return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const institutionId = req.user?.institutionId || null;
    let institutionName = '';
    if (institutionId) {
      const tenant = await repo.getTenantById(institutionId);
      if (tenant) institutionName = tenant.name;
    }

    const newCourse: ICourse = {
      id: `course-${uuidv4().slice(0, 8)}`,
      tenantId: institutionId,
      institutionName,
      title,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      tagline: description ? description.slice(0, 100) : '',
      description: description || '',
      category,
      level: level || 'All Levels',
      durationHours: 0,
      instructorId: req.user?.id || '',
      instructorName: req.user?.fullName || '',
      thumbnailUrl: '',
      visibility: visibility || 'PUBLIC',
      price: price || 0,
      rating: 0,
      ratingCount: 0,
      enrolledCount: 0,
      isPublished: isPublished === true,
      learningOutcomes: [],
      modules: modules || [],
      completionCriteria: completionCriteria || {
        minimumPassingGradePct: 75,
      },
      createdAt: new Date().toISOString(),
    };

    await repo.createCourse(newCourse);
    await cacheService.invalidateByTag('courses:catalog');

    // Async event dispatch to decoupled event bus
    eventBus.publish('COURSE_CREATED', newCourse.id, newCourse);

    res.status(201).json({
      message: 'Course created and published to academy curriculum!',
      course: newCourse,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create course', error: err.message });
  }
});

// POST /api/courses/:id/enroll - Enroll active learner
router.post('/:id/enroll', requireAuth, validateParams(identifierParamsSchema), validateBody(emptyBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const course = await repo.getCourseById(req.params.id as string);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (!course.isPublished) {
      res.status(404).json({ message: 'Course is not available for enrollment' });
      return;
    }

    if (course.price > 0) {
      res.status(402).json({ message: 'Payment is required. Complete checkout before enrollment.' });
      return;
    }

    // Cross-Tenant Barrier: If course is INSTITUTION_RESTRICTED, only members of the tenant or platform admin may enroll
    if (course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId) {
      const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
      const isAuthorizedTenant = req.user?.institutionId === course.tenantId;
      if (!isPlatformAdmin && !isAuthorizedTenant) {
        res.status(403).json({ message: 'Forbidden: This course is restricted to members of the offering institution.' });
        return;
      }
    }

    const learnerId = req.user?.id || '';
    const existing = await repo.getEnrollmentsByLearner(learnerId);
    const alreadyEnrolled = existing.find(e => e.courseId === course.id);

    if (alreadyEnrolled) {
      res.json({ message: 'Already enrolled in this course', enrollment: alreadyEnrolled });
      return;
    }

    const newEnrollment: IEnrollment = {
      id: `enr-${uuidv4().slice(0, 8)}`,
      courseId: course.id,
      learnerId,
      tenantId: course.tenantId,
      status: 'ENROLLED',
      enrolledAt: new Date().toISOString(),
      progressPercentage: 0,
      completedLessonIds: [],
    };

    await repo.createEnrollment(newEnrollment);

    // Async event dispatch to decoupled event bus
    eventBus.publish('COURSE_ENROLLED', newEnrollment.id, {
      enrollmentId: newEnrollment.id,
      courseId: course.id,
      learnerId,
      courseTitle: course.title,
      enrolledAt: newEnrollment.enrolledAt,
    });

    res.status(201).json({
      message: 'Enrollment confirmed!',
      enrollment: newEnrollment,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Enrollment failed', error: err.message });
  }
});

// PATCH /api/courses/:id/progress - Mark lesson complete
router.patch('/:id/progress', requireAuth, validateParams(identifierParamsSchema), validateBody(courseProgressSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.body;
    const learnerId = req.user?.id || '';
    const enrollment = await repo.updateProgress(req.params.id as string, learnerId, lessonId);

    if (!enrollment) {
      res.status(404).json({ message: 'Enrollment record not found' });
      return;
    }

    res.json({ message: 'Progress updated', enrollment });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update progress', error: err.message });
  }
});

// GET /api/courses/:id/reviews - Retrieve student ratings & reviews (WEB-10)
router.get('/:id/reviews', validateParams(identifierParamsSchema), validateQuery(emptyQuerySchema), async (req: Request, res: Response) => {
  try {
    const reviews = await CourseReviewModel.find({ courseId: req.params.id as string })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ reviews });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
  }
});

// POST /api/courses/:id/reviews - Submit student rating & review (WEB-10)
router.post('/:id/reviews', requireAuth, validateParams(identifierParamsSchema), validateBody(courseReviewSchema), async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.id as string;
    const userId = req.user?.id;
    const userName = req.user?.fullName || 'Verified Learner';
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Valid rating between 1 and 5 is required' });
      return;
    }
    if (!comment || !comment.trim()) {
      res.status(400).json({ message: 'Review comment cannot be empty' });
      return;
    }

    // Verify student is actually enrolled in the course
    let isEnrolled: any = null;
    if (repo.isMongoActive()) {
      isEnrolled = await EnrollmentModel.findOne({ courseId, learnerId: userId });
    } else {
      const enrollments = await repo.getEnrollmentsByLearner(userId || '');
      isEnrolled = enrollments.find(e => e.courseId === courseId);
    }
    if (!isEnrolled && req.user?.activeRole !== 'PLATFORM_ADMIN') {
      res.status(403).json({ message: 'Only enrolled scholars can submit course reviews' });
      return;
    }

    // Prevent duplicate reviews from the same scholar
    const existing = repo.isMongoActive()
      ? await CourseReviewModel.findOne({ courseId, userId })
      : null;
    if (existing) {
      res.status(409).json({ message: 'You have already submitted a review for this curriculum' });
      return;
    }

    const review = await CourseReviewModel.create({
      id: `rev-${uuidv4().slice(0, 8)}`,
      courseId,
      userId,
      userName,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    });

    // Dispatch asynchronous event to decoupled event bus for rating recalculation & search indexing
    eventBus.publish('REVIEW_SUBMITTED', courseId, {
      courseId,
      reviewId: review.id,
      rating: review.rating,
      userId,
    });

    res.status(201).json({ message: 'Review published successfully', review });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to submit review', error: err.message });
  }
});

// GET /api/courses/:id/announcements - Retrieve course announcements (LRN-07)
router.get('/:id/announcements', validateParams(identifierParamsSchema), validateQuery(emptyQuerySchema), async (req: Request, res: Response) => {
  try {
    const announcements = await CourseAnnouncementModel.find({ courseId: req.params.id as string })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ announcements });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch announcements', error: err.message });
  }
});

// POST /api/courses/:id/announcements - Publish faculty course announcement (LRN-07)
router.post('/:id/announcements', requireAuth, requireRole('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), validateParams(identifierParamsSchema), validateBody(courseAnnouncementSchema), async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.id as string;
    const authorId = req.user?.id || '';
    const authorName = req.user?.fullName || 'Faculty Instructor';
    const { title, content } = req.body;

    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ message: 'Announcement title and content are required' });
      return;
    }

    const course = await repo.getCourseById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Authorization: Instructors can only post to their own courses, Institution Admin to their institution's courses
    if (req.user?.activeRole === 'INSTRUCTOR' && course.instructorId !== req.user.id && req.user.globalRole !== 'PLATFORM_SUPERADMIN') {
      res.status(403).json({ message: 'Forbidden: You can only publish announcements for courses you instruct.' });
      return;
    }
    if (req.user?.activeRole === 'INSTITUTION_ADMIN' && course.tenantId !== req.user.institutionId && req.user.globalRole !== 'PLATFORM_SUPERADMIN') {
      res.status(403).json({ message: 'Forbidden: You cannot post announcements for another institution.' });
      return;
    }

    const announcement = await CourseAnnouncementModel.create({
      id: `ann-${uuidv4().slice(0, 8)}`,
      courseId,
      authorId,
      authorName,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Course announcement published', announcement });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to post announcement', error: err.message });
  }
});

export default router;
