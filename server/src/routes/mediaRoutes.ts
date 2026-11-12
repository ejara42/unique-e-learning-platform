import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { repo } from '../data/dbRepository';
import { DrmKeyModel } from '../models';
import { cdnSecurityService, PlaybackClaims } from '../services/cdnSecurityService';
import { validateParams } from '../middleware/validate';
import { config } from '../config';
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

// DRM Key Access Broker: supports Bearer JWT, dedicated short-lived HMAC playback tokens, and legacy query tokens
async function authenticateDrmKeyRequest(req: AuthRequest, res: Response, next: any): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : (typeof req.query.token === 'string' ? req.query.token : undefined);

  if (!token) {
    res.status(401).json({ message: 'Unauthorized: Missing encryption key token' });
    return;
  }

  const courseId = req.params.courseId as string;
  const lessonId = req.params.lessonId as string;

  // 1. Check time-bounded HMAC-SHA256 signed playback token (Max 300s TTL)
  if (cdnSecurityService.verifyPlaybackToken(courseId, lessonId, token)) {
    const claims = cdnSecurityService.extractPlaybackClaims(token);
    if (claims && claims.uId && claims.tv !== undefined) {
      const currentTv = await repo.getUserTokenVersion(claims.uId);
      if (currentTv !== null && currentTv !== claims.tv) {
        res.status(401).json({ message: 'Unauthorized: Playback session has been revoked' });
        return;
      }
    }
    return next();
  }

  // 2. Fallback: Verify standard user JWT session token
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;

    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
  }
}

// POST/GET /api/media/playback-token/:courseId/:lessonId - Issues dedicated short-lived HMAC playback token (Max 300s)
router.get('/playback-token/:courseId/:lessonId', requireAuth, validateParams(mediaParamsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;

    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }

    const tokenVersion = req.user?.id ? await repo.getUserTokenVersion(req.user.id) : 0;
    const playbackToken = cdnSecurityService.generatePlaybackToken(
      courseId,
      lessonId,
      5, // 5 minutes (300 seconds)
      req.user?.id,
      tokenVersion ?? 0
    );

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.json({
      courseId,
      lessonId,
      playbackToken,
      expiresInSeconds: 300,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate media playback token', error: err.message });
  }
});

// GET /api/media/hls-key/:courseId/:lessonId - Authenticated DRM AES-128 Key License Broker
router.get('/hls-key/:courseId/:lessonId', validateParams(mediaParamsSchema), authenticateDrmKeyRequest, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;

    // Fetch AES-128 cryptographic key from persistence
    let drmRecord: any = null;
    if (repo.isMongoActive()) {
      drmRecord = await DrmKeyModel.findOne({ courseId, lessonId }).lean();
    }

    if (!drmRecord) {
      res.status(404).json({ message: 'DRM encryption key not found for specified lesson.' });
      return;
    }

    const keyBuffer = Buffer.from(drmRecord.keyHex, 'hex');

    // Strict security and anti-caching headers for cryptographic license delivery
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Referrer-Policy', 'no-referrer');
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

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Referrer-Policy', 'no-referrer');
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
