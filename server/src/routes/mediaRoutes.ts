import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest, AuthenticatedUser } from '../middleware/auth';
import { repo } from '../data/dbRepository';
import { DrmKeyModel } from '../models';
import { cdnSecurityService } from '../services/cdnSecurityService';
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

/**
 * Strict DRM Key Access Broker:
 * 1. Standard JWT is strictly permitted ONLY via Authorization: Bearer <token> header.
 * 2. Query parameter (?token=...) is strictly restricted to dedicated short-lived HMAC playback tokens.
 * 3. Normal JWT passed in query string is strictly rejected.
 * 4. Missing database user always rejects with 401.
 * 5. Inactive or suspended user always rejects with 403.
 * 6. Revoked tokenVersion always rejects with 401.
 * 7. Missing or expired enrollment always rejects with 403.
 */
async function authenticateDrmKeyRequest(req: AuthRequest, res: Response, next: any): Promise<void> {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : undefined;

  const courseId = req.params.courseId as string;
  const lessonId = req.params.lessonId as string;

  // --------------------------------------------------------------------------
  // BRANCH 1: Standard JWT via Authorization: Bearer <token> Header
  // --------------------------------------------------------------------------
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (!bearerToken) {
      res.status(401).json({ message: 'Unauthorized: Missing Bearer token' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(bearerToken, config.jwtSecret);
    } catch {
      res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
      return;
    }

    if (!decoded || !decoded.id) {
      res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
      return;
    }

    // Verify user exists in database (A missing database user must always result in rejection)
    const userDoc = await repo.getUserById(decoded.id);
    if (!userDoc) {
      res.status(401).json({ message: 'Unauthorized: User account not found or has been deleted' });
      return;
    }

    // Reject inactive or suspended users
    if ((userDoc as any).isSuspended || (userDoc as any).status === 'SUSPENDED') {
      res.status(403).json({ message: 'Forbidden: User account is inactive or suspended' });
      return;
    }

    // Reject if session tokenVersion has changed
    const currentTv = await repo.getUserTokenVersion(userDoc.id);
    if (currentTv === null || (decoded.tokenVersion ?? 0) !== currentTv) {
      res.status(401).json({ message: 'Unauthorized: Session is no longer valid' });
      return;
    }

    req.user = decoded;
    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }

    return next();
  }

  // --------------------------------------------------------------------------
  // BRANCH 2: Video-Player Query Token (?token=...)
  // Strictly permits dedicated short-lived HMAC playback tokens.
  // Standard user JWTs in URL query parameters are strictly forbidden!
  // --------------------------------------------------------------------------
  if (queryToken) {
    // 1. Validate cryptographic HMAC-SHA256 signature and resource binding
    const isValidHmac = cdnSecurityService.verifyPlaybackToken(courseId, lessonId, queryToken);
    if (!isValidHmac) {
      res.status(401).json({
        message: 'Unauthorized: Invalid or expired HMAC playback token. General JWT query tokens are not permitted.',
      });
      return;
    }

    // 2. Extract and inspect mandatory HMAC claims
    const claims = cdnSecurityService.extractPlaybackClaims(queryToken);
    if (!claims || !claims.cId || !claims.lId || !claims.uId || claims.tv === undefined || !claims.exp) {
      res.status(401).json({ message: 'Unauthorized: Missing mandatory playback token claims' });
      return;
    }

    // 3. Reject if token has expired or lifetime exceeds 300s
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now) {
      res.status(401).json({ message: 'Unauthorized: Playback token has expired' });
      return;
    }
    const lifetime = claims.iat ? (claims.exp - claims.iat) : 300;
    if (lifetime > 300) {
      res.status(401).json({ message: 'Unauthorized: Playback token lifetime exceeds 300 seconds limit' });
      return;
    }

    // 4. Reject if course or lesson does not match
    if (claims.cId !== courseId || claims.lId !== lessonId) {
      res.status(403).json({ message: 'Forbidden: Playback token is not valid for requested media resource' });
      return;
    }

    // 5. Query user from database: A missing database user must always result in rejection!
    const userDoc = await repo.getUserById(claims.uId);
    if (!userDoc) {
      res.status(401).json({ message: 'Unauthorized: User account not found or has been deleted' });
      return;
    }

    // 6. Reject if user is inactive or suspended
    if ((userDoc as any).isSuspended || (userDoc as any).status === 'SUSPENDED') {
      res.status(403).json({ message: 'Forbidden: User account is inactive or suspended' });
      return;
    }

    // 7. Reject if session tokenVersion has changed
    const currentTv = await repo.getUserTokenVersion(userDoc.id);
    if (currentTv === null || claims.tv !== currentTv) {
      res.status(401).json({ message: 'Unauthorized: Playback session has been revoked' });
      return;
    }

    // 8. Reject if enrollment is revoked or cross-tenant access is attempted
    req.user = {
      id: userDoc.id,
      email: userDoc.email,
      fullName: userDoc.fullName,
      activeRole: userDoc.activeRole,
      globalRole: userDoc.globalRole,
      authorizedRoles: userDoc.authorizedRoles,
      institutionId: userDoc.institutionId,
      tokenVersion: userDoc.tokenVersion,
    };

    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }

    return next();
  }

  // Missing credentials
  res.status(401).json({ message: 'Unauthorized: Missing encryption key token' });
}

// GET /api/media/playback-token/:courseId/:lessonId - Issues dedicated short-lived HMAC playback token (Max 300s)
router.get('/playback-token/:courseId/:lessonId', requireAuth, validateParams(mediaParamsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;

    if (!await hasMediaAccess(req, courseId, lessonId)) {
      res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
      return;
    }

    const userId = req.user!.id;
    const userDoc = await repo.getUserById(userId);
    if (!userDoc) {
      res.status(401).json({ message: 'Unauthorized: User account not found' });
      return;
    }

    if ((userDoc as any).isSuspended || (userDoc as any).status === 'SUSPENDED') {
      res.status(403).json({ message: 'Forbidden: User account is inactive or suspended' });
      return;
    }

    const tokenVersion = userDoc.tokenVersion ?? 0;
    const playbackToken = cdnSecurityService.generatePlaybackToken(
      courseId,
      lessonId,
      300, // 300 seconds max
      userId,
      tokenVersion
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
      validMinutes: 5, // 5 minutes max
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.json({
      courseId,
      lessonId,
      playbackUrl: signedUrl,
      expiresInMinutes: 5,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate signed playback URL', error: err.message });
  }
});

export default router;
