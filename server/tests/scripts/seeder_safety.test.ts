import assert from 'assert';
import { assertSafeE2EDatabase } from '../../src/scripts/seedE2EUsers';

async function runSeederSafetySuite() {
  console.log('\n===============================================================');
  console.log('🛡️  E2E SEEDER SAFETY & PRODUCTION REFUSAL VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${total}. ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${total}. ${name}`);
      console.error(`     Reason: ${err.message}`);
      throw err;
    }
  }

  const originalEnv = { ...process.env };

  try {
    // 1. Refusal when NODE_ENV=production
    test('Refuses execution when NODE_ENV=production', () => {
      process.env.ALLOW_E2E_SEED = 'true';
      assert.throws(
        () => assertSafeE2EDatabase('mongodb://localhost:27017/edusphere_test', 'production'),
        /strictly prohibited when NODE_ENV=production/
      );
    });

    // 2. Refusal when ALLOW_E2E_SEED is missing or not 'true'
    test('Refuses execution when ALLOW_E2E_SEED is not explicitly true', () => {
      delete process.env.ALLOW_E2E_SEED;
      assert.throws(
        () => assertSafeE2EDatabase('mongodb://localhost:27017/edusphere_test', 'test'),
        /requires explicit environment authorization/
      );

      process.env.ALLOW_E2E_SEED = 'false';
      assert.throws(
        () => assertSafeE2EDatabase('mongodb://localhost:27017/edusphere_test', 'test'),
        /requires explicit environment authorization/
      );
    });

    // 3. Refusal when database URI targets a production database
    test('Refuses execution when target database name contains production or prod', () => {
      process.env.ALLOW_E2E_SEED = 'true';

      assert.throws(
        () => assertSafeE2EDatabase('mongodb://localhost:27017/edusphere_production', 'test'),
        /is a production database\. E2E seeding refused/
      );

      assert.throws(
        () => assertSafeE2EDatabase('mongodb://cluster.mongodb.net/edusphere_prod', 'test'),
        /is a production database\. E2E seeding refused/
      );

      assert.throws(
        () => assertSafeE2EDatabase('mongodb+srv://admin:pass@cluster.mongodb.net/production?retryWrites=true', 'test'),
        /is a production database\. E2E seeding refused/
      );
    });

    // 4. Acceptance when in authorized test environment with isolated test database
    test('Accepts valid non-production configuration with explicit ALLOW_E2E_SEED=true', () => {
      process.env.ALLOW_E2E_SEED = 'true';
      assert.doesNotThrow(
        () => assertSafeE2EDatabase('mongodb://localhost:27017/edusphere_test', 'test')
      );
      assert.doesNotThrow(
        () => assertSafeE2EDatabase('mongodb://mongo-local:27017/edusphere_e2e_ci', 'development')
      );
    });

    console.log(`\n===============================================================`);
    console.log(`🎉 ALL ${passed}/${total} E2E SEEDER SAFETY TESTS PASSED!`);
    console.log(`===============================================================\n`);
  } finally {
    process.env = originalEnv;
  }
}

runSeederSafetySuite()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
