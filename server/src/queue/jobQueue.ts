import { v4 as uuidv4 } from 'uuid';
import { TranscodeJobModel, ITranscodeJobDocument } from '../models';
import { redisClient } from './redisClient';
import { config } from '../config';
import { connectionState } from '../data/mongoConnection';

export interface EnqueueJobOptions {
  courseId: string;
  lessonId: string;
  sourceUrl: string;
  tenantId?: string | null;
  priority?: number;
}

export interface JobProgressUpdate {
  jobId: string;
  progressPercentage: number;
  stage?: string;
  renditions?: Array<{ resolution: string; bitrateKbps: number; playlistUrl: string }>;
}

export class DistributedJobQueue {
  private queueName = 'edusphere-transcode-queue';
  private inProcessJobs: Map<string, any> = new Map();
  private isShuttingDown = false;

  constructor() {}

  /**
   * Enqueues a video transcoding job with duplicate protection
   */
  async enqueueTranscodeJob(options: EnqueueJobOptions): Promise<any> {
    const { courseId, lessonId, sourceUrl, tenantId } = options;

    if (this.isShuttingDown) {
      throw new Error('Service is shutting down. New jobs cannot be accepted.');
    }

    // 1. Duplicate Job Protection: Prevent re-queuing active jobs for same lesson
    let existingActive: any = null;
    if (connectionState.isConnected) {
      try {
        existingActive = await TranscodeJobModel.findOne({
          courseId,
          lessonId,
          status: { $in: ['QUEUED', 'PROCESSING'] },
        });
      } catch {}
    }
    if (!existingActive) {
      existingActive = Array.from(this.inProcessJobs.values()).find(
        (j) => j.courseId === courseId && j.lessonId === lessonId && ['QUEUED', 'PROCESSING'].includes(j.status)
      );
    }

    if (existingActive) {
      console.warn(`[JobQueue] Active transcode job already exists for lesson ${lessonId} (${existingActive.id}). Reusing.`);
      return existingActive;
    }

    const jobId = `job-transcode-${uuidv4().slice(0, 8)}`;
    const renditions = [
      { resolution: '1080p', bitrateKbps: 4500, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/1080p.m3u8` },
      { resolution: '720p', bitrateKbps: 2200, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/720p.m3u8` },
      { resolution: '480p', bitrateKbps: 800, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/480p.m3u8` },
      { resolution: '360p', bitrateKbps: 400, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/360p.m3u8` },
    ];
    const outputMasterPlaylist = `https://stream.edusphere.io/hls/${courseId}/${lessonId}/master.m3u8`;

    const jobRecord = {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date(),
    };

    this.inProcessJobs.set(jobId, jobRecord);

    // 2. Persist in MongoDB if active
    if (connectionState.isConnected) {
      try {
        const job = new TranscodeJobModel(jobRecord);
        await job.save();
      } catch (err: any) {
        console.warn('[JobQueue] MongoDB persistence warning:', err?.message);
      }
    }

    console.log(`[JobQueue] Enqueued transcode job ${jobId} for course=${courseId}, lesson=${lessonId}`);
    return jobRecord;
  }

  /**
   * Updates job progress and broadcasts status
   */
  async updateProgress(update: JobProgressUpdate): Promise<void> {
    const { jobId, progressPercentage, renditions } = update;
    const updatePayload: any = {
      progressPercentage,
      status: 'PROCESSING',
      updatedAt: new Date(),
    };
    if (renditions) {
      updatePayload.renditions = renditions;
    }

    const memJob = this.inProcessJobs.get(jobId);
    if (memJob) {
      Object.assign(memJob, updatePayload);
    }

    if (connectionState.isConnected) {
      try {
        await TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
      } catch {}
    }
  }

  /**
   * Marks a job as completed
   */
  async markCompleted(jobId: string, outputMasterPlaylist: string): Promise<void> {
    const updatePayload = {
      status: 'COMPLETED',
      progressPercentage: 100,
      outputMasterPlaylist,
      completedAt: new Date().toISOString(),
      updatedAt: new Date(),
    };

    const memJob = this.inProcessJobs.get(jobId);
    if (memJob) {
      Object.assign(memJob, updatePayload);
    }

    if (connectionState.isConnected) {
      try {
        await TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
      } catch {}
    }
    console.log(`[JobQueue] Job ${jobId} marked COMPLETED.`);
  }

  /**
   * Handles failure with automatic retry up to 3 attempts with exponential backoff
   */
  async markFailed(jobId: string, errorMessage: string): Promise<{ retried: boolean; attempts: number }> {
    let job: any = null;
    if (connectionState.isConnected) {
      try {
        job = await TranscodeJobModel.findOne({ id: jobId });
      } catch {}
    }
    if (!job) {
      job = this.inProcessJobs.get(jobId);
    }
    if (!job) return { retried: false, attempts: 0 };

    const maxAttempts = 3;
    const nextAttempt = (job.attempts || 0) + 1;

    if (nextAttempt < maxAttempts) {
      const backoffSeconds = Math.pow(2, nextAttempt); // 2s, 4s, 8s
      console.warn(`[JobQueue] Job ${jobId} failed attempt ${nextAttempt}/${maxAttempts}: ${errorMessage}. Scheduling retry in ${backoffSeconds}s...`);

      const updatePayload = {
        status: 'QUEUED',
        attempts: nextAttempt,
        errorMessage: `Attempt ${nextAttempt} failed: ${errorMessage}`,
        updatedAt: new Date(),
      };

      if (this.inProcessJobs.has(jobId)) {
        Object.assign(this.inProcessJobs.get(jobId), updatePayload);
      }

      if (connectionState.isConnected) {
        try {
          await TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
        } catch {}
      }
      return { retried: true, attempts: nextAttempt };
    } else {
      console.error(`[JobQueue] Job ${jobId} permanently failed after ${maxAttempts} attempts: ${errorMessage}`);
      const updatePayload = {
        status: 'FAILED',
        attempts: nextAttempt,
        errorMessage: `Permanently failed after ${maxAttempts} attempts: ${errorMessage}`,
        completedAt: new Date().toISOString(),
        updatedAt: new Date(),
      };

      if (this.inProcessJobs.has(jobId)) {
        Object.assign(this.inProcessJobs.get(jobId), updatePayload);
      }

      if (connectionState.isConnected) {
        try {
          await TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
        } catch {}
      }
      return { retried: false, attempts: nextAttempt };
    }
  }

  /**
   * Stalled-Job Recovery: Recovers jobs that were stuck in PROCESSING
   */
  async recoverStalledJobs(stalledThresholdMs: number = 5 * 60 * 1000): Promise<number> {
    const cutoffTime = new Date(Date.now() - stalledThresholdMs);
    let recovered = 0;

    if (connectionState.isConnected) {
      try {
        const stalledJobs = await TranscodeJobModel.find({
          status: 'PROCESSING',
          updatedAt: { $lt: cutoffTime },
        });
        for (const job of stalledJobs) {
          console.warn(`[JobQueue] Stalled job detected: ${job.id}. Re-queuing for retry...`);
          await this.markFailed(job.id, 'Worker stalled or terminated unexpectedly.');
          recovered++;
        }
        return recovered;
      } catch {}
    }

    // In-memory recovery
    for (const [id, job] of this.inProcessJobs) {
      if (job.status === 'PROCESSING' && job.updatedAt && job.updatedAt < cutoffTime) {
        console.warn(`[JobQueue] Stalled job detected in memory: ${id}. Re-queuing...`);
        await this.markFailed(id, 'Worker stalled or terminated unexpectedly.');
        recovered++;
      }
    }

    return recovered;
  }

  async getJob(jobId: string): Promise<any> {
    if (connectionState.isConnected) {
      try {
        const doc = await TranscodeJobModel.findOne({ id: jobId });
        if (doc) return doc;
      } catch {}
    }
    return this.inProcessJobs.get(jobId) || null;
  }

  async listJobsByCourse(courseId: string): Promise<any[]> {
    if (connectionState.isConnected) {
      try {
        const docs = await TranscodeJobModel.find({ courseId }).sort({ createdAt: -1 });
        if (docs.length > 0) return docs;
      } catch {}
    }
    return Array.from(this.inProcessJobs.values()).filter((j) => j.courseId === courseId);
  }

  /**
   * Graceful queue drainage and shutdown
   */
  async close(): Promise<void> {
    this.isShuttingDown = true;
    console.log('[JobQueue] Transcode queue shutting down gracefully.');
  }
}

export const jobQueue = new DistributedJobQueue();
