import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { repo } from '../data/dbRepository';
import { DrmKeyModel } from '../models';
import { cdnSecurityService } from '../services/cdnSecurityService';
import { validateParams } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const mediaParamsSchema = z.object({
  courseId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  lessonId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

async function hasMediaAccess(req: AuthRequest, courseId: string, lessonId: string): Promise<boolean> {
  const course = await repo.getCourseById(courseId);
  if (!course || !course.isPublished) return false;
  const lessonExists = course.modules.some(module => module.lessons.some(lesson => lesson.id === lessonId));
  if (!lessonExists) return false;

  const user = req.user;
  if (!user) return false;
  if (user.activeRole === 'PLATFORM_ADMIN' && user.globalRole === 'PLATFORM_SUPERADMIN') return true;
  if (user.activeRole === 'INSTRUCTOR') return course.instructorId === user.id;
  if (user.activeRole === 'INSTITUTION_ADMIN' && user.institutionId) return course.tenantId === user.institutionId;

  const enrollments = await repo.getEnrollmentsByLearner(user.id);
  return enrollments.some(enrollment =>
    enrollment.courseId === courseId && enrollment.status === 'ENROLLED'
  );
}

// GET /api/media/hls-key/:courseId/:lessonId - Authenticated DRM AES-128 Key License Broker
router.get('/hls-key/:courseId/:lessonId', requireAuth, validateParams(mediaParamsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;
    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }

    // 2. Fetch AES-128 cryptographic key from persistence
    let drmRecord: any = null;
    if (repo.isMongoActive()) {
      drmRecord = await DrmKeyModel.findOne({ courseId, lessonId }).lean();
    }

    if (!drmRecord) {
      // Return 404 if no DRM key was registered for this lesson
      res.status(404).json({ message: 'DRM encryption key not found for specified lesson.' });
      return;
    }

    const keyBuffer = Buffer.from(drmRecord.keyHex, 'hex');

    // 3. Strict anti-caching headers for cryptographic license delivery
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(keyBuffer);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve media decryption key', error: err.message });
  }
});

// GET /api/media/playback-url/:courseId/:lessonId - Get signed playback URL with token authentication
router.get('/playback-url/:courseId/:lessonId', requireAuth, validateParams(mediaParamsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;
    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }

    const signedUrl = cdnSecurityService.generateSignedPlaybackUrl({
      courseId,
      lessonId,
      validMinutes: 180, // 3 hours
    });

    res.json({
      courseId,
      lessonId,
      playbackUrl: signedUrl,
      expiresInMinutes: 180,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate signed playback URL', error: err.message });
  }
});

export default router;
