import assert from 'assert';
import { connectMongoDB, disconnectMongoDB, connectionState } from '../../src/data/mongoConnection';
import { jobQueue } from '../../src/queue/jobQueue';
import { TranscodeJobModel } from '../../src/models';

/**
 * ==============================================================================
 * QUEUE CONCURRENCY, DEDUPLICATION & LEASE SAFETY VERIFICATION SUITE
 * ==============================================================================
 */

async function runQueueConcurrencySuite() {
  console.log('\n===============================================================');
  console.log('⚡ TRANSCODE QUEUE CONCURRENCY, DEDUPLICATION & BACKOFF SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${total}. ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${total}. ${name}`);
      console.error(`     Reason: ${err.message}`);
      throw err;
    }
  }

  const createdJobIds: string[] = [];

  try {
    await connectMongoDB();
    if (!connectionState.isConnected) {
      console.warn('\n⚠️  NOTICE: No live MongoDB daemon or Atlas network route is available.');
      console.warn('   Per testing integrity protocol, queue concurrency tests are classified as BLOCKED.\n');
      console.log('  🟡 [BLOCKED] 1. Concurrent Deduplication: Requires live MongoDB unique index wire protocol');
      console.log('  🟡 [BLOCKED] 2. Exponential Backoff: Requires live MongoDB persistence');
      console.log('  🟡 [BLOCKED] 3. Atomic Worker Claim: Requires live MongoDB atomic findOneAndUpdate');
      console.log('  🟡 [BLOCKED] 4. Worker Lease Renewal: Requires live MongoDB lease updates');
      console.log('  🟡 [BLOCKED] 5. Abandoned Job Recovery: Requires live MongoDB query engine\n');
      return;
    }

    // Clean up any lingering test jobs from prior runs before syncing unique index
    await TranscodeJobModel.deleteMany({ courseId: { $regex: '^course-' } });
    await TranscodeJobModel.syncIndexes();

    // 1. Concurrent Enqueue Race Condition & Deduplication
    await test('Concurrent Deduplication: 10 simultaneous requests create exactly 1 active job for same course/lesson', async () => {
      const courseId = `course-conc-${Date.now()}`;
      const lessonId = `lesson-conc-${Date.now()}`;
      const sourceUrl = 'https://storage.edusphere.io/raw-videos/lecture.mp4';

      // Fire 10 concurrent enqueue requests at the exact same millisecond
      const promises = Array.from({ length: 10 }).map(() =>
        jobQueue.enqueueTranscodeJob({
          courseId,
          lessonId,
          sourceUrl,
          tenantId: 'tenant-test',
        })
      );

      const results = await Promise.all(promises);
      const uniqueJobIds = new Set(results.map(r => r.id));

      assert.strictEqual(
        uniqueJobIds.size,
        1,
        `Expected exactly 1 unique job to be created, but got ${uniqueJobIds.size}`
      );

      const singleJobId = results[0].id;
      createdJobIds.push(singleJobId);

      // Verify in DB that only one record exists with activeLockKey
      if (connectionState.isConnected) {
        const dbRecords = await TranscodeJobModel.find({ courseId, lessonId });
        assert.strictEqual(dbRecords.length, 1, 'Database must contain exactly 1 document for the concurrent batch');
      }
    });

    // 2. Exponential Backoff & Retry Delays
    await test('Exponential Backoff: progressively increases nextEligibleAt delay and transitions to FAILED after maxAttempts', async () => {
      const courseId = `course-backoff-${Date.now()}`;
      const lessonId = `lesson-backoff-${Date.now()}`;

      const job = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/lecture.mp4',
      });
      createdJobIds.push(job.id);

      const beforeFail = Date.now();
      // Attempt 1 Failure (base delay = 1000ms -> delay = 1000ms)
      const beforeFail1 = Date.now();
      const res1 = await jobQueue.markFailed(job.id, 'Decoder buffer underflow', 1000);
      assert.strictEqual(res1.retried, true);
      assert.strictEqual(res1.attempts, 1);
      assert(res1.nextEligibleAt && res1.nextEligibleAt.getTime() >= beforeFail1 + 900);

      // Attempt 2 Failure (delay = 1000 * 2^1 = 2000ms)
      const beforeFail2 = Date.now();
      const res2 = await jobQueue.markFailed(job.id, 'Decoder buffer underflow', 1000);
      assert.strictEqual(res2.retried, true);
      assert.strictEqual(res2.attempts, 2);
      assert(res2.nextEligibleAt && res2.nextEligibleAt.getTime() >= beforeFail2 + 1800);
      assert(res2.nextEligibleAt.getTime() > (res1.nextEligibleAt?.getTime() ?? 0), 'Attempt 2 backoff must be greater than attempt 1');

      // Attempt 3 Failure (reaches maxAttempts 3 -> FAILED)
      const res3 = await jobQueue.markFailed(job.id, 'Decoder buffer underflow', 1000);
      assert.strictEqual(res3.retried, false);
      assert.strictEqual(res3.attempts, 3);

      const finalJob = await jobQueue.getJob(job.id);
      assert.strictEqual(finalJob.status, 'FAILED');
      assert.strictEqual(finalJob.activeLockKey, null, 'Active lock must be released upon terminal failure');
    });

    // 3. Atomic Worker Claiming & Race Condition Prevention
    await test('Atomic Worker Claim: 2 concurrent workers attempting claim claim distinct jobs without duplicate processing', async () => {
      const courseId = `course-claim-${Date.now()}`;

      // Enqueue 2 distinct jobs
      const jobA = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId: `lesson-claim-1`,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/a.mp4',
      });
      const jobB = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId: `lesson-claim-2`,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/b.mp4',
      });
      createdJobIds.push(jobA.id, jobB.id);

      // Two workers attempt to claim simultaneously
      const [claim1, claim2] = await Promise.all([
        jobQueue.claimNextJob('worker-alpha', 60000),
        jobQueue.claimNextJob('worker-beta', 60000),
      ]);

      assert(claim1 && claim2, 'Both workers should claim an available job');
      assert.notStrictEqual(claim1.id, claim2.id, 'Workers must NEVER claim the same job simultaneously');
      assert.strictEqual(claim1.status, 'PROCESSING');
      assert.strictEqual(claim2.status, 'PROCESSING');
    });

    // 4. Worker Heartbeat & Renewable Processing Lease
    await test('Worker Lease Renewal: Heartbeat extends leaseExpiresAt to protect long-running transcode tasks', async () => {
      const courseId = `course-lease-${Date.now()}`;
      const lessonId = `lesson-lease-${Date.now()}`;

      const job = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/lecture.mp4',
      });
      createdJobIds.push(job.id);

      const claimed = await jobQueue.claimNextJob('worker-gamma', 30000);
      assert(claimed, 'Job must be claimed');
      const initialLease = new Date(claimed.leaseExpiresAt).getTime();

      // Simulate passage of time and renew lease for 120s
      const renewed = await jobQueue.renewLease(claimed.id, 'worker-gamma', 120000);
      assert.strictEqual(renewed, true, 'Lease renewal should succeed for the active claiming worker');

      const updatedJob = await jobQueue.getJob(claimed.id);
      const extendedLease = new Date(updatedJob.leaseExpiresAt).getTime();
      assert(extendedLease > initialLease, 'Renewed lease must extend leaseExpiresAt further into the future');
    });

    // 5. Stalled & Abandoned Job Safe Recovery
    await test('Abandoned Job Recovery: recycles expired lease jobs back to QUEUED with backoff', async () => {
      const courseId = `course-crash-${Date.now()}`;
      const lessonId = `lesson-crash-${Date.now()}`;

      const job = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/lecture.mp4',
      });
      createdJobIds.push(job.id);

      // Claim with expired lease
      await TranscodeJobModel.findOneAndUpdate(
        { id: job.id },
        {
          $set: {
            status: 'PROCESSING',
            lockedBy: 'worker-crashed',
            lockedAt: new Date(Date.now() - 600000),
            leaseExpiresAt: new Date(Date.now() - 300000), // Expired 5 mins ago
            updatedAt: new Date(Date.now() - 600000),
          },
        }
      );

      const recovered = await jobQueue.recoverStalledJobs(60000);
      assert(recovered >= 1, 'Expected at least 1 abandoned job to be recovered');

      const recheckedJob = await jobQueue.getJob(job.id);
      assert.strictEqual(recheckedJob.status, 'QUEUED');
      assert.strictEqual(recheckedJob.attempts, 1);
    });

  } finally {
    // Cleanup temporary test records
    if (connectionState.isConnected && createdJobIds.length > 0) {
      await TranscodeJobModel.deleteMany({ id: { $in: createdJobIds } });
    }
    await disconnectMongoDB();
  }

  console.log('\n---------------------------------------------------------------');
  console.log(`📊 QUEUE CONCURRENCY RESULT: ${passed} OF ${total} TESTS PASSED (100%)`);
  console.log('===============================================================\n');
}

runQueueConcurrencySuite().catch(err => {
  console.error('[Queue Concurrency Suite Fatal]', err);
  process.exit(1);
});
