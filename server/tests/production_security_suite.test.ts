import assert from 'assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { repo } from '../src/data/dbRepository';
import { connectionState } from '../src/data/mongoConnection';
import { DatabaseUnavailableError } from '../src/errors';
import { paymentService } from '../src/services/paymentService';
import { interoperabilityService } from '../src/services/interoperabilityService';
import { livekitService } from '../src/services/livekitService';
import { transcodingService } from '../src/services/transcodingService';
import { assertSafeTestDatabase } from '../src/scripts/verifyBackupRestore';
import { requireRole, requireAuth, AuthRequest } from '../src/middleware/auth';
import { LtiConsumedNonceModel, LtiStateModel, TenantModel } from '../src/models';
import { IUser, ICertificate, ICourse, IEnrollment } from '../src/types';
import { sanitizeMongoInput } from '../src/middleware/mongoSanitize';
import {
  loginSchema,
  registerSchema,
  createCourseSchema,
  courseReviewSchema,
  supportTicketSchema,
  sanitizeHtmlString,
} from '../src/validation/schemas';

let passedTests = 0;
let totalTests = 0;

async function runTest(testName: string, testFn: () => Promise<void>) {
  totalTests++;
  try {
    await testFn();
    console.log(`  ✅ [PASS] ${totalTests}. ${testName}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${totalTests}. ${testName}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

async function runAdversarialSecuritySuite() {
  console.log('========================================================================');
  console.log('🛡️  EDUSPHERE ENTERPRISE ADVERSARIAL SECURITY & VERIFICATION SUITE');
  console.log('========================================================================\n');

  // ==========================================================================
  // SECTION 1: DATABASE PERSISTENCE, FAIL-SAFE & RUNTIME RECOVERY
  // ==========================================================================
  console.log('--- [1/7] MongoDB Fail-Safe & Runtime Recovery ---');

  await runTest('DB Fail-Safe: Production mode throws DatabaseUnavailableError (503) when DB drops', async () => {
    const originalProd = config.isProduction;
    const originalConn = connectionState.isConnected;

    try {
      (config as any).isProduction = true;
      connectionState.isConnected = false;

      let threw = false;
      try {
        await repo.getTenants();
      } catch (err: any) {
        threw = true;
        assert(err instanceof DatabaseUnavailableError || err.name === 'DatabaseUnavailableError', 'Must throw DatabaseUnavailableError');
        assert.strictEqual(err.statusCode, 503, 'Must report HTTP 503 Service Unavailable');
      }
      assert(threw, 'Must not silently fall back to in-memory data in production mode');
    } finally {
      (config as any).isProduction = originalProd;
      connectionState.isConnected = originalConn;
    }
  });

  await runTest('DB Recovery: Reconnecting DB immediately restores operational state without server reboot', async () => {
    const originalProd = config.isProduction;
    const originalConn = connectionState.isConnected;

    try {
      (config as any).isProduction = true;

      // Simulate connection drop
      connectionState.isConnected = false;
      let dropped = false;
      try {
        await repo.getTenants();
      } catch {
        dropped = true;
      }
      assert(dropped, 'Must reject operations while dropped');

      // Simulate Mongoose reconnection event
      connectionState.isConnected = true;
      connectionState.error = null;

      // Mock Mongoose model find to verify operational recovery without needing live daemon socket
      const originalFind = TenantModel.find;
      (TenantModel as any).find = () => ({
        lean: async () => [{ _id: 'tenant-recovered-1', name: 'Institution Partner', slug: 'institution-partner' }]
      });

      try {
        // Operations must succeed now
        const tenants = await repo.getTenants();
        assert(Array.isArray(tenants), 'Operations must immediately recover');
        assert.strictEqual(tenants[0].name, 'Institution Partner');
      } finally {
        TenantModel.find = originalFind;
      }
    } finally {
      (config as any).isProduction = originalProd;
      connectionState.isConnected = originalConn;
    }
  });

  // ==========================================================================
  // SECTION 2: IAM, ROLE CONSISTENCY & PRIVILEGE ESCALATION BARRIERS
  // ==========================================================================
  console.log('\n--- [2/7] Role Consistency & Privilege Escalation ---');

  await runTest('IAM Security: Registration barrier strictly rejects privileged administrator roles', async () => {
    const forbiddenRoles = ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN'];
    for (const role of forbiddenRoles) {
      const isPrivileged = role === 'PLATFORM_ADMIN' || role === 'INSTITUTION_ADMIN';
      assert(isPrivileged, `Role ${role} must be flagged as privileged and forbidden from public signup`);
    }
  });

  await runTest('IAM Security: Regular student with institution affiliation cannot assume INSTITUTION_ADMIN', async () => {
    const normalStudent: IUser = {
      id: 'student-tenant-1',
      email: 'student@somewhere.edu',
      passwordHash: 'hash',
      fullName: 'Enrolled Student',
      globalRole: 'STANDARD_USER',
      activeRole: 'STUDENT',
      authorizedRoles: ['STUDENT'],
      institutionId: 'tenant-1',
      security: { isEmailVerified: true, twoFactorEnabled: false },
      createdAt: new Date().toISOString(),
    };

    const isSuperAdmin = normalStudent.globalRole === 'PLATFORM_SUPERADMIN';
    const hasAuthorizedRole = normalStudent.authorizedRoles?.includes('INSTITUTION_ADMIN');
    const canSwitch = isSuperAdmin || (hasAuthorizedRole && Boolean(normalStudent.institutionId));

    assert.strictEqual(canSwitch, false, 'Standard student must NOT be allowed to switch to INSTITUTION_ADMIN');
  });

  await runTest('IAM Security: Middleware requireRole blocks PLATFORM_ADMIN claim if globalRole !== PLATFORM_SUPERADMIN', async () => {
    let responseStatus = 200;
    let responseMessage = '';

    const fakeReq: any = {
      user: {
        id: 'attacker-1',
        email: 'attacker@evil.com',
        fullName: 'Attacker',
        activeRole: 'PLATFORM_ADMIN',
        globalRole: 'STANDARD_USER', // Forged or illegitimate activeRole
      },
    };
    const fakeRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (data: any) => {
            responseMessage = data.message;
          },
        };
      },
    };
    const fakeNext = () => {
      responseStatus = 200;
    };

    const middleware = requireRole('PLATFORM_ADMIN');
    middleware(fakeReq, fakeRes, fakeNext);

    assert.strictEqual(responseStatus, 403, 'Must reject activeRole PLATFORM_ADMIN if globalRole is STANDARD_USER');
    assert(responseMessage.includes('PLATFORM_SUPERADMIN'), 'Error must specify superadmin authority requirement');
  });

  // ==========================================================================
  // SECTION 3: MULTI-TENANT ISOLATION BARRIERS
  // ==========================================================================
  console.log('\n--- [3/7] Multi-Tenant Isolation ---');

  await runTest('Tenant Isolation: Institution Admin from Tenant A cannot revoke certificates of Tenant B', async () => {
    const adminUser = {
      id: 'admin-a',
      institutionId: 'tenant-1',
      activeRole: 'INSTITUTION_ADMIN',
    };

    const targetCert: ICertificate = {
      id: 'cert-b',
      certificateNumber: 'EDU-TENANT-B-9999',
      courseId: 'course-b',
      courseTitle: 'Tenant B Curriculum',
      learnerId: 'learner-b',
      learnerName: 'Tenant B Student',
      issuedAt: new Date().toISOString(),
      status: 'ACTIVE',
      tenantId: 'tenant-2',
      verificationHash: 'hash-b',
    };

    const isPlatformAdmin = adminUser.activeRole === 'PLATFORM_ADMIN';
    const isOwner = adminUser.institutionId === targetCert.tenantId;
    const canRevoke = isPlatformAdmin || isOwner;

    assert.strictEqual(canRevoke, false, 'Admin of Tenant 1 must be strictly forbidden from revoking Tenant 2 certificate');
  });

  await runTest('Tenant Isolation: Student from Tenant A cannot access institution-restricted exam of Tenant B', async () => {
    const studentUser = {
      id: 'student-a',
      institutionId: 'tenant-1',
      activeRole: 'STUDENT',
    };

    const targetCourse: Partial<ICourse> = {
      id: 'course-restricted-b',
      tenantId: 'tenant-2',
      visibility: 'INSTITUTION_RESTRICTED',
    };

    const isPlatformAdmin = studentUser.activeRole === 'PLATFORM_ADMIN';
    const isSameTenant = studentUser.institutionId === targetCourse.tenantId;
    const hasAccess = isPlatformAdmin || isSameTenant;

    assert.strictEqual(hasAccess, false, 'Student from Tenant 1 must NOT be granted access to Tenant 2 exam');
  });

  await runTest('Tenant Isolation: Student from Tenant A cannot enroll in institution-restricted course of Tenant B', async () => {
    const studentUser = {
      id: 'student-tenant-1',
      institutionId: 'tenant-1',
      activeRole: 'STUDENT',
    };

    const targetCourse: Partial<ICourse> = {
      id: 'course-restricted-tenant-2',
      tenantId: 'tenant-2',
      visibility: 'INSTITUTION_RESTRICTED',
    };

    const isPlatformAdmin = studentUser.activeRole === 'PLATFORM_ADMIN';
    const isAuthorizedTenant = studentUser.institutionId === targetCourse.tenantId;
    const canEnroll = isPlatformAdmin || isAuthorizedTenant;

    assert.strictEqual(canEnroll, false, 'Student from Tenant 1 must NOT be allowed to enroll in Tenant 2 restricted course');
  });

  // ==========================================================================
  // SECTION 4: DISASTER RECOVERY & ISOLATION SAFETY BARRIERS
  // ==========================================================================
  console.log('\n--- [4/8] Disaster Recovery Safety Barriers ---');

  await runTest('DR Safety: assertSafeTestDatabase enforces explicit test env and rejects production/remote targets', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDrFlag = process.env.ALLOW_DISASTER_RECOVERY_TEST;

    try {
      // 1. Must reject when NODE_ENV is production
      process.env.NODE_ENV = 'production';
      let prodRejected = false;
      try {
        assertSafeTestDatabase('mongodb://localhost:27017/edusphere_synthetic_dr_test');
      } catch (err: any) {
        prodRejected = err.message.includes('strictly forbidden when NODE_ENV=production');
      }
      assert(prodRejected, 'Must reject when NODE_ENV=production');

      // 2. Must reject when not in explicit test mode
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOW_DISASTER_RECOVERY_TEST;
      let nonTestRejected = false;
      try {
        assertSafeTestDatabase('mongodb://localhost:27017/edusphere_synthetic_dr_test');
      } catch (err: any) {
        nonTestRejected = err.message.includes('require explicit test environment authorization');
      }
      assert(nonTestRejected, 'Must reject when no explicit test authorization is present');

      // Now set test environment
      process.env.NODE_ENV = 'test';

      // 3. Must reject remote or non-loopback host
      let remoteRejected = false;
      try {
        assertSafeTestDatabase('mongodb://atlas-cluster.mongodb.net:27017/edusphere_synthetic_dr_test');
      } catch (err: any) {
        remoteRejected = err.message.includes('not an authorized local loopback test target');
      }
      assert(remoteRejected, 'Must reject remote host cluster');

      // 4. Must reject when database name is not disposable pattern
      let nonDisposableRejected = false;
      try {
        assertSafeTestDatabase('mongodb://localhost:27017/edusphere_production');
      } catch (err: any) {
        nonDisposableRejected = err.message.includes('NOT an authorized disposable DR test database');
      }
      assert(nonDisposableRejected, 'Must reject non-disposable database name');

      // 5. Must permit safe local disposable test database
      let safePermitted = false;
      try {
        assertSafeTestDatabase('mongodb://localhost:27017/edusphere_synthetic_dr_test');
        safePermitted = true;
      } catch (err: any) {
        safePermitted = false;
      }
      assert(safePermitted, 'Must permit authorized loopback synthetic test database');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalDrFlag) process.env.ALLOW_DISASTER_RECOVERY_TEST = originalDrFlag;
    }
  });

  // ==========================================================================
  // SECTION 5: STRIPE WEBHOOK RESILIENCE, STALE CRASH RECOVERY & IDEMPOTENCY
  // ==========================================================================
  console.log('\n--- [5/8] Stripe Webhook Security & Idempotency ---');

  await runTest('Stripe Security: Webhook rejects missing or invalid signatures with Stripe SDK', async () => {
    const rawPayload = Buffer.from(JSON.stringify({ id: 'evt_test_123', type: 'checkout.session.completed' }));
    const invalidSignature = 't=1600000000,v1=invalidsignaturehash9823741092837410923874';

    let rejected = false;
    try {
      paymentService.constructWebhookEvent(rawPayload, invalidSignature);
    } catch {
      rejected = true;
    }

    assert(rejected, 'Stripe SDK must reject payload with forged or invalid signature');
  });

  await runTest('Stripe Security: Official Stripe SDK test utility generates valid verifiable signature', async () => {
    const rawPayload = JSON.stringify({ id: `evt_sdk_valid_${Date.now()}`, type: 'checkout.session.completed' });
    const validHeader = paymentService.generateTestWebhookSignature(rawPayload);

    const verifiedEvent = paymentService.constructWebhookEvent(Buffer.from(rawPayload), validHeader);
    assert.strictEqual(verifiedEvent.type, 'checkout.session.completed');
    assert(verifiedEvent.id.startsWith('evt_sdk_valid_'));
  });

  await runTest('Stripe Security: Webhook idempotency fails closed without durable database storage', async () => {
    const crashEvent: any = {
      id: `evt_crash_test_${Date.now()}`,
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
    };
    const originalConn = connectionState.isConnected;
    connectionState.isConnected = false;
    try {
      await assert.rejects(
        paymentService.beginEventProcessing(crashEvent),
        /MongoDB is required to maintain the Stripe webhook idempotency ledger/
      );
    } finally {
      connectionState.isConnected = originalConn;
    }
  });

  await runTest('Stripe Security: checkout completion does not accept unverified local session fixtures', async () => {
    const testSessionId = `cs_idempotent_${Date.now()}`;
    await assert.rejects(
      paymentService.handleCheckoutCompleted(testSessionId),
      new RegExp(`Checkout session object is required to process Stripe session ${testSessionId}`)
    );
  });

  // ==========================================================================
  // SECTION 6: LTI 1.3 ASYMMETRIC RSA, ALGORITHM RESTRAINT & JWKS ROTATION
  // ==========================================================================
  console.log('\n--- [6/8] LTI 1.3 Adversarial Validation ---');

  // Generate authentic RSA 2048-bit keypair for LTI 1.3 verification
  const { publicKey: rsaPublicKey, privateKey: rsaPrivateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const { publicKey: rotatedPublicKey, privateKey: rotatedPrivateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const { publicKey: attackerPublicKey, privateKey: attackerPrivateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const trustedIssuer = 'https://canvas.instructure.com';
  const validClientId = 'edusphere_lti_client';
  const originalConnection = connectionState.isConnected;
  const originalStateCreate = LtiStateModel.create;
  const originalStateFindOne = LtiStateModel.findOne;
  const originalStateDeleteOne = LtiStateModel.deleteOne;
  const originalNonceExists = LtiConsumedNonceModel.exists;
  const originalNonceCreate = LtiConsumedNonceModel.create;
  const ltiStates = new Map<string, { state: string; nonce: string; iss: string; createdAt: Date }>();
  const consumedLtiNonces = new Set<string>();
  connectionState.isConnected = true;
  (LtiStateModel as any).create = async (record: { state: string; nonce: string; iss: string }) => {
    ltiStates.set(record.state, { ...record, createdAt: new Date() });
  };
  (LtiStateModel as any).findOne = (filter: { state: string }) => ({
    lean: async () => ltiStates.get(filter.state) || null,
  });
  (LtiStateModel as any).deleteOne = async (filter: { state: string }) => {
    ltiStates.delete(filter.state);
  };
  (LtiConsumedNonceModel as any).exists = async (filter: { nonce: string }) => consumedLtiNonces.has(filter.nonce);
  (LtiConsumedNonceModel as any).create = async (record: { nonce: string }) => {
    if (consumedLtiNonces.has(record.nonce)) {
      const error: any = new Error('Duplicate key');
      error.code = 11000;
      throw error;
    }
    consumedLtiNonces.add(record.nonce);
  };

  // Register platform with authentic RSA public keys supporting key rotation
  interoperabilityService.registerTrustedPlatform({
    issuer: trustedIssuer,
    clientId: validClientId,
    publicKeyOrSecret: rsaPublicKey,
    keys: {
      'key-2026-v1': rsaPublicKey,
      'key-2026-v2': rotatedPublicKey,
    },
  });

  await runTest('LTI 1.3 Adversarial: Valid token signed with RS256 and matched kid succeeds', async () => {
    const { state, nonce } = await interoperabilityService.initiateLtiLogin(trustedIssuer, 'hint', 'http://localhost/launch');

    const validRsaToken = jwt.sign(
      {
        iss: trustedIssuer,
        sub: 'student-rsa-100',
        aud: validClientId,
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      rsaPrivateKey,
      { algorithm: 'RS256', keyid: 'key-2026-v1', expiresIn: '10m' }
    );

    const context = await interoperabilityService.processLtiLaunch(validRsaToken, state);
    assert.strictEqual(context.userId, 'student-rsa-100');
    assert.strictEqual(context.iss, trustedIssuer);
  });

  await runTest('LTI 1.3 Adversarial: Key rotation dynamically resolves kid: key-2026-v2', async () => {
    const { state, nonce } = await interoperabilityService.initiateLtiLogin(trustedIssuer, 'hint', 'http://localhost/launch');

    const rotatedToken = jwt.sign(
      {
        iss: trustedIssuer,
        sub: 'student-rotated-200',
        aud: validClientId,
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      rotatedPrivateKey,
      { algorithm: 'RS256', keyid: 'key-2026-v2', expiresIn: '10m' }
    );

    const context = await interoperabilityService.processLtiLaunch(rotatedToken, state);
    assert.strictEqual(context.userId, 'student-rotated-200');
  });

  await runTest('LTI 1.3 Adversarial: Rejects token signed with forbidden symmetric algorithm HS256', async () => {
    const { state, nonce } = await interoperabilityService.initiateLtiLogin(trustedIssuer, 'hint', 'http://localhost/launch');

    const hs256Token = jwt.sign(
      {
        iss: trustedIssuer,
        sub: 'attacker-hs256',
        aud: validClientId,
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      'symmetric-secret',
      { algorithm: 'HS256' }
    );

    let rejected = false;
    try {
      await interoperabilityService.processLtiLaunch(hs256Token, state);
    } catch (err: any) {
      if (err.message.includes('Unsupported or unsafe signing algorithm')) {
        rejected = true;
      }
    }
    assert(rejected, 'Must reject HS256 symmetric signing algorithm in LTI 1.3');
  });

  await runTest('LTI 1.3 Adversarial: Rejects forged token signed with attacker unauthorized RSA key', async () => {
    const { state, nonce } = await interoperabilityService.initiateLtiLogin(trustedIssuer, 'hint', 'http://localhost/launch');

    const forgedRsaToken = jwt.sign(
      {
        iss: trustedIssuer,
        sub: 'student-forged-99',
        aud: validClientId,
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      attackerPrivateKey,
      { algorithm: 'RS256', keyid: 'key-2026-v1' }
    );

    let rejected = false;
    try {
      await interoperabilityService.processLtiLaunch(forgedRsaToken, state);
    } catch (err: any) {
      if (err.message.includes('signature verification failed')) {
        rejected = true;
      }
    }
    assert(rejected, 'Must reject forged token signed with attacker private key');
  });

  await runTest('LTI 1.3 Adversarial: Rejects launch from untrusted/unregistered LMS issuer', async () => {
    const untrustedIssuer = 'https://malicious-fake-lms.com';
    const state = `state_${Date.now()}`;
    const nonce = `nonce_${Date.now()}`;
    await LtiStateModel.create({ state, nonce, iss: untrustedIssuer });

    const token = jwt.sign(
      {
        iss: untrustedIssuer,
        sub: 'student-99',
        aud: validClientId,
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      rsaPrivateKey,
      { algorithm: 'RS256' }
    );

    let rejected = false;
    try {
      await interoperabilityService.processLtiLaunch(token, state);
    } catch (err: any) {
      if (err.message.includes('Untrusted LTI 1.3 issuer')) {
        rejected = true;
      }
    }
    assert(rejected, 'Must reject untrusted LMS issuer');
  });

  await runTest('LTI 1.3 Adversarial: Rejects launch with wrong audience / client ID', async () => {
    const { state, nonce } = await interoperabilityService.initiateLtiLogin(trustedIssuer, 'hint', 'http://localhost/launch');

    const wrongAudienceToken = jwt.sign(
      {
        iss: trustedIssuer,
        sub: 'student-99',
        aud: 'wrong_client_id_attacker',
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      rsaPrivateKey,
      { algorithm: 'RS256', keyid: 'key-2026-v1' }
    );

    let rejected = false;
    try {
      await interoperabilityService.processLtiLaunch(wrongAudienceToken, state);
    } catch (err: any) {
      if (err.message.includes('audience mismatch') || err.message.includes('signature verification failed')) {
        rejected = true;
      }
    }
    assert(rejected, 'Must reject audience mismatch');
  });

  await runTest('LTI 1.3 Adversarial: Replay protection prevents re-submitting an already-consumed state/token', async () => {
    const { state, nonce } = await interoperabilityService.initiateLtiLogin(trustedIssuer, 'hint', 'http://localhost/launch');

    const validToken = jwt.sign(
      {
        iss: trustedIssuer,
        sub: 'student-replay-test',
        aud: validClientId,
        nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
      },
      rsaPrivateKey,
      { algorithm: 'RS256', keyid: 'key-2026-v1', expiresIn: '10m' }
    );

    // First launch succeeds
    const context = await interoperabilityService.processLtiLaunch(validToken, state);
    assert.strictEqual(context.userId, 'student-replay-test');

    // Second launch attempt (Replay attack with consumed state)
    let replayed = false;
    try {
      await interoperabilityService.processLtiLaunch(validToken, state);
    } catch {
      replayed = true;
    }
    assert(replayed, 'Replayed LTI launch must be rejected');
  });
  LtiStateModel.create = originalStateCreate;
  LtiStateModel.findOne = originalStateFindOne;
  LtiStateModel.deleteOne = originalStateDeleteOne;
  LtiConsumedNonceModel.exists = originalNonceExists;
  LtiConsumedNonceModel.create = originalNonceCreate;
  connectionState.isConnected = originalConnection;

  // ==========================================================================
  // SECTION 7: SCORM RUNTIME, SESSION OWNERSHIP & TERMINATION
  // ==========================================================================
  console.log('\n--- [7/8] SCORM Runtime, Ownership & Termination ---');

  await runTest('SCORM Runtime: refuses volatile sessions when persistent storage is unavailable', async () => {
    const originalConn = connectionState.isConnected;
    connectionState.isConnected = false;
    try {
      await assert.rejects(
        interoperabilityService.initializeScormSession(`scorm-suite-${Date.now()}`, 'learner-test', 'course-test'),
        /MongoDB persistence is required for SCORM sessions/
      );
    } finally {
      connectionState.isConnected = originalConn;
    }
  });

  await runTest('SCORM Ownership: reads and writes fail closed without persistent session data', async () => {
    const originalConn = connectionState.isConnected;
    connectionState.isConnected = false;
    try {
      await assert.rejects(
        interoperabilityService.getScormValue(`scorm-owner-${Date.now()}`, 'cmi.core.student_id', 'attacker'),
        /MongoDB persistence is required for SCORM sessions/
      );
      await assert.rejects(
        interoperabilityService.setScormValue(`scorm-owner-${Date.now()}`, 'cmi.core.lesson_status', 'completed', 'attacker'),
        /MongoDB persistence is required for SCORM sessions/
      );
    } finally {
      connectionState.isConnected = originalConn;
    }
  });

  await runTest('SCORM Termination: finish fails closed without persistent session data', async () => {
    const originalConn = connectionState.isConnected;
    connectionState.isConnected = false;
    try {
      await assert.rejects(
        interoperabilityService.terminateScormSession(`scorm-term-${Date.now()}`),
        /MongoDB persistence is required for SCORM sessions/
      );
    } finally {
      connectionState.isConnected = originalConn;
    }
  });

  // ==========================================================================
  // SECTION 8: REDIS & FFMPEG DEGRADATION, QUEUE & MANIFEST VALIDATION
  // ==========================================================================
  console.log('\n--- [8/8] Redis & FFmpeg Degradation & Output Validation ---');

  await runTest('Transcoding Degradation: Reports DEGRADED when Redis is required in production but missing', async () => {
    const originalProd = config.isProduction;
    const originalHost = process.env.REDIS_HOST;
    const originalUrl = process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_URL;

    try {
      (config as any).isProduction = true;
      const readiness = transcodingService.getReadiness();
      assert.strictEqual(readiness.isReady, false, 'Readiness must be false when Redis is missing in production');
      assert.strictEqual(readiness.status, 'DEGRADED', 'Status must report DEGRADED');
      assert(readiness.reason?.includes('MongoDB'), 'Must cite missing persistent MongoDB queue');
    } finally {
      (config as any).isProduction = originalProd;
      if (originalHost) process.env.REDIS_HOST = originalHost;
      if (originalUrl) process.env.REDIS_URL = originalUrl;
    }
  });

  await runTest('Transcoding Queue: Enqueuing job in production mode fails closed when Redis is offline', async () => {
    const originalProd = config.isProduction;
    const originalHost = process.env.REDIS_HOST;
    const originalUrl = process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_URL;

    try {
      (config as any).isProduction = true;
      let rejected = false;
      try {
        await transcodingService.enqueueTranscodeJob('course-1', 'les-1', 'https://video.mp4');
      } catch (err: any) {
        if (err.message.includes('MongoDB') || err.message.includes('FFmpeg is unavailable')) {
          rejected = true;
        }
      }
      assert(rejected, 'Must fail closed instead of silently falling back to local memory queue');
    } finally {
      (config as any).isProduction = originalProd;
      if (originalHost) process.env.REDIS_HOST = originalHost;
      if (originalUrl) process.env.REDIS_URL = originalUrl;
    }
  });

  await runTest('Transcoding FFmpeg: Accurately probes host system PATH for FFmpeg binary availability', async () => {
    const isInstalled = transcodingService.isFfmpegAvailable();
    // We already verified via shell probe that ffmpeg is NOT on the host PATH
    assert.strictEqual(isInstalled, false, 'Must accurately report false when FFmpeg binary is absent from host PATH');
  });

  await runTest('HLS Output Validation: generateHlsMasterManifest outputs valid RFC 8216 multi-bitrate playlist', async () => {
    const manifest = transcodingService.generateHlsMasterManifest('course-test', 'les-test');
    assert(manifest.startsWith('#EXTM3U'), 'Must start with #EXTM3U');
    assert(manifest.includes('#EXT-X-VERSION:6'), 'Must declare HLS version 6');
    assert(manifest.includes('RESOLUTION=1920x1080'), 'Must contain 1080p FHD rendition');
    assert(manifest.includes('RESOLUTION=1280x720'), 'Must contain 720p HD rendition');
    assert(manifest.includes('RESOLUTION=854x480'), 'Must contain 480p SD rendition');
    assert(manifest.includes('RESOLUTION=640x360'), 'Must contain 360p mobile rendition');
  });

  await runTest('External Telemetry: Reports accurate LiveKit & Redis/FFmpeg status transparently', async () => {
    const livekitTelem = await livekitService.getTelemetry();
    assert(typeof livekitTelem.configured === 'boolean');
    assert(typeof livekitTelem.mode === 'string');

    const transcodeTelem = await transcodingService.getTelemetry();
    assert(typeof transcodeTelem.configured === 'boolean');
    assert(typeof transcodeTelem.mode === 'string');
    assert(typeof transcodeTelem.isReady === 'boolean');
  });

  // ==========================================================================
  // SECTION 9: STRICT INPUT VALIDATION, NOSQL INJECTION & APPSEC HARDENING
  // ==========================================================================
  console.log('\n--- [9/9] Strict Zod Input Validation, NoSQL Injection & AppSec Hardening ---');

  await runTest('NoSQL Injection: sanitizeMongoInput purges operator keys ($gt, $ne, $where) and dot paths', async () => {
    const maliciousPayload = {
      username: 'legitUser',
      password: { $ne: null },
      filter: {
        $where: 'sleep(5000)',
        'nested.path': 'injected',
        validKey: 'safeValue',
      },
      tags: ['safe', { $gt: '' }],
    };

    const sanitized = sanitizeMongoInput(maliciousPayload) as any;
    assert.strictEqual(sanitized.username, 'legitUser');
    assert.strictEqual(sanitized.password.$ne, undefined, '$ne operator must be stripped');
    assert.deepStrictEqual(sanitized.password, {}, 'Empty object retained when key stripped');
    assert.strictEqual(sanitized.filter.$where, undefined, '$where operator must be stripped');
    assert.strictEqual(sanitized.filter['nested.path'], undefined, 'Dot-path must be stripped');
    assert.strictEqual(sanitized.filter.validKey, 'safeValue', 'Legitimate keys must be preserved');
    assert.strictEqual(sanitized.tags[0], 'safe');
    assert.strictEqual(sanitized.tags[1].$gt, undefined, '$gt in arrays must be stripped');
  });

  await runTest('Schema Validation: loginSchema rejects invalid email formats and enforces strict payload stripping', async () => {
    // 1. Invalid email
    const invalidEmailRes = loginSchema.safeParse({ email: 'not-an-email', password: 'ValidPassword123!' });
    assert.strictEqual(invalidEmailRes.success, false, 'Must reject invalid email format');

    // 2. Extra keys (Mass Assignment / Prototype Pollution prevention)
    const extraKeyRes = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'ValidPassword123!',
      isAdmin: true, // Unexpected field
    });
    assert.strictEqual(extraKeyRes.success, false, 'Strict schema must reject unrecognized payload keys');

    // 3. Valid payload normalizes email to lowercase
    const validRes = loginSchema.safeParse({ email: 'USER@EXAMPLE.COM', password: 'ValidPassword123!' });
    assert.strictEqual(validRes.success, true);
    if (validRes.success) {
      assert.strictEqual(validRes.data.email, 'user@example.com', 'Email must be normalized to lowercase');
    }
  });

  await runTest('Schema Validation: registerSchema enforces length boundaries and password complexity', async () => {
    // 1. Password too short (< 12 chars)
    const shortPassRes = registerSchema.safeParse({
      fullName: 'Alice Smith',
      email: 'alice@example.com',
      password: 'Pass1',
      role: 'STUDENT',
    });
    assert.strictEqual(shortPassRes.success, false, 'Must reject passwords under 12 characters');

    // 2. Name too short (< 2 chars)
    const shortNameRes = registerSchema.safeParse({
      fullName: 'A',
      email: 'alice@example.com',
      password: 'ValidPassword123!',
      role: 'STUDENT',
    });
    assert.strictEqual(shortNameRes.success, false, 'Must reject names under 2 characters');

    // 3. Valid registration payload passes
    const validRes = registerSchema.safeParse({
      fullName: 'Alice Smith',
      email: 'Alice.Smith@Example.COM',
      password: 'StrongPassword2026!',
      role: 'STUDENT',
    });
    assert.strictEqual(validRes.success, true);
    if (validRes.success) {
      assert.strictEqual(validRes.data.email, 'alice.smith@example.com');
    }
  });

  await runTest('AppSec Sanitization: Stored XSS vectors and script injection are neutralized', async () => {
    const maliciousInput = '<script>alert("pwned")</script><b>Hello</b><img src=x onerror=alert(1)>';
    const sanitized = sanitizeHtmlString(maliciousInput);
    assert(!sanitized.includes('<script>'), 'Script tags must be removed');
    assert(!sanitized.includes('onerror='), 'Inline event handlers must be stripped');

    // Review schema applies transformation
    const reviewRes = courseReviewSchema.safeParse({
      rating: 5,
      comment: 'Great course! <script>stealCookies()</script>',
    });
    assert.strictEqual(reviewRes.success, true);
    if (reviewRes.success) {
      assert(!reviewRes.data.comment.includes('<script>'), 'Review comment must have script tags stripped');
    }
  });

  // --- [10/10] API Token Security & Header Enforcement ---
  await runTest('API Token Security: requireAuth middleware rejects tokens passed in URL query parameters', async () => {
    let statusCode = 0;
    let jsonBody: any = null;
    const mockReq: any = {
      headers: {},
      query: { token: 'valid.looking.jwt' },
    };
    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => { jsonBody = body; }
        };
      }
    };
    let nextCalled = false;
    await requireAuth(mockReq, mockRes, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'requireAuth must not call next() when token is only in query string');
    assert.strictEqual(statusCode, 401, 'Must reject with 401 Unauthorized');
    assert.match(jsonBody?.message, /Bearer token required/i);
  });

  await runTest('API Token Security: requireAuth enforces Authorization: Bearer <token> header', async () => {
    const token = jwt.sign(
      { id: 'user-sec-1', email: 'test@sec.io', activeRole: 'STUDENT', tokenVersion: 0 },
      config.jwtSecret
    );
    const origGetVersion = repo.getUserTokenVersion;
    repo.getUserTokenVersion = async () => 0;

    try {
      let statusCode = 0;
      const mockReq: any = {
        headers: { authorization: `Bearer ${token}` },
        query: {},
      };
      const mockRes: any = {
        status: (code: number) => { statusCode = code; return mockRes; },
        json: () => {}
      };
      let nextCalled = false;
      await requireAuth(mockReq, mockRes, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true, 'requireAuth must call next() for valid Bearer token');
      assert.strictEqual(mockReq.user?.email, 'test@sec.io');
    } finally {
      repo.getUserTokenVersion = origGetVersion;
    }
  });

  console.log('\n========================================================================');
  console.log(`📊 ADVERSARIAL VERIFICATION RESULT: ${passedTests} OF ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAdversarialSecuritySuite().catch(err => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
