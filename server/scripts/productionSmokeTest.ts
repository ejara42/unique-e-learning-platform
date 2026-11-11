import assert from 'assert';
import { randomUUID } from 'crypto';

const TARGET_URL = (process.env.TARGET_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '');

async function runProductionSmokeTests() {
  console.log('========================================================================');
  console.log('🚀 EDUSPHERE PRODUCTION & STAGING SMOKE TEST SUITE');
  console.log(`🌐 Target Gateway: ${TARGET_URL}`);
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  async function check(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${total}. ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ [FAIL] ${total}. ${name}`);
      console.error(`     Reason: ${e.message}`);
    }
  }

  // 1. Health Probe
  await check('Liveness probe (/healthz) responds with 200 OK and valid JSON', async () => {
    const res = await fetch(`${TARGET_URL}/healthz`);
    assert.strictEqual(res.status, 200, `Expected HTTP 200, received ${res.status}`);
    const body: any = await res.json();
    assert.strictEqual(body.status, 'ok', 'Status field must be "ok"');
    assert(typeof body.uptime === 'number', 'Uptime must be a number');
  });

  // 2. Telemetry Status
  await check('Telemetry endpoint (/api/health) reports system telemetry and service name', async () => {
    const res = await fetch(`${TARGET_URL}/api/health`);
    assert([200, 503].includes(res.status), `Expected HTTP 200 or 503, received ${res.status}`);
    const body: any = await res.json();
    assert(body.service?.includes('EduSphere'), 'Must identify as EduSphere service');
    assert(body.database !== undefined, 'Database telemetry must be present');
  });

  // 3. Public Course Catalog
  await check('Course catalog (/api/courses) returns active courses array', async () => {
    const res = await fetch(`${TARGET_URL}/api/courses`);
    assert.strictEqual(res.status, 200, `Expected HTTP 200, received ${res.status}`);
    const body: any = await res.json();
    assert(Array.isArray(body.courses), 'courses must be an array');
  });

  // 4. Public Credential Verification Portal
  await check('Credential verification (/api/certificates/verify/:code) responds deterministically', async () => {
    const res = await fetch(`${TARGET_URL}/api/certificates/verify/SMOKE-${randomUUID()}`);
    assert.strictEqual(res.status, 404, `Expected HTTP 404 for non-existent credential, received ${res.status}`);
    const body: any = await res.json();
    assert.strictEqual(body.valid, false);
  });

  // 5. Auth Rate Limiter & Barrier
  await check('Self-registration rejects privileged administrator role escalation (HTTP 403)', async () => {
    const res = await fetch(`${TARGET_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Smoke Attacker',
        email: `smoke-${randomUUID()}@example.invalid`,
        password: 'Password1234!',
        role: 'PLATFORM_ADMIN',
      }),
    });
    assert([400, 403].includes(res.status), `Privileged self-registration must be rejected, got HTTP ${res.status}`);
  });

  await check('Registration validation rejects missing names, weak passwords, malformed emails, and extra fields', async () => {
    const invalidPayloads = [
      { email: `smoke-${randomUUID()}@example.invalid`, password: 'StrongPassword2026!', role: 'STUDENT' },
      { fullName: 'Smoke User', email: `smoke-${randomUUID()}@example.invalid`, password: 'weak', role: 'STUDENT' },
      { fullName: 'Smoke User', email: `not-an-email-${randomUUID()}`, password: 'StrongPassword2026!', role: 'STUDENT' },
      { fullName: 'Smoke User', email: `smoke-${randomUUID()}@example.invalid`, password: 'StrongPassword2026!', role: 'STUDENT', isAdmin: true },
    ];

    for (const payload of invalidPayloads) {
      const res = await fetch(`${TARGET_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      assert.strictEqual(res.status, 400, `Invalid registration input must return HTTP 400, got ${res.status}: ${JSON.stringify(data)}`);
    }
  });

  // 6. Security Headers Check
  await check('Security headers (X-Content-Type-Options, X-Frame-Options) are enforced', async () => {
    const res = await fetch(`${TARGET_URL}/healthz`);
    const nosniff = res.headers.get('x-content-type-options');
    const xframe = res.headers.get('x-frame-options');
    assert.strictEqual(nosniff, 'nosniff', 'X-Content-Type-Options must be nosniff');
    assert.strictEqual(xframe, 'DENY', 'X-Frame-Options must be DENY');
  });

  console.log('\n------------------------------------------------------------------------');
  console.log(`📊 SMOKE SUITE RESULT: ${passed} OF ${total} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runProductionSmokeTests().catch((err) => {
  console.error('[Smoke Test Error]', err);
  process.exit(1);
});
