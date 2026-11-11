import { v4 as uuidv4 } from 'uuid';
import { TranscodeJobModel } from '../models';
import { connectionState } from '../data/mongoConnection';
import { config } from '../config';

export interface EnqueueJobOptions {
  courseId: string;
  lessonId: string;
  sourceUrl: string;
  tenantId?: string | null;
  priority?: number;
  idempotencyKey?: string;
}

export interface JobProgressUpdate {
  jobId: string;
  progressPercentage: number;
  stage?: string;
  renditions?: Array<{ resolution: string; bitrateKbps: number; playlistUrl: string }>;
}

export class PersistentTranscodeQueue {
  private isShuttingDown = false;
  private indexesEnsured = false;

  private assertDatabase(): void {
    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required for persistent transcoding jobs.');
    }
  }

  public async ensureIndexes(): Promise<void> {
    if (!this.indexesEnsured && connectionState.isConnected) {
      try {
        await TranscodeJobModel.init();
        this.indexesEnsured = true;
      } catch (err: any) {
        console.warn('[Queue] Index initialization warning:', err?.message);
      }
    }
  }

  async enqueueTranscodeJob(options: EnqueueJobOptions): Promise<any> {
    this.assertDatabase();
    if (this.isShuttingDown) throw new Error('Service is shutting down. New jobs cannot be accepted.');

    await this.ensureIndexes();

    const { courseId, lessonId, sourceUrl, tenantId, idempotencyKey } = options;
    const activeLockKey = `${courseId}:${lessonId}`;

    // Fast path: Check if an active job already exists
    const existing = await TranscodeJobModel.findOne({
      $or: [
        { activeLockKey },
        { courseId, lessonId, status: { $in: ['QUEUED', 'PROCESSING'] } },
      ],
    });
    if (existing) return existing;

    const jobId = `job-transcode-${uuidv4().slice(0, 8)}`;
    const storageBase = config.storagePublicUrl;
    const renditions = [
      { resolution: '1080p', bitrateKbps: 4500, playlistUrl: `${storageBase}/hls/${courseId}/${lessonId}/1080p/1080p.m3u8` },
      { resolution: '720p', bitrateKbps: 2200, playlistUrl: `${storageBase}/hls/${courseId}/${lessonId}/720p/720p.m3u8` },
      { resolution: '480p', bitrateKbps: 800, playlistUrl: `${storageBase}/hls/${courseId}/${lessonId}/480p/480p.m3u8` },
      { resolution: '360p', bitrateKbps: 400, playlistUrl: `${storageBase}/hls/${courseId}/${lessonId}/360p/360p.m3u8` },
    ];
    const outputMasterPlaylist = `${storageBase}/hls/${courseId}/${lessonId}/master.m3u8`;

    try {
      return await TranscodeJobModel.create({
        id: jobId,
        courseId,
        lessonId,
        tenantId: tenantId || null,
        sourceUrl,
        status: 'QUEUED',
        progressPercentage: 0,
        outputMasterPlaylist,
        renditions,
        attempts: 0,
        maxAttempts: 3,
        idempotencyKey: idempotencyKey || null,
        activeLockKey,
        nextEligibleAt: null,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date(),
      });
    } catch (err: any) {
      // Concurrency protection: duplicate activeLockKey collision caught under concurrent enqueues
      if (err.code === 11000 || String(err.message).includes('E11000')) {
        const active = await TranscodeJobModel.findOne({
          $or: [
            { activeLockKey },
            { courseId, lessonId, status: { $in: ['QUEUED', 'PROCESSING'] } },
          ],
        });
        if (active) return active;
      }
      throw err;
    }
  }

  /**
   * Atomic Job Claiming: Prevents multiple workers from grabbing the same job.
   * Atomically transitions one eligible job from QUEUED -> PROCESSING with lease duration.
   */
  async claimNextJob(workerId: string, leaseDurationMs = 60000): Promise<any> {
    this.assertDatabase();
    if (this.isShuttingDown) return null;

    const now = new Date();
    return TranscodeJobModel.findOneAndUpdate(
      {
        status: 'QUEUED',
        $or: [
          { nextEligibleAt: { $exists: false } },
          { nextEligibleAt: null },
          { nextEligibleAt: { $lte: now } },
        ],
      },
      {
        $set: {
          status: 'PROCESSING',
          lockedBy: workerId,
          lockedAt: now,
          leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
          updatedAt: now,
        },
      },
      {
        sort: { createdAt: 1 }, // FIFO
        new: true,
      }
    );
  }

  /**
   * Heartbeat / Lease Renewal: Worker periodically renews lease for long-running transcode tasks.
   */
  async renewLease(jobId: string, workerId: string, leaseDurationMs = 60000): Promise<boolean> {
    this.assertDatabase();
    const updated = await TranscodeJobModel.findOneAndUpdate(
      { id: jobId, lockedBy: workerId, status: 'PROCESSING' },
      {
        $set: {
          leaseExpiresAt: new Date(Date.now() + leaseDurationMs),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );
    return Boolean(updated);
  }

  async updateProgress(update: JobProgressUpdate): Promise<void> {
    this.assertDatabase();
    const updatePayload: Record<string, unknown> = {
      progressPercentage: update.progressPercentage,
      status: 'PROCESSING',
      updatedAt: new Date(),
    };
    if (update.renditions) updatePayload.renditions = update.renditions;
    const result = await TranscodeJobModel.findOneAndUpdate(
      { id: update.jobId },
      { $set: updatePayload },
      { new: true },
    );
    if (!result) throw new Error(`Transcode job ${update.jobId} was not found.`);
  }

  async markCompleted(jobId: string, outputMasterPlaylist: string): Promise<void> {
    this.assertDatabase();
    const result = await TranscodeJobModel.findOneAndUpdate(
      { id: jobId },
      {
        $set: {
          status: 'COMPLETED',
          progressPercentage: 100,
          outputMasterPlaylist,
          activeLockKey: null, // Release active lock on completion
          lockedBy: null,
          leaseExpiresAt: null,
          completedAt: new Date().toISOString(),
          updatedAt: new Date(),
        }
      },
      { new: true },
    );
    if (!result) throw new Error(`Transcode job ${jobId} was not found.`);
  }

  /**
   * Mark Failed with Progressive Exponential Backoff
   */
  async markFailed(
    jobId: string,
    errorMessage: string,
    baseDelayMs = 2000
  ): Promise<{ retried: boolean; attempts: number; nextEligibleAt?: Date }> {
    this.assertDatabase();
    const job = await TranscodeJobModel.findOne({ id: jobId });
    if (!job) throw new Error(`Transcode job ${jobId} was not found.`);

    const attempts = (job.attempts || 0) + 1;
    const maxAttempts = job.maxAttempts || 3;
    const retried = attempts < maxAttempts;

    if (retried) {
      // Exponential backoff: baseDelay * 2^(attempts-1) clamped to 60s
      const delayMs = Math.min(60000, baseDelayMs * Math.pow(2, attempts - 1));
      const nextEligibleAt = new Date(Date.now() + delayMs);

      await TranscodeJobModel.findOneAndUpdate(
        { id: jobId },
        {
          $set: {
            status: 'QUEUED',
            attempts,
            errorMessage,
            nextEligibleAt,
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            updatedAt: new Date(),
          }
        },
      );
      return { retried, attempts, nextEligibleAt };
    } else {
      await TranscodeJobModel.findOneAndUpdate(
        { id: jobId },
        {
          $set: {
            status: 'FAILED',
            attempts,
            errorMessage,
            activeLockKey: null, // Release active lock so future jobs can be queued
            lockedBy: null,
            leaseExpiresAt: null,
            completedAt: new Date().toISOString(),
            updatedAt: new Date(),
          }
        },
      );
      return { retried, attempts };
    }
  }

  /**
   * Recover Stalled Jobs: Finds jobs whose leases expired or worker timed out.
   */
  async recoverStalledJobs(stalledThresholdMs = 5 * 60 * 1000): Promise<number> {
    this.assertDatabase();
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - stalledThresholdMs);

    const stalledJobs = await TranscodeJobModel.find({
      status: 'PROCESSING',
      $or: [
        { leaseExpiresAt: { $lt: now } },
        { updatedAt: { $lt: cutoffTime } },
      ],
    });

    for (const job of stalledJobs) {
      await this.markFailed(job.id, 'Worker lease expired or worker crashed unexpectedly.');
    }
    return stalledJobs.length;
  }

  async getJob(jobId: string): Promise<any> {
    this.assertDatabase();
    return TranscodeJobModel.findOne({ id: jobId });
  }

  async listJobsByCourse(courseId: string): Promise<any[]> {
    this.assertDatabase();
    return TranscodeJobModel.find({ courseId }).sort({ createdAt: -1 });
  }

  async close(): Promise<void> {
    this.isShuttingDown = true;
  }
}

export const jobQueue = new PersistentTranscodeQueue();
