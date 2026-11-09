"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const cacheService_1 = require("../cache/cacheService");
const auth_1 = require("../middleware/auth");
const models_1 = require("../models");
const eventBus_1 = require("../events/eventBus");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/courses - Catalog listing with search & tenant filtering
router.get('/', auth_1.optionalAuth, (0, validate_1.validateQuery)(schemas_1.courseCatalogQuerySchema), async (req, res) => {
    try {
        const { category, search, level } = req.query;
        const effectiveTenant = req.user?.institutionId || null;
        const filters = {
            category: typeof category === 'string' ? category : undefined,
            search: typeof search === 'string' ? search : undefined,
            level: typeof level === 'string' ? level : undefined,
        };
        const queryHash = cacheService_1.cacheService.hashQuery({ ...filters, tenantId: effectiveTenant });
        const cacheKey = `courses:catalog:${effectiveTenant || 'public'}:${queryHash}`;
        const cached = await cacheService_1.cacheService.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache-Status', 'HIT');
            res.json(cached);
            return;
        }
        const courses = await dbRepository_1.repo.getCourses(filters, effectiveTenant);
        const payload = { courses, total: courses.length };
        await cacheService_1.cacheService.set(cacheKey, payload, { ttlSeconds: 300, tags: ['courses:catalog'] });
        res.setHeader('X-Cache-Status', 'MISS');
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving courses', error: err.message });
    }
});
// GET /api/courses/my-courses - Learner enrolled courses (Mockup 5)
router.get('/my-courses', auth_1.requireAuth, (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), async (req, res) => {
    try {
        const userId = req.user?.id || '';
        const enrollments = await dbRepository_1.repo.getEnrollmentsByLearner(userId);
        const enriched = await Promise.all(enrollments.map(async (enr) => {
            const course = await dbRepository_1.repo.getCourseById(enr.courseId);
            return {
                ...enr,
                course,
            };
        }));
        res.json({ enrollments: enriched });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving your courses', error: err.message });
    }
});
// GET /api/courses/:id - Course Detail view (Mockup 4)
router.get('/:id', auth_1.optionalAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), async (req, res) => {
    try {
        const course = await dbRepository_1.repo.getCourseById(req.params.id);
        if (!course || !course.isPublished) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN' &&
            req.user.globalRole === 'PLATFORM_SUPERADMIN';
        const isOfferingTenantMember = Boolean(req.user?.institutionId &&
            course.tenantId &&
            req.user.institutionId === course.tenantId);
        if (course.visibility !== 'PUBLIC' && !isOfferingTenantMember && !isPlatformAdmin) {
            res.status(req.user ? 403 : 401).json({ message: 'This course is restricted to its offering institution.' });
            return;
        }
        const cacheKey = `course:detail:${req.params.id}:${req.user?.institutionId || 'public'}`;
        const cached = await cacheService_1.cacheService.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache-Status', 'HIT');
            res.json(cached);
            return;
        }
        const assessment = await dbRepository_1.repo.getAssessmentByCourseId(course.id);
        const payload = {
            course,
            assessmentPreview: assessment ? { id: assessment.id, title: assessment.title, durationMinutes: assessment.durationMinutes } : null,
        };
        await cacheService_1.cacheService.set(cacheKey, payload, { ttlSeconds: 600, tags: ['courses:catalog', `course:${course.id}`] });
        res.setHeader('X-Cache-Status', 'MISS');
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving course details', error: err.message });
    }
});
// POST /api/courses - Course Builder 4-Step Wizard (Mockup 6)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), (0, validate_1.validateBody)(schemas_1.createCourseSchema), async (req, res) => {
    try {
        const { title, description, category, level, price, visibility, modules, completionCriteria, isPublished, } = req.body;
        if (!title || !category) {
            res.status(400).json({ message: 'Title and category are required' });
            return;
        }
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const institutionId = req.user?.institutionId || null;
        let institutionName = '';
        if (institutionId) {
            const tenant = await dbRepository_1.repo.getTenantById(institutionId);
            if (tenant)
                institutionName = tenant.name;
        }
        const newCourse = {
            id: `course-${(0, uuid_1.v4)().slice(0, 8)}`,
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
        await dbRepository_1.repo.createCourse(newCourse);
        await cacheService_1.cacheService.invalidateByTag('courses:catalog');
        // Async event dispatch to decoupled event bus
        eventBus_1.eventBus.publish('COURSE_CREATED', newCourse.id, newCourse);
        res.status(201).json({
            message: 'Course created and published to academy curriculum!',
            course: newCourse,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create course', error: err.message });
    }
});
// POST /api/courses/:id/enroll - Enroll active learner
router.post('/:id/enroll', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.emptyBodySchema), async (req, res) => {
    try {
        const course = await dbRepository_1.repo.getCourseById(req.params.id);
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
        const existing = await dbRepository_1.repo.getEnrollmentsByLearner(learnerId);
        const alreadyEnrolled = existing.find(e => e.courseId === course.id);
        if (alreadyEnrolled) {
            res.json({ message: 'Already enrolled in this course', enrollment: alreadyEnrolled });
            return;
        }
        const newEnrollment = {
            id: `enr-${(0, uuid_1.v4)().slice(0, 8)}`,
            courseId: course.id,
            learnerId,
            tenantId: course.tenantId,
            status: 'ENROLLED',
            enrolledAt: new Date().toISOString(),
            progressPercentage: 0,
            completedLessonIds: [],
        };
        await dbRepository_1.repo.createEnrollment(newEnrollment);
        // Async event dispatch to decoupled event bus
        eventBus_1.eventBus.publish('COURSE_ENROLLED', newEnrollment.id, {
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
    }
    catch (err) {
        res.status(500).json({ message: 'Enrollment failed', error: err.message });
    }
});
// PATCH /api/courses/:id/progress - Mark lesson complete
router.patch('/:id/progress', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.courseProgressSchema), async (req, res) => {
    try {
        const { lessonId } = req.body;
        const learnerId = req.user?.id || '';
        const enrollment = await dbRepository_1.repo.updateProgress(req.params.id, learnerId, lessonId);
        if (!enrollment) {
            res.status(404).json({ message: 'Enrollment record not found' });
            return;
        }
        res.json({ message: 'Progress updated', enrollment });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update progress', error: err.message });
    }
});
// GET /api/courses/:id/reviews - Retrieve student ratings & reviews (WEB-10)
router.get('/:id/reviews', (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), async (req, res) => {
    try {
        const reviews = await models_1.CourseReviewModel.find({ courseId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json({ reviews });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
    }
});
// POST /api/courses/:id/reviews - Submit student rating & review (WEB-10)
router.post('/:id/reviews', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.courseReviewSchema), async (req, res) => {
    try {
        const courseId = req.params.id;
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
        let isEnrolled = null;
        if (dbRepository_1.repo.isMongoActive()) {
            isEnrolled = await models_1.EnrollmentModel.findOne({ courseId, learnerId: userId });
        }
        else {
            const enrollments = await dbRepository_1.repo.getEnrollmentsByLearner(userId || '');
            isEnrolled = enrollments.find(e => e.courseId === courseId);
        }
        if (!isEnrolled && req.user?.activeRole !== 'PLATFORM_ADMIN') {
            res.status(403).json({ message: 'Only enrolled scholars can submit course reviews' });
            return;
        }
        // Prevent duplicate reviews from the same scholar
        const existing = dbRepository_1.repo.isMongoActive()
            ? await models_1.CourseReviewModel.findOne({ courseId, userId })
            : null;
        if (existing) {
            res.status(409).json({ message: 'You have already submitted a review for this curriculum' });
            return;
        }
        const review = await models_1.CourseReviewModel.create({
            id: `rev-${(0, uuid_1.v4)().slice(0, 8)}`,
            courseId,
            userId,
            userName,
            rating: Number(rating),
            comment: comment.trim(),
            createdAt: new Date().toISOString(),
        });
        // Dispatch asynchronous event to decoupled event bus for rating recalculation & search indexing
        eventBus_1.eventBus.publish('REVIEW_SUBMITTED', courseId, {
            courseId,
            reviewId: review.id,
            rating: review.rating,
            userId,
        });
        res.status(201).json({ message: 'Review published successfully', review });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to submit review', error: err.message });
    }
});
// GET /api/courses/:id/announcements - Retrieve course announcements (LRN-07)
router.get('/:id/announcements', (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), async (req, res) => {
    try {
        const announcements = await models_1.CourseAnnouncementModel.find({ courseId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json({ announcements });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch announcements', error: err.message });
    }
});
// POST /api/courses/:id/announcements - Publish faculty course announcement (LRN-07)
router.post('/:id/announcements', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.courseAnnouncementSchema), async (req, res) => {
    try {
        const courseId = req.params.id;
        const authorId = req.user?.id || '';
        const authorName = req.user?.fullName || 'Faculty Instructor';
        const { title, content } = req.body;
        if (!title?.trim() || !content?.trim()) {
            res.status(400).json({ message: 'Announcement title and content are required' });
            return;
        }
        const course = await dbRepository_1.repo.getCourseById(courseId);
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
        const announcement = await models_1.CourseAnnouncementModel.create({
            id: `ann-${(0, uuid_1.v4)().slice(0, 8)}`,
            courseId,
            authorId,
            authorName,
            title: title.trim(),
            content: content.trim(),
            createdAt: new Date().toISOString(),
        });
        res.status(201).json({ message: 'Course announcement published', announcement });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to post announcement', error: err.message });
    }
});
exports.default = router;
