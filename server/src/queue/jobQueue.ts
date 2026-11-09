import { v4 as uuidv4 } from 'uuid';
import { TranscodeJobModel } from '../models';
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

export class PersistentTranscodeQueue {
  private isShuttingDown = false;

  private assertDatabase(): void {
    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required for persistent transcoding jobs.');
    }
  }

  async enqueueTranscodeJob(options: EnqueueJobOptions): Promise<any> {
    this.assertDatabase();
    if (this.isShuttingDown) throw new Error('Service is shutting down. New jobs cannot be accepted.');

    const { courseId, lessonId, sourceUrl, tenantId } = options;
    const existing = await TranscodeJobModel.findOne({
      courseId,
      lessonId,
      status: { $in: ['QUEUED', 'PROCESSING'] },
    });
    if (existing) return existing;

    const jobId = `job-transcode-${uuidv4().slice(0, 8)}`;
    const renditions = [
      { resolution: '1080p', bitrateKbps: 4500, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/1080p.m3u8` },
      { resolution: '720p', bitrateKbps: 2200, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/720p.m3u8` },
      { resolution: '480p', bitrateKbps: 800, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/480p.m3u8` },
      { resolution: '360p', bitrateKbps: 400, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/360p.m3u8` },
    ];
    const outputMasterPlaylist = `https://stream.edusphere.io/hls/${courseId}/${lessonId}/master.m3u8`;

    return TranscodeJobModel.create({
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
    });
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
      { $set: {
        status: 'COMPLETED',
        progressPercentage: 100,
        outputMasterPlaylist,
        completedAt: new Date().toISOString(),
        updatedAt: new Date(),
      } },
      { new: true },
    );
    if (!result) throw new Error(`Transcode job ${jobId} was not found.`);
  }

  async markFailed(jobId: string, errorMessage: string): Promise<{ retried: boolean; attempts: number }> {
    this.assertDatabase();
    const job = await TranscodeJobModel.findOne({ id: jobId });
    if (!job) throw new Error(`Transcode job ${jobId} was not found.`);

    const attempts = (job.attempts || 0) + 1;
    const retried = attempts < 3;
    await TranscodeJobModel.findOneAndUpdate(
      { id: jobId },
      { $set: {
        status: retried ? 'QUEUED' : 'FAILED',
        attempts,
        errorMessage,
        ...(retried ? {} : { completedAt: new Date().toISOString() }),
        updatedAt: new Date(),
      } },
    );
    return { retried, attempts };
  }

  async recoverStalledJobs(stalledThresholdMs = 5 * 60 * 1000): Promise<number> {
    this.assertDatabase();
    const cutoffTime = new Date(Date.now() - stalledThresholdMs);
    const stalledJobs = await TranscodeJobModel.find({
      status: 'PROCESSING',
      updatedAt: { $lt: cutoffTime },
    });
    for (const job of stalledJobs) await this.markFailed(job.id, 'Worker stalled or terminated unexpectedly.');
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
