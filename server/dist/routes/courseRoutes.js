"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const tenant_1 = require("../middleware/tenant");
const auth_1 = require("../middleware/auth");
const models_1 = require("../models");
const router = (0, express_1.Router)();
// GET /api/courses - Catalog listing with search & tenant filtering
router.get('/', async (req, res) => {
    try {
        const { category, search, level, tenantId } = req.query;
        const context = (0, tenant_1.getTenantContext)();
        const requestedTenantId = typeof tenantId === 'string' ? tenantId : null;
        let effectiveTenant = context.tenantId || null;
        if (effectiveTenant === null && requestedTenantId) {
            effectiveTenant = requestedTenantId;
        }
        const courses = await dbRepository_1.repo.getCourses({
            category: category,
            search: search,
            level: level,
            tenantId: effectiveTenant,
        }, effectiveTenant);
        res.json({ courses, total: courses.length });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving courses', error: err.message });
    }
});
// GET /api/courses/my-courses - Learner enrolled courses (Mockup 5)
router.get('/my-courses', auth_1.requireAuth, async (req, res) => {
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
router.get('/:id', async (req, res) => {
    try {
        const context = (0, tenant_1.getTenantContext)();
        const course = await dbRepository_1.repo.getCourseById(req.params.id, context.tenantId);
        if (!course) {
            res.status(404).json({ message: 'Course not found or access restricted to specific institution.' });
            return;
        }
        if (course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId && context.tenantId && context.tenantId !== course.tenantId) {
            res.status(403).json({ message: 'Forbidden: This course is restricted to members of the offering institution.' });
            return;
        }
        const assessment = await dbRepository_1.repo.getAssessmentByCourseId(course.id);
        res.json({
            course,
            assessmentPreview: assessment ? { id: assessment.id, title: assessment.title, durationMinutes: assessment.durationMinutes } : null,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving course details', error: err.message });
    }
});
// POST /api/courses - Course Builder 4-Step Wizard (Mockup 6)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
    try {
        const { title, description, category, level, price, visibility, modules, completionCriteria, isPublished, } = req.body;
        if (!title || !category) {
            res.status(400).json({ message: 'Title and category are required' });
            return;
        }
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const institutionId = req.user?.institutionId || null;
        let institutionName = 'Institution Partner';
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
        await dbRepository_1.repo.createCourse(newCourse);
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
router.post('/:id/enroll', auth_1.requireAuth, async (req, res) => {
    try {
        const course = await dbRepository_1.repo.getCourseById(req.params.id);
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
            progressPercentage: 10,
            completedLessonIds: [],
        };
        await dbRepository_1.repo.createEnrollment(newEnrollment);
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
router.patch('/:id/progress', auth_1.requireAuth, async (req, res) => {
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
router.get('/:id/reviews', async (req, res) => {
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
router.post('/:id/reviews', auth_1.requireAuth, async (req, res) => {
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
        // Update aggregate rating on course
        const allReviews = await models_1.CourseReviewModel.find({ courseId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await models_1.CourseModel.findOneAndUpdate({ id: courseId }, { rating: Math.round(avgRating * 10) / 10, ratingCount: allReviews.length });
        res.status(201).json({ message: 'Review published successfully', review });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to submit review', error: err.message });
    }
});
// GET /api/courses/:id/announcements - Retrieve course announcements (LRN-07)
router.get('/:id/announcements', async (req, res) => {
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
router.post('/:id/announcements', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
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
