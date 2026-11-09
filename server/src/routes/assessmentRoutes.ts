import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repo } from '../data/dbRepository';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ISubmission, ICertificate } from '../types';
import { validateBody } from '../middleware/validate';
import { assessmentSubmissionSchema } from '../validation/schemas';

const router = Router();

// GET /api/assessments/:id - Fetch exam questions (strips correct answer keys for integrity)
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await repo.getAssessmentById(req.params.id as string);
    if (!assessment) {
      res.status(404).json({ message: 'Assessment not found' });
      return;
    }

    // Tenant isolation verification: Verify course tenant restriction
    const course = await repo.getCourseById(assessment.courseId);
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
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving assessment', error: err.message });
  }
});

// POST /api/assessments/:id/submit - Submit answers and auto-grade
router.post('/:id/submit', requireAuth, validateBody(assessmentSubmissionSchema), async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await repo.getAssessmentById(req.params.id as string);
    if (!assessment) {
      res.status(404).json({ message: 'Assessment not found' });
      return;
    }

    // Tenant isolation verification: Verify course tenant restriction
    const course = await repo.getCourseById(assessment.courseId);
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

    const gradedAnswers = assessment.questions.map(q => {
      totalScoreMax += q.points;
      const submitted = answers?.find((a: any) => a.questionId === q.id);
      let pointsAwarded = 0;

      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        if (submitted && submitted.selectedOption === q.correctAnswerIndex) {
          pointsAwarded = q.points;
          totalScoreEarned += q.points;
        }
      } else {
        // Essay / short answer default partial points
        pointsAwarded = q.points;
        totalScoreEarned += pointsAwarded;
      }

      return {
        questionId: q.id,
        selectedOption: submitted?.selectedOption,
        textAnswer: submitted?.textAnswer,
        scoreAwarded: pointsAwarded,
      };
    });

    const percentageScore = totalScoreMax > 0 ? Math.round((totalScoreEarned / totalScoreMax) * 100) : 100;
    const passed = percentageScore >= assessment.passingScorePct;

    const submission: ISubmission = {
      id: `sub-${uuidv4().slice(0, 8)}`,
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
      status: 'GRADED',
    };

    await repo.createSubmission(submission);

    // If passed, auto-issue digital certificate with SHA-256 seal
    let certificate: ICertificate | undefined;
    if (passed) {
      const course = await repo.getCourseById(assessment.courseId);
      const certNumber = `EDU-${new Date().getFullYear()}-${uuidv4().slice(0, 4).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
      const verificationHash = require('crypto')
        .createHash('sha256')
        .update(`${learnerId}-${assessment.courseId}-${certNumber}-edusphere-salt-2026`)
        .digest('hex');

      certificate = {
        id: `cert-${uuidv4().slice(0, 8)}`,
        certificateNumber: certNumber,
        verificationHash,
        tenantId: course?.tenantId || null,
        learnerId,
        learnerName: req.user?.fullName || 'Verified Learner',
        courseId: assessment.courseId,
        courseTitle: course?.title || 'Academic Certification Program',
        institutionName: course?.institutionName || 'Institution Partner',
        issueDate: new Date().toISOString(),
        gradePercentage: percentageScore,
        qrCodeData: `https://edusphere.io/verify/${certNumber}`,
        status: 'VALID',
      };

      if (certificate) {
        await repo.createCertificate(certificate);
      }
    }

    res.json({
      message: passed ? 'Assessment graded: PASSED! Digital diploma issued.' : 'Assessment graded: Result below passing threshold.',
      submission,
      percentageScore,
      passed,
      certificate,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Submission failed', error: err.message });
  }
});

// POST /api/assessments/:id/telemetry - Telemetry ping for anti-cheating window blur
router.post('/:id/telemetry', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventType, details } = req.body;
    await repo.createAuditLog({
      id: `log-${uuidv4().slice(0, 8)}`,
      tenantId: null,
      actorId: req.user?.id || 'unknown',
      actorName: req.user?.fullName || 'Exam Candidate',
      actorRole: req.user?.activeRole || 'STUDENT',
      action: `EXAM_PROCTOR_${eventType}`,
      resourceType: 'ASSESSMENT',
      resourceId: req.params.id as string,
      details: details || `Proctoring alert: ${eventType}`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
    res.json({ status: 'ACKNOWLEDGED', eventType, recordedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ message: 'Error recording telemetry', error: err.message });
  }
});

export default router;
