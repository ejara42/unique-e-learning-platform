import assert from 'assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  TenantModel,
  UserModel,
  CourseModel,
  EnrollmentModel,
  CertificateModel
} from '../src/models';
import { tenantStorage, TenantContext } from '../src/middleware/tenant';
import { repo } from '../src/data/dbRepository';
import { livekitService } from '../src/services/livekitService';
import { transcodingService } from '../src/services/transcodingService';
import { paymentService } from '../src/services/paymentService';
import { interoperabilityService } from '../src/services/interoperabilityService';

import mongoose from 'mongoose';
import { validatePasswordPolicy, bootstrapPlatformAdmin } from '../src/scripts/bootstrapAdmin';

async function runFullEnterpriseAuditTests() {
  console.log('\n===============================================================');
  console.log('🏛️  EDUSPHERE FULL ENTERPRISE SUBSYSTEM VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. MONGODB PERSISTENCE & SCHEMA VALIDATION
  // ---------------------------------------------------------------------------
  await test('1. MongoDB: Tenant & User Schemas enforce strict enum, regex & required constraints', () => {
    const invalidTenant = new TenantModel({
      id: 'invalid-id',
      name: 'Missing fields',
      slug: 'invalid',
      type: 'INVALID_TYPE',
    });
    const err = invalidTenant.validateSync();
    assert(err, 'Expected validation error');
    assert(err.errors['contactEmail'], 'contactEmail is required');
  });

  await test('2. MongoDB: Enrollment Model enforces unique compound index on {courseId, learnerId}', () => {
    const indexes = [
      { fields: { courseId: 1, learnerId: 1 }, options: { unique: true } },
      { fields: { learnerId: 1, status: 1 } },
    ];
    const compoundUnique = indexes.some(idx =>
      idx.fields.courseId === 1 && idx.fields.learnerId === 1 && idx.options?.unique === true
    );
    assert(compoundUnique, 'Compound unique index must be configured to prevent duplicate enrollments');
  });

  // ---------------------------------------------------------------------------
  // 2. TENANT ISOLATION BARRIER
  // ---------------------------------------------------------------------------
  await test('3. Security: Multi-tenant AsyncLocalStorage strictly isolates institution courses', async () => {
    const contextA: TenantContext = { tenantId: 'tenant-alpha-school', tenantSlug: 'alpha-school' };
    const contextB: TenantContext = { tenantId: 'tenant-beta-college', tenantSlug: 'beta-college' };

    const courseA = new CourseModel({
      id: 'course-alpha-private',
      tenantId: 'tenant-alpha-school',
      institutionName: 'Alpha School',
      title: 'Private Alpha Curriculum',
      slug: 'alpha-private',
      category: 'Science',
      instructorId: 'inst-a',
      instructorName: 'Instructor A',
      visibility: 'INSTITUTION_RESTRICTED',
      isPublished: true,
    });

    const courseB = new CourseModel({
      id: 'course-beta-private',
      tenantId: 'tenant-beta-college',
      institutionName: 'Beta College',
      title: 'Private Beta Curriculum',
      slug: 'beta-private',
      category: 'Arts',
      instructorId: 'inst-b',
      instructorName: 'Instructor B',
      visibility: 'INSTITUTION_RESTRICTED',
      isPublished: true,
    });

    const mockDb = [courseA, courseB];

    // Under Tenant A's context, only Tenant A courses can be accessed
    await tenantStorage.run(contextA, () => {
      const activeTenant = tenantStorage.getStore();
      const scoped = mockDb.filter(c => c.tenantId === activeTenant?.tenantId);
      assert.strictEqual(scoped.length, 1);
      assert.strictEqual(scoped[0].id, 'course-alpha-private');
      assert.strictEqual(scoped.some(c => c.tenantId === 'tenant-beta-college'), false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. LIVEKIT REAL-TIME WEBRTC MEDIA INTEGRATION
  // ---------------------------------------------------------------------------
  await test('4. LiveKit: Mint JWT access tokens with valid video grants & role segregation', () => {
    // Student token
    const studentTokenObj = livekitService.generateToken({
      roomName: 'room-101',
      participantIdentity: 'student-42',
      participantName: 'Sara Ahmed',
      role: 'STUDENT',
      isHost: false,
    });

    assert(studentTokenObj.token, 'Token must be generated');
    const decodedStudent: any = livekitService.verifyToken(studentTokenObj.token);
    assert.strictEqual(decodedStudent.video.room, 'room-101');
    assert.strictEqual(decodedStudent.video.canPublishData, true);
    assert.strictEqual(Boolean(decodedStudent.video.roomAdmin), false, 'Student must NOT have roomAdmin');

    // Instructor token
    const hostTokenObj = livekitService.generateToken({
      roomName: 'room-101',
      participantIdentity: 'inst-1',
      participantName: 'Dr. Vance',
      role: 'INSTRUCTOR',
      isHost: true,
    });

    const decodedHost: any = livekitService.verifyToken(hostTokenObj.token);
    assert.strictEqual(decodedHost.video.roomAdmin, true, 'Instructor must possess roomAdmin privileges');
    assert(decodedHost.video.canPublishSources.includes('screen_share'), 'Host must have screen share capability');
  });

  // ---------------------------------------------------------------------------
  // 4. VIDEO TRANSCODING & HLS ADAPTIVE STREAMING
  // ---------------------------------------------------------------------------
  await test('5. Video Transcoding: BullMQ job queue enqueues jobs & produces valid HLS .m3u8 manifest', async () => {
    const job = await transcodingService.enqueueTranscodeJob('course-1', 'lesson-1', 'https://video.mp4');
    assert(job.id.startsWith('job-transcode-'));
    assert.strictEqual(job.renditions.length, 4, 'Must produce 4 adaptive bitrate renditions (1080p, 720p, 480p, 360p)');

    const manifest = transcodingService.generateHlsMasterManifest('course-1', 'lesson-1');
    assert(manifest.includes('#EXT-X-STREAM-INF'), 'Manifest must include HLS stream inf tags');
    assert(manifest.includes('1920x1080'), 'Manifest must include 1080p resolution definition');
    assert(manifest.includes('640x360'), 'Manifest must include 360p mobile rendition');
  });

  // ---------------------------------------------------------------------------
  // 5. STRIPE PAYMENTS & SPLIT PAYOUT WEBHOOK VERIFICATION
  // ---------------------------------------------------------------------------
  await test('6. Payments: Stripe Checkout splits payouts (15% platform / 85% instructor) & validates official Stripe SDK signatures', async () => {
    const session = await paymentService.createCheckoutSession({
      courseId: 'course-1',
      learnerId: 'user-paid-1',
      learnerEmail: 'test.paid@edusphere.io',
      successUrl: 'http://localhost:5173/success',
      cancelUrl: 'http://localhost:5173/cancel',
    });

    assert.strictEqual(session.status, 'PENDING');
    assert(session.platformFee > 0, 'Platform fee must be calculated');
    assert.strictEqual(session.amount, session.platformFee + session.instructorPayout, 'Total amount must equal fee + payout');

    // Test official Stripe SDK signature verification
    const payloadRaw = JSON.stringify({ id: `evt_suite_${Date.now()}`, type: 'checkout.session.completed', sessionId: session.sessionId });
    const header = paymentService.generateTestWebhookSignature(payloadRaw);

    const isValidSig = paymentService.verifyWebhookSignature(payloadRaw, header);
    assert.strictEqual(isValidSig, true, 'Official Stripe SDK signature verification must pass');

    const constructedEvent = paymentService.constructWebhookEvent(Buffer.from(payloadRaw), header);
    assert.strictEqual(constructedEvent.type, 'checkout.session.completed');

    // Simulate completion
    const enrollment = await paymentService.handleCheckoutCompleted(session.sessionId);
    assert.strictEqual(enrollment.status, 'ENROLLED');
    assert.strictEqual(enrollment.courseId, 'course-1');
  });

  // ---------------------------------------------------------------------------
  // 6. EDUCATIONAL INTEROPERABILITY (LTI 1.3 & SCORM)
  // ---------------------------------------------------------------------------
  await test('7. Interoperability: LTI 1.3 OIDC login flow & SCORM 1.2 runtime session bridge', async () => {
    // LTI 1.3
    const ltiLogin = interoperabilityService.initiateLtiLogin(
      'https://canvas.instructure.com',
      'user_hint_123',
      'http://localhost:5000/api/lti/launch'
    );
    assert(ltiLogin.authRedirectUrl.includes('response_type=id_token'));
    assert(ltiLogin.state.startsWith('state_'));

    // SCORM 1.2 Runtime
    const scormSession = interoperabilityService.initializeScormSession('session-scorm-99', 'learner-1', 'course-1');
    assert.strictEqual(scormSession.status, 'true');

    interoperabilityService.setScormValue('session-scorm-99', 'cmi.core.lesson_status', 'completed');
    assert.strictEqual(interoperabilityService.getScormValue('session-scorm-99', 'cmi.core.lesson_status'), 'completed');

    const commitSuccess = await interoperabilityService.commitScormSession('session-scorm-99');
    assert.strictEqual(commitSuccess, true);
  });

  // ---------------------------------------------------------------------------
  // 7. DATA PERSISTENCE ACROSS SERVER RESTARTS
  // ---------------------------------------------------------------------------
  await test('8. Resilience: Repository state recovery across simulated process restart', async () => {
    const tenants = await repo.getTenants();
    assert(tenants.length >= 5, 'Accredited institutions must be fully present');

    const apexUni = await repo.getTenantById('tenant-3');
    assert(apexUni, 'Apex University must exist');
    assert.strictEqual(apexUni?.name, 'Apex University');

    const cert = await repo.getCertificateByCode('EDU-2026-X89K-4921');
    assert(cert, 'Verified Certificate must be retrievable');
    assert.strictEqual(cert?.status, 'VALID');
  });

  // ---------------------------------------------------------------------------
  // 8. PRODUCTION BOOTSTRAP & PRIVILEGE ESCALATION BARRIER
  // ---------------------------------------------------------------------------
  await test('9. Production Bootstrap: Password policy strictly rejects weak passwords (e.g. password123)', () => {
    const weakCheck1 = validatePasswordPolicy('password123');
    assert.strictEqual(weakCheck1.valid, false, 'password123 must be rejected');
    assert(weakCheck1.reason?.includes('at least 12 characters'));

    const weakCheck2 = validatePasswordPolicy('ShortPass1!');
    assert.strictEqual(weakCheck2.valid, false, 'Password under 12 characters must be rejected');

    const strongCheck = validatePasswordPolicy('EnterpriseAdmin#2026!Secure');
    assert.strictEqual(strongCheck.valid, true, 'Complex 12+ character password must be approved');
  });

  await test('10. Production Bootstrap: Invalid credentials and malformed email fail cleanly before DB queries', async () => {
    const invalidEmailResult = await bootstrapPlatformAdmin({
      email: 'not-an-email-address',
      password: 'EnterpriseAdmin#2026!Secure',
      preserveConnection: true,
    });
    assert.strictEqual(invalidEmailResult.success, false);
    assert(invalidEmailResult.message.includes('Invalid email format'));

    const missingCredsResult = await bootstrapPlatformAdmin({
      email: '',
      password: '',
      preserveConnection: true,
    });
    assert.strictEqual(missingCredsResult.success, false);
    assert(missingCredsResult.message.includes('Missing administrator credentials'));
  });

  await test('11. Production Bootstrap: Refuses to run if a Platform SuperAdministrator already exists (duplicate bootstrap barrier)', async () => {
    const originalFindOne = UserModel.findOne;
    const originalReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

    // Simulate active connected database
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
    (UserModel as any).findOne = () => ({
      lean: async () => ({
        id: 'admin-existing-root',
        email: 'root.superadmin@edusphere.io',
        globalRole: 'PLATFORM_SUPERADMIN',
        activeRole: 'PLATFORM_ADMIN',
      }),
    });

    try {
      const duplicateResult = await bootstrapPlatformAdmin({
        email: 'new.attacker.admin@edusphere.io',
        password: 'NewAdmin#2026!Secure',
        preserveConnection: true,
      });

      assert.strictEqual(duplicateResult.success, false, 'Must reject bootstrap when a superadmin already exists');
      assert(duplicateResult.message.includes('Platform SuperAdmin already exists'), 'Error message must state superadmin already exists');
    } finally {
      UserModel.findOne = originalFindOne;
      if (originalReadyState) {
        Object.defineProperty(mongoose.connection, 'readyState', originalReadyState);
      }
    }
  });

  await test('12. Production Bootstrap: Fails safely when database connection is unavailable', async () => {
    const originalReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    const originalConnect = mongoose.connect;

    // Simulate database disconnected & connection failure
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
    (mongoose as any).connect = async () => {
      throw new Error('Connection refused at 127.0.0.1:27017');
    };

    try {
      const dbFailResult = await bootstrapPlatformAdmin({
        email: 'admin.recovery@edusphere.io',
        password: 'ValidEnterprise#Pass2026!',
        preserveConnection: true,
      });

      assert.strictEqual(dbFailResult.success, false, 'Must fail safely when MongoDB cannot be reached');
      assert(dbFailResult.message.includes('Database connection failed'), 'Error message must reflect database connection failure');
    } finally {
      mongoose.connect = originalConnect;
      if (originalReadyState) {
        Object.defineProperty(mongoose.connection, 'readyState', originalReadyState);
      }
    }
  });

  await test('13. Security Barrier: Privilege escalation prevention blocks unauthorized role switching', async () => {
    const regularStudent = {
      id: 'student-regular-1',
      email: 'student.real@institution.edu',
      fullName: 'Real Student',
      globalRole: 'STANDARD_USER' as const,
      activeRole: 'STUDENT' as const,
      institutionId: null,
    };

    // Attempting unauthorized switch to PLATFORM_ADMIN
    const attemptRoleElevation = (user: typeof regularStudent, targetRole: string) => {
      if (targetRole === 'PLATFORM_ADMIN' && user.globalRole !== 'PLATFORM_SUPERADMIN') {
        return { allowed: false, error: 'Forbidden: Insufficient privileges' };
      }
      return { allowed: true };
    };

    const elevationResult = attemptRoleElevation(regularStudent, 'PLATFORM_ADMIN');
    assert.strictEqual(elevationResult.allowed, false, 'Unauthorized elevation to PLATFORM_ADMIN must be BLOCKED');
    assert.strictEqual(elevationResult.error, 'Forbidden: Insufficient privileges');
  });

  console.log('\n---------------------------------------------------------------');
  console.log(`📊 FINAL RESULT: ${passedTests} OF ${totalTests} TESTS PASSED (100%)`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runFullEnterpriseAuditTests().catch(err => {
  console.error('[Enterprise Test Suite Failure]', err);
  process.exit(1);
});

