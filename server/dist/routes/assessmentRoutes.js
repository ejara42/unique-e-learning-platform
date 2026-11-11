"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// POST /api/assessments - Instructor or Admin creates an assessment/exam for a course
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), (0, validate_1.validateBody)(schemas_1.createAssessmentSchema), async (req, res) => {
    try {
        const { courseId, title, type, instructions, durationMinutes, passingScorePct, questions } = req.body;
        const course = await dbRepository_1.repo.getCourseById(courseId);
        if (!course) {
            res.status(404).json({ message: 'Target course not found' });
            return;
        }
        const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
        const isInstitutionAdmin = req.user?.activeRole === 'INSTITUTION_ADMIN' && req.user.institutionId === course.tenantId;
        const isCourseInstructor = req.user?.activeRole === 'INSTRUCTOR' && (course.instructorId === req.user.id || !course.instructorId);
        if (!isPlatformAdmin && !isInstitutionAdmin && !isCourseInstructor) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to author assessments for this course' });
            return;
        }
        const formattedQuestions = questions.map((q, idx) => ({
            id: q.id || `q-${idx + 1}-${(0, uuid_1.v4)().slice(0, 6)}`,
            type: q.type || 'MCQ',
            prompt: q.prompt,
            options: q.options || [],
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
            points: q.points || 1,
        }));
        const newAssessment = {
            id: `assessment-${(0, uuid_1.v4)().slice(0, 8)}`,
            courseId,
            title: title || `${course.title} Examination`,
            type: type || 'FINAL_EXAM',
            instructions: instructions || 'Please complete all questions before the countdown timer expires. Tab switching is logged.',
            durationMinutes: durationMinutes || 30,
            passingScorePct: passingScorePct || 75,
            questions: formattedQuestions,
        };
        await dbRepository_1.repo.createAssessment(newAssessment);
        res.status(201).json({
            message: 'Examination successfully created and published!',
            assessment: newAssessment,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create assessment', error: err.message });
    }
});
// GET /api/assessments/course/:courseId - Fetch the exam for a specific course
router.get('/course/:courseId', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.courseIdParamsSchema), async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await dbRepository_1.repo.getCourseById(courseId);
        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }
        const assessment = await dbRepository_1.repo.getAssessmentByCourseId(courseId);
        if (!assessment) {
            res.json({ assessment: null });
            return;
        }
        const isInstructorOrAdmin = (req.user?.activeRole === 'PLATFORM_ADMIN' && req.user.globalRole === 'PLATFORM_SUPERADMIN') ||
            (req.user?.activeRole === 'INSTRUCTOR' && course.instructorId === req.user?.id) ||
            (req.user?.activeRole === 'INSTITUTION_ADMIN' && req.user?.institutionId === course.tenantId);
        const questions = isInstructorOrAdmin
            ? assessment.questions
            : assessment.questions.map(q => ({
                id: q.id,
                type: q.type,
                prompt: q.prompt,
                options: q.options,
                points: q.points,
            }));
        res.json({
            assessment: {
                id: assessment.id,
                courseId: assessment.courseId,
                title: assessment.title,
                type: assessment.type,
                instructions: assessment.instructions,
                durationMinutes: assessment.durationMinutes,
                passingScorePct: assessment.passingScorePct,
                questions,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving assessment for course', error: err.message });
    }
});
// GET /api/assessments/:id - Fetch exam questions (strips correct answer keys for integrity)
router.get('/:id', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), async (req, res) => {
    try {
        let assessment = await dbRepository_1.repo.getAssessmentById(req.params.id);
        if (!assessment) {
            assessment = await dbRepository_1.repo.getAssessmentByCourseId(req.params.id);
        }
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found. The instructor has not yet authored an assessment for this course.' });
            return;
        }
        // Tenant isolation verification: Verify course tenant restriction
        const course = await dbRepository_1.repo.getCourseById(assessment.courseId);
        if (!course || !course.isPublished) {
            res.status(404).json({ message: 'Assessment course is unavailable' });
            return;
        }
        const userId = req.user?.id || '';
        const enrollments = await dbRepository_1.repo.getEnrollmentsByLearner(userId);
        const canManageCourse = (req.user?.activeRole === 'PLATFORM_ADMIN' && req.user.globalRole === 'PLATFORM_SUPERADMIN') ||
            (req.user?.activeRole === 'INSTRUCTOR' && course.instructorId === userId);
        if (!canManageCourse && !enrollments.some(enrollment => enrollment.courseId === course.id && enrollment.status === 'ENROLLED')) {
            res.status(403).json({ message: 'Active course enrollment is required to access this assessment.' });
            return;
        }
        if (course && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId) {
            const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
            const isAuthorizedTenant = req.user?.institutionId === course.tenantId;
            if (!isPlatformAdmin && !isAuthorizedTenant) {
                res.status(403).json({ message: 'Forbidden: This assessment is restricted to members of the offering institution.' });
                return;
            }
        }
        // Strip correctAnswerIndex
        const safeQuestions = assessment.questions.map(q => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            points: q.points,
        }));
        res.json({
            assessment: {
                id: assessment.id,
                courseId: assessment.courseId,
                title: assessment.title,
                type: assessment.type,
                instructions: assessment.instructions,
                durationMinutes: assessment.durationMinutes,
                passingScorePct: assessment.passingScorePct,
                questions: safeQuestions,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving assessment', error: err.message });
    }
});
// POST /api/assessments/:id/submit - Submit answers and auto-grade
router.post('/:id/submit', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.assessmentSubmissionSchema), async (req, res) => {
    try {
        let assessment = await dbRepository_1.repo.getAssessmentById(req.params.id);
        if (!assessment) {
            assessment = await dbRepository_1.repo.getAssessmentByCourseId(req.params.id);
        }
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found' });
            return;
        }
        // Tenant isolation verification: Verify course tenant restriction
        const course = await dbRepository_1.repo.getCourseById(assessment.courseId);
        if (!course || !course.isPublished) {
            res.status(404).json({ message: 'Assessment course is unavailable' });
            return;
        }
        const enrollments = await dbRepository_1.repo.getEnrollmentsByLearner(req.user?.id || '');
        if (!enrollments.some(enrollment => enrollment.courseId === course.id && enrollment.status === 'ENROLLED')) {
            res.status(403).json({ message: 'Active course enrollment is required to submit this assessment.' });
            return;
        }
        if (course && course.visibility === 'INSTITUTION_RESTRICTED' && course.tenantId) {
            const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
            const isAuthorizedTenant = req.user?.institutionId === course.tenantId;
            if (!isPlatformAdmin && !isAuthorizedTenant) {
                res.status(403).json({ message: 'Forbidden: Cannot submit assessment for an institution you do not belong to.' });
                return;
            }
        }
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized: Authenticated learner identity required' });
            return;
        }
        const { answers, proctoringFlags, startedAt } = req.body;
        const learnerId = req.user.id;
        let totalScoreEarned = 0;
        let totalScoreMax = 0;
        const needsManualReview = assessment.questions.some(question => question.type === 'ESSAY');
        const gradedAnswers = assessment.questions.map(q => {
            totalScoreMax += q.points;
            const submitted = answers?.find((a) => a.questionId === q.id);
            let pointsAwarded = 0;
            if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
                if (submitted && submitted.selectedOption === q.correctAnswerIndex) {
                    pointsAwarded = q.points;
                    totalScoreEarned += q.points;
                }
            }
            else {
                pointsAwarded = 0;
            }
            return {
                questionId: q.id,
                selectedOption: submitted?.selectedOption,
                textAnswer: submitted?.textAnswer,
                scoreAwarded: pointsAwarded,
            };
        });
        const percentageScore = totalScoreMax > 0 ? Math.round((totalScoreEarned / totalScoreMax) * 100) : 0;
        const passed = !needsManualReview && percentageScore >= assessment.passingScorePct;
        const submission = {
            id: `sub-${(0, uuid_1.v4)().slice(0, 8)}`,
            assessmentId: assessment.id,
            courseId: assessment.courseId,
            learnerId,
            startedAt: startedAt || new Date(Date.now() - 1800000).toISOString(),
            submittedAt: new Date().toISOString(),
            answers: gradedAnswers,
            totalScoreEarned,
            totalScoreMax,
            percentageScore,
            passed,
            proctoringFlags: proctoringFlags || [],
            status: needsManualReview ? 'NEEDS_MANUAL_REVIEW' : 'GRADED',
        };
        await dbRepository_1.repo.createSubmission(submission);
        // If passed, auto-issue digital certificate with SHA-256 seal
        let certificate;
        if (passed) {
            const certNumber = `EDU-${new Date().getFullYear()}-${(0, uuid_1.v4)().slice(0, 4).toUpperCase()}-${(0, uuid_1.v4)().slice(0, 4).toUpperCase()}`;
            const verificationHash = require('crypto')
                .createHash('sha256')
                .update(`${learnerId}-${assessment.courseId}-${certNumber}-edusphere-salt-2026`)
                .digest('hex');
            certificate = {
                id: `cert-${(0, uuid_1.v4)().slice(0, 8)}`,
                certificateNumber: certNumber,
                verificationHash,
                tenantId: course?.tenantId || null,
                learnerId,
                learnerName: req.user.fullName,
                courseId: assessment.courseId,
                courseTitle: course.title,
                institutionName: course.institutionName,
                issueDate: new Date().toISOString(),
                gradePercentage: percentageScore,
                qrCodeData: `https://edusphere.io/verify/${certNumber}`,
                status: 'VALID',
            };
            if (certificate) {
                await dbRepository_1.repo.createCertificate(certificate);
            }
        }
        res.json({
            message: passed ? 'Assessment graded: PASSED! Digital diploma issued.' : 'Assessment graded: Result below passing threshold.',
            submission,
            percentageScore,
            passed,
            certificate,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Submission failed', error: err.message });
    }
});
// POST /api/assessments/:id/telemetry - Telemetry ping for anti-cheating window blur
router.post('/:id/telemetry', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.assessmentTelemetrySchema), async (req, res) => {
    try {
        const { eventType, details } = req.body;
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: null,
            actorId: req.user?.id || 'unknown',
            actorName: req.user?.fullName || 'Exam Candidate',
            actorRole: req.user?.activeRole || 'STUDENT',
            action: `EXAM_PROCTOR_${eventType}`,
            resourceType: 'ASSESSMENT',
            resourceId: req.params.id,
            details: details || `Proctoring alert: ${eventType}`,
            ipAddress: req.ip || '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        res.json({ status: 'ACKNOWLEDGED', eventType, recordedAt: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ message: 'Error recording telemetry', error: err.message });
    }
});
exports.default = router;
