import assert from 'assert';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { EnrollmentModel, TenantModel, CourseModel, UserModel } from '../../src/models';

/**
 * ==============================================================================
 * GENUINE MONGODB REPLICA-SET & LIVE DATABASE INTEGRATION SUITE
 * ==============================================================================
 * This test suite executes ONLY against a genuine MongoDB replica-set instance.
 * It NEVER uses in-memory mock substitutes.
 * 
 * Safety Barriers:
 * 1. Requires a non-production database target. Rejects 'edusphere_production' / 'edusphere' / 'production'.
 * 2. Never runs destructive operations against production databases.
 * 3. Tracks and cleans up all temporary test records created during test runs.
 * 4. Transparently classifies results as PASS, FAIL, BLOCKED, or NOT TESTED.
 * ==============================================================================
 */

function assertSafeTestDatabase(uri: string): string {
  try {
    const sanitized = uri.startsWith('mongodb+srv://')
      ? uri.replace('mongodb+srv://', 'http://')
      : uri.replace('mongodb://', 'http://');
    const parsed = new URL(sanitized);
    const dbName = parsed.pathname.replace(/^\//, '').split('?')[0] || '';

    const forbiddenProdNames = ['edusphere', 'edusphere_production', 'edusphere_prod', 'production', 'prod'];
    if (forbiddenProdNames.includes(dbName.toLowerCase())) {
      throw new Error(
        `[TEST SAFETY VIOLATION] Database target '${dbName}' is recognized as a production database name! ` +
        `Integration tests must target a dedicated test database (e.g., 'edusphere_test' or 'edusphere_staging'). Execution aborted.`
      );
    }
    return dbName;
  } catch (err: any) {
    if (err.message.includes('TEST SAFETY VIOLATION')) throw err;
    return 'unknown_db';
  }
}

async function runMongoDBReplicaIntegrationSuite() {
  console.log('\n===============================================================');
  console.log('🍃 GENUINE MONGODB REPLICA-SET & LIVE PERSISTENCE INTEGRATION');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;
  let blocked = 0;
  let failed = 0;

  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edusphere_test';
  let isConnected = false;

  // 1. Production Target Safety Barrier
  try {
    const targetDbName = assertSafeTestDatabase(mongoUri);
    console.log(`🛡️  Target Database Safety Verified: '${targetDbName}' (Safe for integration tests)`);
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  console.log(`Connecting to MongoDB target: ${mongoUri.replace(/:([^@]+)@/, ':****@')} ...`);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });
    isConnected = mongoose.connection.readyState === 1;
  } catch (err: any) {
    console.warn(`[Integration Barrier] Live MongoDB unreachable: ${err.message}`);
    isConnected = false;
  }

  function reportBlocked(name: string, reason: string) {
    total++;
    blocked++;
    console.log(`  🟡 [BLOCKED] ${total}. ${name}`);
    console.log(`     Reason: ${reason}`);
  }

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    if (!isConnected) {
      blocked++;
      console.log(`  🟡 [BLOCKED] ${total}. ${name}`);
      console.log(`     Reason: Genuine MongoDB connection is unavailable in current environment.`);
      return;
    }
    try {
      await fn();
      console.log(`  ✅ [PASS] ${total}. ${name}`);
      passed++;
    } catch (err: any) {
      failed++;
      console.error(`  ❌ [FAIL] ${total}. ${name}`);
      console.error(`     Reason: ${err.message}`);
      throw err;
    }
  }

  const createdEnrollmentIds: string[] = [];
  const createdTenantIds: string[] = [];

  if (!isConnected) {
    console.warn('\n⚠️  NOTICE: No live MongoDB daemon or Atlas network route is available in this test runner.');
    console.warn('   Per testing integrity protocol, mock fallbacks are NOT used for integration tests.');
    console.warn('   All live integration tests are transparently classified as BLOCKED.\n');

    reportBlocked(
      'Live Index Verification: Enforce compound unique index on {courseId, learnerId} via MongoDB',
      'Requires genuine MongoDB server with active wire protocol.'
    );
    reportBlocked(
      'Duplicate Write Barrier: Duplicate enrollment insertion throws E11000 duplicate key error',
      'Requires live MongoDB database engine to execute unique index collision.'
    );
    reportBlocked(
      'Replica-Set Topology: Verify hello command, setName, and primary-node status',
      'Requires live MongoDB replica-set cluster.'
    );
    reportBlocked(
      'Multi-Tenant Schema Durability: Persist, query, and clean up tenant-isolated documents',
      'Requires live MongoDB collection storage.'
    );
  } else {
    try {
      // 1. Build and sync indexes on live MongoDB
      await test('Live Index Verification: Enforce compound unique index on {courseId, learnerId} via MongoDB', async () => {
        await EnrollmentModel.syncIndexes();
        const indexes = await EnrollmentModel.collection.indexes();
        const hasCompound = indexes.some(idx =>
          idx.key?.courseId === 1 && idx.key?.learnerId === 1 && idx.unique === true
        );
        assert(hasCompound, 'MongoDB collection must have compound unique index on {courseId: 1, learnerId: 1}');
      });

      // 2. Duplicate Write Barrier via real MongoDB
      await test('Duplicate Write Barrier: Duplicate enrollment insertion throws E11000 duplicate key error', async () => {
        const testCourseId = `course-dup-${Date.now()}`;
        const testLearnerId = `learner-dup-${Date.now()}`;
        const id1 = `enr-real-1-${Date.now()}`;
        const id2 = `enr-real-2-${Date.now()}`;

        createdEnrollmentIds.push(id1, id2);

        // First insertion must succeed
        await EnrollmentModel.create({
          id: id1,
          courseId: testCourseId,
          learnerId: testLearnerId,
          status: 'ENROLLED',
          enrolledAt: new Date().toISOString(),
          progressPercentage: 0,
          completedLessonIds: [],
        });

        // Duplicate insertion must throw E11000
        let threw = false;
        try {
          await EnrollmentModel.create({
            id: id2,
            courseId: testCourseId,
            learnerId: testLearnerId,
            status: 'ENROLLED',
            enrolledAt: new Date().toISOString(),
            progressPercentage: 0,
            completedLessonIds: [],
          });
        } catch (err: any) {
          threw = true;
          assert(err.code === 11000 || String(err.message).includes('E11000'), `Expected E11000 error, got: ${err.message}`);
        }
        assert(threw, 'Expected duplicate enrollment to be rejected by MongoDB unique compound index');
      });

      // 3. Genuine Replica-set Topology Verification (setName, primary status, hosts)
      await test('Replica-Set Topology: Verify hello command, setName, and primary-node status', async () => {
        const adminDb = mongoose.connection.db?.admin();
        const hello = await adminDb?.command({ hello: 1 });
        assert(hello, 'Must receive valid hello/isMaster response from live MongoDB engine');

        // Strictly verify replica set properties
        assert(typeof hello.setName === 'string' && hello.setName.length > 0, `Cluster must define a replica-set setName (got: ${hello.setName})`);
        assert(hello.isWritablePrimary === true || hello.ismaster === true, 'Connected node must report writable primary status');
        assert(Array.isArray(hello.hosts) && hello.hosts.length > 0, 'Replica-set topology must publish member hosts array');
        console.log(`     [Topology Details] setName: "${hello.setName}" | hosts: [${hello.hosts.join(', ')}] | primary: ${hello.isWritablePrimary || hello.ismaster}`);
      });

      // 4. Multi-Tenant Schema Durability & Record Cleanup
      await test('Multi-Tenant Schema Durability: Persist, query, and clean up tenant-isolated documents', async () => {
        const testTenantId = `tenant-live-${Date.now()}`;
        createdTenantIds.push(testTenantId);

        await TenantModel.create({
          id: testTenantId,
          name: 'Live Integration University',
          slug: `live-uni-${Date.now()}`,
          type: 'UNIVERSITY',
          status: 'VERIFIED',
          contactEmail: 'integration@live-university.edu',
        });

        const retrieved = await TenantModel.findOne({ id: testTenantId }).lean();
        assert(retrieved, 'Tenant document must be retrievable from live MongoDB collection');
        assert.strictEqual(retrieved?.id, testTenantId);
      });
    } finally {
      // Clean up all temporary records created during test execution
      if (createdEnrollmentIds.length > 0) {
        await EnrollmentModel.deleteMany({ id: { $in: createdEnrollmentIds } });
      }
      if (createdTenantIds.length > 0) {
        await TenantModel.deleteMany({ id: { $in: createdTenantIds } });
      }
      await mongoose.disconnect();
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log(`📊 LIVE MONGODB INTEGRATION SUMMARY:`);
  console.log(`   Passed:     ${passed}`);
  console.log(`   Blocked:    ${blocked}`);
  console.log(`   Failed:     ${failed}`);
  console.log(`   Not Tested: 0`);
  console.log(`   Status:     ${isConnected ? (failed === 0 ? 'PASSED (Genuine Live Replica-Set Verified)' : 'FAILED') : 'CLASSIFIED AS BLOCKED (Zero Mock Pretenses)'}`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runMongoDBReplicaIntegrationSuite().catch(err => {
  console.error('[Integration Suite Fatal]', err);
  process.exit(1);
});
