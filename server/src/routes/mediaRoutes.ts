import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { repo } from '../data/dbRepository';
import { DrmKeyModel } from '../models';
import { cdnSecurityService } from '../services/cdnSecurityService';

const router = Router();

// GET /api/media/hls-key/:courseId/:lessonId - Authenticated DRM AES-128 Key License Broker
router.get('/hls-key/:courseId/:lessonId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;
    const userId = req.user?.id;
    const userRole = req.user?.activeRole || 'STUDENT';

    // 1. Authorization Barrier: User must be enrolled or course faculty/superadmin
    const isStaff = ['INSTRUCTOR', 'PLATFORM_ADMIN', 'INSTITUTION_ADMIN'].includes(userRole);
    if (!isStaff) {
      const enrollments = await repo.getEnrollmentsByLearner(userId || '');
      const isEnrolled = enrollments.some(e => e.courseId === courseId && e.status === 'ENROLLED');

      if (!isEnrolled) {
        res.status(403).json({ message: 'Forbidden: Active course enrollment required to obtain video decryption key.' });
        return;
      }
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
router.get('/playback-url/:courseId/:lessonId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;
    const userId = req.user?.id;
    const userRole = req.user?.activeRole || 'STUDENT';

    const isStaff = ['INSTRUCTOR', 'PLATFORM_ADMIN', 'INSTITUTION_ADMIN'].includes(userRole);
    if (!isStaff) {
      const enrollments = await repo.getEnrollmentsByLearner(userId || '');
      const isEnrolled = enrollments.some(e => e.courseId === courseId && e.status === 'ENROLLED');

      if (!isEnrolled) {
        res.status(403).json({ message: 'Forbidden: Active enrollment required for playback token.' });
        return;
      }
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
