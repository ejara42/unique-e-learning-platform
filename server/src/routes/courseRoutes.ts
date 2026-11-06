import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repo } from '../data/dbRepository';
import { getTenantContext } from '../middleware/tenant';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { ICourse, IEnrollment } from '../types';
import { CourseReviewModel, CourseAnnouncementModel, CourseModel, EnrollmentModel } from '../models';

const router = Router();

// GET /api/courses - Catalog listing with search & tenant filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, level, tenantId } = req.query;
    const context = getTenantContext();
    const requestedTenantId = typeof tenantId === 'string' ? tenantId : null;

    let effectiveTenant: string | null = context.tenantId || null;
    if (effectiveTenant === null && requestedTenantId) {
      effectiveTenant = requestedTenantId;
    }

    const courses = await repo.getCourses({
      category: category as string,
      search: search as string,
      level: level as string,
      tenantId: effectiveTenant,
    }, effectiveTenant);

    res.json({ courses, total: courses.length });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving courses', error: err.message });
  }
});

// GET /api/courses/my-courses - Learner enrolled courses (Mockup 5)
router.get('/my-courses', requireAuth, async (req: AuthRequest, res: Response) => {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const context = getTenantContext();
    const course = await repo.getCourseById(req.params.id as string, context.tenantId);

    if (!course) {
      res.status(404).json({ message: 'Course not found or access restricted to specific institution.' });
      return;
    }

    if (course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId && context.tenantId && context.tenantId !== course.tenantId) {
      res.status(403).json({ message: 'Forbidden: This course is restricted to members of the offering institution.' });
      return;
    }

    const assessment = await repo.getAssessmentByCourseId(course.id);

    res.json({
      course,
      assessmentPreview: assessment ? { id: assessment.id, title: assessment.title, durationMinutes: assessment.durationMinutes } : null,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving course details', error: err.message });
  }
});

// POST /api/courses - Course Builder 4-Step Wizard (Mockup 6)
router.post('/', requireAuth, requireRole('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req: AuthRequest, res: Response) => {
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
    let institutionName = 'Institution Partner';
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
      tagline: description ? description.slice(0, 100) + '...' : 'Master new skills with this course.',
      description: description || 'Comprehensive practical course.',
      category,
      level: level || 'All Levels',
      durationHours: 12,
      instructorId: req.user?.id || 'unknown',
      instructorName: req.user?.fullName || 'Faculty Instructor',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      visibility: visibility || 'PUBLIC',
      price: price || 0,
      rating: 5.0,
      ratingCount: 1,
      enrolledCount: 0,
      isPublished: isPublished !== false,
      learningOutcomes: [
        'Understand enterprise distributed architecture principles',
        'Build scalable APIs with Node.js and MongoDB',
        'Implement automated grading and verification pipelines',
      ],
      modules: modules || [
        {
          id: 'mod-1',
          title: 'Module 1: Introduction & Fundamentals',
          order: 1,
          lessons: [
            { id: 'les-1', title: 'Course Overview & Prerequisites', order: 1, contentType: 'VIDEO', durationMinutes: 15, isFreePreview: true },
          ],
        },
      ],
      completionCriteria: completionCriteria || {
        minimumPassingGradePct: 75,
      },
      createdAt: new Date().toISOString(),
    };

    await repo.createCourse(newCourse);

    res.status(201).json({
      message: 'Course created and published to academy curriculum!',
      course: newCourse,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create course', error: err.message });
  }
});

// POST /api/courses/:id/enroll - Enroll active learner
router.post('/:id/enroll', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const course = await repo.getCourseById(req.params.id as string);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
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
      progressPercentage: 10,
      completedLessonIds: [],
    };

    await repo.createEnrollment(newEnrollment);

    res.status(201).json({
      message: 'Enrollment confirmed!',
      enrollment: newEnrollment,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Enrollment failed', error: err.message });
  }
});

// PATCH /api/courses/:id/progress - Mark lesson complete
router.patch('/:id/progress', requireAuth, async (req: AuthRequest, res: Response) => {
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
router.get('/:id/reviews', async (req: Request, res: Response) => {
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
router.post('/:id/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
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
    const isEnrolled = await EnrollmentModel.findOne({ courseId, userId });
    if (!isEnrolled && req.user?.activeRole !== 'PLATFORM_ADMIN') {
      res.status(403).json({ message: 'Only enrolled scholars can submit course reviews' });
      return;
    }

    // Prevent duplicate reviews from the same scholar
    const existing = await CourseReviewModel.findOne({ courseId, userId });
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

    // Update aggregate rating on course
    const allReviews = await CourseReviewModel.find({ courseId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await CourseModel.findOneAndUpdate(
      { id: courseId },
      { rating: Math.round(avgRating * 10) / 10, ratingCount: allReviews.length }
    );

    res.status(201).json({ message: 'Review published successfully', review });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to submit review', error: err.message });
  }
});

// GET /api/courses/:id/announcements - Retrieve course announcements (LRN-07)
router.get('/:id/announcements', async (req: Request, res: Response) => {
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
router.post('/:id/announcements', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.id as string;
    const authorId = req.user?.id || '';
    const authorName = req.user?.fullName || 'Faculty Instructor';
    const { title, content } = req.body;

    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ message: 'Announcement title and content are required' });
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
