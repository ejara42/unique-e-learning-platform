process.env.NODE_ENV = 'test';
import assert from 'assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server';
import { config } from '../../src/config';
import { UserModel, CourseModel, EnrollmentModel, DrmKeyModel } from '../../src/models';
import { connectionState } from '../../src/data/mongoConnection';
import { cdnSecurityService } from '../../src/services/cdnSecurityService';

/**
 * ==============================================================================
 * DRM PLAYBACK LIFECYCLE & HLS KEY DISTRIBUTION TEST SUITE
 * ==============================================================================
 * Validates:
 * 1. Bearer JWT authentication for HLS AES-128 key delivery.
 * 2. Strict rejection of normal user JWT in query parameter (?token=<jwt>).
 * 3. Dedicated time-bounded HMAC-SHA256 playback token verification (?token=<hmac>).
 * 4. Missing database user rejection (deleted user session).
 * 5. Suspended / inactive user rejection.
 * 6. Revoked session rejection (tokenVersion mismatch).
 * 7. Token expiration and 300s maximum lifetime enforcement.
 * 8. Strict enrollment & cross-tenant barrier enforcement.
 * 9. Instructor & Platform Administrator privileged access.
 * 10. Strict anti-caching HTTP response headers and Referrer-Policy: no-referrer.
 * 11. Playback token & Playback URL issuance endpoints.
 * ==============================================================================
 */

const TEST_COURSE_ID = 'course-drm-101';
const TEST_LESSON_ID = 'lesson-drm-seg1';
const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef'; // 16-byte AES-128 key
const TEST_KEY_BUFFER = Buffer.from(TEST_KEY_HEX, 'hex');

function generateToken(payload: {
  id: string;
  email: string;
  fullName: string;
  globalRole: string;
  activeRole: string;
  institutionId?: string | null;
  tokenVersion?: number;
}): string {
  return jwt.sign({ ...payload, tokenVersion: payload.tokenVersion ?? 0 }, config.jwtSecret, { expiresIn: '1h' });
}

async function runDrmPlaybackLifecycleSuite() {
  console.log('\n===============================================================');
  console.log('🔒 SECURE DRM PLAYBACK LIFECYCLE & HLS KEY SECURITY SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  // Track if we need to mock DB state when running offline
  const wasOffline = !connectionState.isConnected;
  const mockUsers = new Map<string, any>();
  const mockCourses = new Map<string, any>();
  const mockEnrollments: any[] = [];
  const mockDrmKeys = new Map<string, any>();

  // Seed mock course with target lesson
  const sampleCourse = {
    id: TEST_COURSE_ID,
    title: 'Advanced Cryptography & Media Security',
    slug: 'advanced-crypto-media-security',
    instructorId: 'user-inst-drm',
    tenantId: 'tenant-drm-edu',
    visibility: 'PUBLIC',
    isPublished: true,
    modules: [
      {
        id: 'mod-1',
        title: 'Module 1: HLS DRM Fundamentals',
        lessons: [
          {
            id: TEST_LESSON_ID,
            title: 'Lesson 1: AES-128 Envelope Encryption',
            type: 'VIDEO',
            durationMinutes: 15,
            videoUrl: 'https://storage.edusphere.io/hls/course-drm-101/lesson-drm-seg1/master.m3u8',
          },
        ],
      },
    ],
  };
  mockCourses.set(TEST_COURSE_ID, sampleCourse);

  // Seed sample DRM key
  mockDrmKeys.set(`${TEST_COURSE_ID}:${TEST_LESSON_ID}`, {
    courseId: TEST_COURSE_ID,
    lessonId: TEST_LESSON_ID,
    keyHex: TEST_KEY_HEX,
    keyId: 'drm-key-uuid-1',
    createdAt: new Date(),
  });

  // Seed users in mock store
  mockUsers.set('user-enrolled-student', {
    id: 'user-enrolled-student',
    email: 'alice@student.org',
    fullName: 'Alice Enrolled',
    globalRole: 'STANDARD_USER',
    activeRole: 'STUDENT',
    tokenVersion: 0,
    isSuspended: false,
  });

  mockUsers.set('user-unenrolled-student', {
    id: 'user-unenrolled-student',
    email: 'bob@student.org',
    fullName: 'Bob Unenrolled',
    globalRole: 'STANDARD_USER',
    activeRole: 'STUDENT',
    tokenVersion: 0,
    isSuspended: false,
  });

  mockUsers.set('user-suspended-student', {
    id: 'user-suspended-student',
    email: 'charlie@suspended.org',
    fullName: 'Charlie Suspended',
    globalRole: 'STANDARD_USER',
    activeRole: 'STUDENT',
    tokenVersion: 0,
    isSuspended: true,
    status: 'SUSPENDED',
  });

  mockUsers.set('user-inst-drm', {
    id: 'user-inst-drm',
    email: 'prof.smith@inst.edu',
    fullName: 'Prof. Smith',
    globalRole: 'STANDARD_USER',
    activeRole: 'INSTRUCTOR',
    tokenVersion: 0,
    isSuspended: false,
  });

  mockUsers.set('user-platform-admin', {
    id: 'user-platform-admin',
    email: 'admin@edusphere.io',
    fullName: 'Platform Superadmin',
    globalRole: 'PLATFORM_SUPERADMIN',
    activeRole: 'PLATFORM_ADMIN',
    tokenVersion: 0,
    isSuspended: false,
  });

  // Seed enrollments
  mockEnrollments.push({
    id: 'enr-1',
    courseId: TEST_COURSE_ID,
    learnerId: 'user-enrolled-student',
    userId: 'user-enrolled-student',
    status: 'ENROLLED',
    tenantId: 'tenant-drm-edu',
  });

  mockEnrollments.push({
    id: 'enr-suspended',
    courseId: TEST_COURSE_ID,
    learnerId: 'user-suspended-student',
    userId: 'user-suspended-student',
    status: 'ENROLLED',
    tenantId: 'tenant-drm-edu',
  });

  if (wasOffline) {
    connectionState.isConnected = true;

    (UserModel as any).findOne = (query: any) => {
      const u = mockUsers.get(query.id) || null;
      return {
        select: () => ({
          lean: async () => u,
          then: (r: any) => Promise.resolve(u).then(r),
        }),
        lean: async () => u,
        then: (r: any) => Promise.resolve(u).then(r),
      };
    };

    (CourseModel as any).findOne = (query: any) => {
      const id = query.$or ? (query.$or[0]?.id || query.$or[1]?.slug) : query.id;
      const c = mockCourses.get(id) || null;
      return {
        lean: async () => c,
        then: (r: any) => Promise.resolve(c).then(r),
      };
    };

    (EnrollmentModel as any).find = (query: any) => {
      const targetId = query.learnerId || query.userId;
      const results = mockEnrollments.filter(e => e.learnerId === targetId || e.userId === targetId);
      return {
        lean: async () => results,
        then: (r: any) => Promise.resolve(results).then(r),
      };
    };

    (DrmKeyModel as any).findOne = (query: any) => {
      const k = mockDrmKeys.get(`${query.courseId}:${query.lessonId}`) || null;
      return {
        lean: async () => k,
        then: (r: any) => Promise.resolve(k).then(r),
      };
    };
  }

  // Pre-generate auth tokens
  const enrolledToken = generateToken({
    id: 'user-enrolled-student',
    email: 'alice@student.org',
    fullName: 'Alice Enrolled',
    globalRole: 'STANDARD_USER',
    activeRole: 'STUDENT',
  });

  const unenrolledToken = generateToken({
    id: 'user-unenrolled-student',
    email: 'bob@student.org',
    fullName: 'Bob Unenrolled',
    globalRole: 'STANDARD_USER',
    activeRole: 'STUDENT',
  });

  const instructorToken = generateToken({
    id: 'user-inst-drm',
    email: 'prof.smith@inst.edu',
    fullName: 'Prof. Smith',
    globalRole: 'STANDARD_USER',
    activeRole: 'INSTRUCTOR',
  });

  const superAdminToken = generateToken({
    id: 'user-platform-admin',
    email: 'admin@edusphere.io',
    fullName: 'Platform Superadmin',
    globalRole: 'PLATFORM_SUPERADMIN',
    activeRole: 'PLATFORM_ADMIN',
  });

  // TEST 1: Unauthenticated request should be rejected with 401
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`);
    assert.strictEqual(res.status, 401, 'Should return 401 for unauthenticated request');
    assert.match(res.body.message, /Missing encryption key token/i);
    console.log('  ✅ [TEST 1] Rejects unauthenticated DRM key request with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 1] FAILED:', err.message);
  }

  // TEST 2: Invalid / forged Bearer token should be rejected with 401
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', 'Bearer forged-jwt-signature-token');
    assert.strictEqual(res.status, 401, 'Should return 401 for forged token');
    assert.match(res.body.message, /Token expired or invalid/i);
    console.log('  ✅ [TEST 2] Rejects forged JWT token with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 2] FAILED:', err.message);
  }

  // TEST 3: Unenrolled student should be rejected with 403 Forbidden
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${unenrolledToken}`);
    assert.strictEqual(res.status, 403, 'Should return 403 for unenrolled student');
    assert.match(res.body.message, /Enrollment or resource ownership is required/i);
    console.log('  ✅ [TEST 3] Denies DRM key access to unenrolled student with 403 Forbidden');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 3] FAILED:', err.message);
  }

  // TEST 4: Enrolled student with Bearer token should receive 200 and binary AES key
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${enrolledToken}`);
    assert.strictEqual(res.status, 200, 'Should return 200 for enrolled student');
    assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
    assert.strictEqual(res.body.length, 16, 'Should return exactly 16 bytes for AES-128 key');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER, 'Key bytes should match stored key');
    console.log('  ✅ [TEST 4] Delivers 16-byte AES-128 key via Authorization: Bearer to enrolled student');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 4] FAILED:', err.message);
  }

  // TEST 5: Normal user JWT passed in ?token=<jwt> query parameter MUST BE REJECTED with 401
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${enrolledToken}`);
    assert.strictEqual(res.status, 401, 'Should reject normal JWT passed in query string');
    assert.match(res.body.message, /General JWT query tokens are not permitted/i);
    console.log('  ✅ [TEST 5] Strictly rejects normal JWT passed in URL query parameters with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 5] FAILED:', err.message);
  }

  // TEST 6: Dedicated short-lived HMAC playback token for enrolled student should receive 200
  total++;
  try {
    const hmacToken = cdnSecurityService.generatePlaybackToken(
      TEST_COURSE_ID,
      TEST_LESSON_ID,
      300,
      'user-enrolled-student',
      0
    );
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${hmacToken}`);
    assert.strictEqual(res.status, 200, 'Should accept valid HMAC playback token');
    assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 6] Delivers 16-byte key via dedicated HMAC-SHA256 playback token in ?token=<hmac>');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 6] FAILED:', err.message);
  }

  // TEST 7: Missing database user (deleted user) must always result in rejection
  total++;
  try {
    const deletedUserToken = cdnSecurityService.generatePlaybackToken(
      TEST_COURSE_ID,
      TEST_LESSON_ID,
      300,
      'user-deleted-id-999',
      0
    );
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${deletedUserToken}`);
    assert.strictEqual(res.status, 401, 'Deleted user should be rejected');
    assert.match(res.body.message, /User account not found or has been deleted/i);
    console.log('  ✅ [TEST 7] Missing database user strictly results in rejection with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 7] FAILED:', err.message);
  }

  // TEST 8: Suspended / inactive user must be rejected with 403 Forbidden
  total++;
  try {
    const suspendedToken = cdnSecurityService.generatePlaybackToken(
      TEST_COURSE_ID,
      TEST_LESSON_ID,
      300,
      'user-suspended-student',
      0
    );
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${suspendedToken}`);
    assert.strictEqual(res.status, 403, 'Suspended user should be forbidden');
    assert.match(res.body.message, /User account is inactive or suspended/i);
    console.log('  ✅ [TEST 8] Suspended/inactive user is rejected with 403 Forbidden');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 8] FAILED:', err.message);
  }

  // TEST 9: Session tokenVersion mismatch (revoked session) must be rejected with 401
  total++;
  try {
    const revokedToken = cdnSecurityService.generatePlaybackToken(
      TEST_COURSE_ID,
      TEST_LESSON_ID,
      300,
      'user-enrolled-student',
      99 // Token has version 99 while DB has version 0
    );
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${revokedToken}`);
    assert.strictEqual(res.status, 401, 'Revoked token version should be rejected');
    assert.match(res.body.message, /Playback session has been revoked/i);
    console.log('  ✅ [TEST 9] Revoked tokenVersion session is rejected with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 9] FAILED:', err.message);
  }

  // TEST 10: Expired HMAC playback token must be rejected with 401
  total++;
  try {
    // Generate expired token (-10s)
    const expiredToken = cdnSecurityService.generatePlaybackToken(
      TEST_COURSE_ID,
      TEST_LESSON_ID,
      -10,
      'user-enrolled-student',
      0
    );
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${expiredToken}`);
    assert.strictEqual(res.status, 401, 'Expired token should fail verification');
    console.log('  ✅ [TEST 10] Expired HMAC playback token is rejected with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 10] FAILED:', err.message);
  }

  // TEST 11: Cross-tenant / Unenrolled student with valid HMAC token must be rejected with 403
  total++;
  try {
    const unenrolledHmac = cdnSecurityService.generatePlaybackToken(
      TEST_COURSE_ID,
      TEST_LESSON_ID,
      300,
      'user-unenrolled-student',
      0
    );
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${unenrolledHmac}`);
    assert.strictEqual(res.status, 403, 'Unenrolled student should be rejected with 403');
    assert.match(res.body.message, /Enrollment or resource ownership is required/i);
    console.log('  ✅ [TEST 11] Unenrolled/cross-tenant student with HMAC token is denied with 403 Forbidden');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 11] FAILED:', err.message);
  }

  // TEST 12: Course author (instructor) access via Bearer JWT
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${instructorToken}`);
    assert.strictEqual(res.status, 200, 'Course instructor should receive 200');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 12] Grants key access to course author (instructor ownership)');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 12] FAILED:', err.message);
  }

  // TEST 13: Platform Superadmin access via Bearer JWT
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    assert.strictEqual(res.status, 200, 'Platform superadmin should receive 200');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 13] Grants key access to verified PLATFORM_SUPERADMIN');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 13] FAILED:', err.message);
  }

  // TEST 14: Strict anti-caching HTTP response headers and Referrer-Policy: no-referrer
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${enrolledToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    assert.strictEqual(res.headers['pragma'], 'no-cache');
    assert.strictEqual(res.headers['expires'], '0');
    assert.strictEqual(res.headers['referrer-policy'], 'no-referrer');
    console.log('  ✅ [TEST 14] Enforces anti-caching (no-store, Expires: 0) and Referrer-Policy: no-referrer');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 14] FAILED:', err.message);
  }

  // TEST 15: Dedicated /api/media/playback-token endpoint issues 300s token
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/playback-token/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${enrolledToken}`);
    assert.strictEqual(res.status, 200);
    assert(res.body.playbackToken, 'Response should contain playbackToken');
    assert.strictEqual(res.body.expiresInSeconds, 300);
    assert.strictEqual(res.headers['referrer-policy'], 'no-referrer');

    // Verify issued token can immediately unlock HLS key
    const keyRes = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${res.body.playbackToken}`);
    assert.strictEqual(keyRes.status, 200);
    assert.deepStrictEqual(Buffer.from(keyRes.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 15] Issues dedicated short-lived HMAC playback token via /playback-token');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 15] FAILED:', err.message);
  }

  // TEST 16: Playback URL generation endpoint with authorization & 5-minute expiry
  total++;
  try {
    // Unenrolled request to playback-url should fail
    const forbiddenRes = await request(app)
      .get(`/api/media/playback-url/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${unenrolledToken}`);
    assert.strictEqual(forbiddenRes.status, 403, 'Unenrolled student cannot obtain playback URL');

    // Enrolled request should succeed
    const allowedRes = await request(app)
      .get(`/api/media/playback-url/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${enrolledToken}`);
    assert.strictEqual(allowedRes.status, 200, 'Enrolled student receives signed playback URL');
    assert.ok(allowedRes.body.playbackUrl, 'Response includes playbackUrl');
    assert.match(allowedRes.body.playbackUrl, /token=/);
    console.log('  ✅ [TEST 16] Validates /playback-url generation with access barriers');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 16] FAILED:', err.message);
  }

  console.log('\n---------------------------------------------------------------');
  console.log(`DRM Playback Lifecycle Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('---------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runDrmPlaybackLifecycleSuite().catch(err => {
  console.error('Fatal DRM Playback Lifecycle Error:', err);
  process.exit(1);
});
