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
 * 2. Query param ?token=<jwt> authentication (required for standard HLS players).
 * 3. Time-bounded HMAC-SHA256 CDN signed playback tokens.
 * 4. Strict enrollment barriers (403 for unenrolled learners).
 * 5. Instructor & Platform Administrator privileged access.
 * 6. Cryptographic anti-caching HTTP response headers.
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
  console.log('🔒 DRM PLAYBACK LIFECYCLE & HLS KEY SECURITY SUITE');
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

  // Seed users
  mockUsers.set('user-enrolled-student', { id: 'user-enrolled-student', tokenVersion: 0 });
  mockUsers.set('user-unenrolled-student', { id: 'user-unenrolled-student', tokenVersion: 0 });
  mockUsers.set('user-inst-drm', { id: 'user-inst-drm', tokenVersion: 0 });
  mockUsers.set('user-platform-admin', { id: 'user-platform-admin', tokenVersion: 0 });

  // Seed enrollment for student
  mockEnrollments.push({
    id: 'enr-1',
    courseId: TEST_COURSE_ID,
    learnerId: 'user-enrolled-student',
    userId: 'user-enrolled-student',
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

  // TEST 2: Invalid / forged token should be rejected with 401
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

  // TEST 5: Enrolled student with ?token=<jwt> query parameter should receive 200 (HLS player compatibility)
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${enrolledToken}`);
    assert.strictEqual(res.status, 200, 'Should return 200 for query param token');
    assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 5] Delivers 16-byte AES-128 key via ?token=<jwt> for HLS video player');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 5] FAILED:', err.message);
  }

  // TEST 6: Course author (instructor) should have access without enrollment
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${instructorToken}`);
    assert.strictEqual(res.status, 200, 'Course instructor should receive 200');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 6] Grants key access to course author (instructor ownership)');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 6] FAILED:', err.message);
  }

  // TEST 7: Platform Superadmin should have global access
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    assert.strictEqual(res.status, 200, 'Platform superadmin should receive 200');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 7] Grants key access to verified PLATFORM_SUPERADMIN');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 7] FAILED:', err.message);
  }

  // TEST 8: Time-bounded CDN signed playback token via query parameter
  total++;
  try {
    const cdnToken = cdnSecurityService.generatePlaybackToken(TEST_COURSE_ID, TEST_LESSON_ID, 30);
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${cdnToken}`);
    assert.strictEqual(res.status, 200, 'Should accept valid CDN HMAC-SHA256 playback token');
    assert.deepStrictEqual(Buffer.from(res.body), TEST_KEY_BUFFER);
    console.log('  ✅ [TEST 8] Validates time-bounded HMAC-SHA256 CDN signed playback token');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 8] FAILED:', err.message);
  }

  // TEST 9: Tampered or expired CDN signed playback token should be rejected
  total++;
  try {
    const cdnToken = cdnSecurityService.generatePlaybackToken(TEST_COURSE_ID, TEST_LESSON_ID, 30);
    const tamperedToken = '000000' + cdnToken.slice(6);
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}?token=${tamperedToken}`);
    assert.strictEqual(res.status, 401, 'Tampered CDN token should fail verification');
    console.log('  ✅ [TEST 9] Rejects tampered/invalid CDN token with 401');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 9] FAILED:', err.message);
  }

  // TEST 10: Verify strict anti-caching HTTP response headers
  total++;
  try {
    const res = await request(app)
      .get(`/api/media/hls-key/${TEST_COURSE_ID}/${TEST_LESSON_ID}`)
      .set('Authorization', `Bearer ${enrolledToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    assert.strictEqual(res.headers['pragma'], 'no-cache');
    assert.strictEqual(res.headers['expires'], '0');
    console.log('  ✅ [TEST 10] Enforces strict anti-caching headers (no-store, Pragma: no-cache, Expires: 0)');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 10] FAILED:', err.message);
  }

  // TEST 11: Playback URL generation endpoint with authorization & CDN integration
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
    console.log('  ✅ [TEST 11] Validates /playback-url generation and access barrier');
    passed++;
  } catch (err: any) {
    console.error('  ❌ [TEST 11] FAILED:', err.message);
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
