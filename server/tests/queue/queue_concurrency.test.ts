import assert from 'assert';
import crypto from 'crypto';
import { connectMongoDB, disconnectMongoDB, connectionState } from '../../src/data/mongoConnection';
import { jobQueue } from '../../src/queue/jobQueue';
import { TranscodeJobModel } from '../../src/models';

/**
 * ==============================================================================
 * QUEUE CONCURRENCY, DEDUPLICATION, LEASE & INDEX INTEGRITY SUITE
 * ==============================================================================
 */

function assertSafeQueueTestDatabase(uri: string): void {
  const normalized = (uri || '').toLowerCase();
  if (
    normalized.includes('production') ||
    normalized.includes('edusphere_prod') ||
    normalized.includes('/prod')
  ) {
    throw new Error(`FATAL SECURITY BARRIER: Queue test suite cannot target production database: ${uri}`);
  }
}

async function runQueueConcurrencySuite() {
  console.log('\n===============================================================');
  console.log('⚡ TRANSCODE QUEUE CONCURRENCY, DEDUPLICATION & LEASE SUITE');
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

  const testRunId = `testrun-${crypto.randomBytes(6).toString('hex')}`;
  const createdJobIds: string[] = [];

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere_staging';
    assertSafeQueueTestDatabase(mongoUri);

    await connectMongoDB();
    if (!connectionState.isConnected) {
      throw new Error('FATAL: Live MongoDB connection is required for queue concurrency suite. Test cannot succeed without DB.');
    }

    // Ensure unique partial index migration is executed safely
    await jobQueue.ensureIndexes();

    // Clean up ONLY jobs created by this specific testRunId (Safe Scoped Cleanup)
    await TranscodeJobModel.deleteMany({ courseId: { $regex: `^${testRunId}` } });

    // 1. Concurrent Enqueue Race Condition & Deduplication
    await test('Concurrent Deduplication: 10 simultaneous requests create exactly 1 active job for same course/lesson', async () => {
      const courseId = `${testRunId}-course-conc`;
      const lessonId = `lesson-conc-1`;
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
      const dbRecords = await TranscodeJobModel.find({ courseId, lessonId });
      assert.strictEqual(dbRecords.length, 1, 'Database must contain exactly 1 document for the concurrent batch');
      assert.strictEqual(dbRecords[0].activeLockKey, `${courseId}:${lessonId}`);
    });

    // 2. Exponential Backoff & Retry Delays
    await test('Exponential Backoff: progressively increases nextEligibleAt delay and transitions to FAILED after maxAttempts', async () => {
      const courseId = `${testRunId}-course-backoff`;
      const lessonId = `lesson-backoff-1`;

      const job = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/lecture.mp4',
      });
      createdJobIds.push(job.id);

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

    // 3. Multi-Worker Parallel Claim: 5 workers claiming 5 distinct jobs without duplicate processing
    await test('Multi-Worker Claim: 5 concurrent workers claim 5 distinct jobs with zero collision', async () => {
      const courseId = `${testRunId}-course-multi`;
      const workerJobIds: string[] = [];

      for (let i = 1; i <= 5; i++) {
        const job = await jobQueue.enqueueTranscodeJob({
          courseId,
          lessonId: `lesson-multi-${i}`,
          sourceUrl: `https://storage.edusphere.io/raw-videos/multi-${i}.mp4`,
        });
        workerJobIds.push(job.id);
        createdJobIds.push(job.id);
      }

      // 5 distinct workers attempt simultaneous claims
      const workers = ['worker-1', 'worker-2', 'worker-3', 'worker-4', 'worker-5'];
      const claims = await Promise.all(workers.map(w => jobQueue.claimNextJob(w, 60000)));

      // Filter out null claims
      const successfulClaims = claims.filter(c => c !== null);
      assert.strictEqual(successfulClaims.length, 5, 'All 5 workers must successfully claim a distinct job');

      const claimedJobIds = new Set(successfulClaims.map(c => c.id));
      assert.strictEqual(claimedJobIds.size, 5, 'Every worker must claim a unique job ID (zero duplicates)');

      for (const c of successfulClaims) {
        assert.strictEqual(c.status, 'PROCESSING');
        assert(c.lockedBy && workers.includes(c.lockedBy));
      }
    });

    // 4. Worker Heartbeat & Renewable Processing Lease
    await test('Worker Lease Renewal: Heartbeat extends leaseExpiresAt to protect long-running transcode tasks', async () => {
      const courseId = `${testRunId}-course-lease`;
      const lessonId = `lesson-lease-1`;

      const job = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId,
        sourceUrl: 'https://storage.edusphere.io/raw-videos/lecture.mp4',
      });
      createdJobIds.push(job.id);

      const claimed = await jobQueue.claimNextJob('worker-gamma', 30000);
      assert(claimed, 'Job must be claimed');
      const initialLease = new Date(claimed.leaseExpiresAt).getTime();

      // Renew lease for 120s
      const renewed = await jobQueue.renewLease(claimed.id, 'worker-gamma', 120000);
      assert.strictEqual(renewed, true, 'Lease renewal should succeed for the active claiming worker');

      const updatedJob = await jobQueue.getJob(claimed.id);
      const extendedLease = new Date(updatedJob.leaseExpiresAt).getTime();
      assert(extendedLease > initialLease, 'Renewed lease must extend leaseExpiresAt further into the future');
    });

    // 5. Stalled & Abandoned Job Safe Recovery
    await test('Abandoned Job Recovery: recycles expired lease jobs back to QUEUED with backoff', async () => {
      const courseId = `${testRunId}-course-crash`;
      const lessonId = `lesson-crash-1`;

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

    // 6. Coexistence of Multiple Terminal Jobs (Verifying Unique Partial Index with activeLockKey: null)
    await test('Index Integrity: Multiple completed & failed jobs coexist with activeLockKey: null without unique index collision', async () => {
      const courseId = `${testRunId}-course-partial-idx`;

      // Create 3 jobs for different lessons
      const job1 = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId: 'lesson-terminal-1',
        sourceUrl: 'https://storage.edusphere.io/raw-videos/1.mp4',
      });
      const job2 = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId: 'lesson-terminal-2',
        sourceUrl: 'https://storage.edusphere.io/raw-videos/2.mp4',
      });
      const job3 = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId: 'lesson-terminal-3',
        sourceUrl: 'https://storage.edusphere.io/raw-videos/3.mp4',
      });

      createdJobIds.push(job1.id, job2.id, job3.id);

      // Mark Job 1 COMPLETED -> sets activeLockKey: null
      await jobQueue.markCompleted(job1.id, 'https://cdn.edusphere.io/master-1.m3u8');

      // Mark Job 2 COMPLETED -> sets activeLockKey: null (would trigger E11000 if sparse index was faulty!)
      await jobQueue.markCompleted(job2.id, 'https://cdn.edusphere.io/master-2.m3u8');

      // Mark Job 3 FAILED after 3 attempts -> sets activeLockKey: null
      await jobQueue.markFailed(job3.id, 'Failed run 1', 100);
      await jobQueue.markFailed(job3.id, 'Failed run 2', 100);
      await jobQueue.markFailed(job3.id, 'Failed run 3 (terminal)', 100);

      // Verify all 3 jobs exist in database with activeLockKey === null
      const terminalJobs = await TranscodeJobModel.find({ id: { $in: [job1.id, job2.id, job3.id] } });
      assert.strictEqual(terminalJobs.length, 3, 'All 3 terminal jobs must coexist in the database');
      for (const tj of terminalJobs) {
        assert.strictEqual(tj.activeLockKey, null, `Job ${tj.id} must have activeLockKey set to null`);
      }

      // Verify that enqueuing a fresh job for lesson-terminal-1 succeeds because lock was released
      const reEnqueued = await jobQueue.enqueueTranscodeJob({
        courseId,
        lessonId: 'lesson-terminal-1',
        sourceUrl: 'https://storage.edusphere.io/raw-videos/1-replacement.mp4',
      });
      createdJobIds.push(reEnqueued.id);
      assert.notStrictEqual(reEnqueued.id, job1.id, 'Re-enqueuing after completion creates a fresh job');
      assert.strictEqual(reEnqueued.status, 'QUEUED');
      assert.strictEqual(reEnqueued.activeLockKey, `${courseId}:lesson-terminal-1`);
    });

  } finally {
    // Scoped cleanup: Delete ONLY jobs created in this testRunId
    if (connectionState.isConnected && createdJobIds.length > 0) {
      await TranscodeJobModel.deleteMany({ id: { $in: createdJobIds } });
      await TranscodeJobModel.deleteMany({ courseId: { $regex: `^${testRunId}` } });
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
