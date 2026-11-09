import { spawnSync } from 'child_process';
import { TranscodeJobModel } from '../models';
import { connectionState } from '../data/mongoConnection';
import { jobQueue } from '../queue/jobQueue';

export interface TranscodeJob {
  id: string;
  courseId: string;
  lessonId: string;
  sourceUrl: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progressPercentage: number;
  outputMasterPlaylist?: string;
  renditions: Array<{
    resolution: '1080p' | '720p' | '480p' | '360p';
    bitrateKbps: number;
    playlistUrl: string;
  }>;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TranscodingTelemetry {
  configured: boolean;
  mode: 'MONGODB_PERSISTENT_WORKER' | 'UNAVAILABLE';
  totalJobsQueued: number;
  details: string;
  isReady: boolean;
  ffmpegAvailable: boolean;
}

export class VideoTranscodingService {
  getReadiness(): { isReady: boolean; status: 'ONLINE' | 'DEGRADED'; reason?: string } {
    if (!connectionState.isConnected) {
      return { isReady: false, status: 'DEGRADED', reason: 'MongoDB-backed transcode queue is unavailable.' };
    }
    if (!this.isFfmpegAvailable()) {
      return { isReady: false, status: 'DEGRADED', reason: 'FFmpeg is unavailable; transcoding is disabled.' };
    }
    return { isReady: true, status: 'ONLINE' };
  }

  public isFfmpegAvailable(): boolean {
    try {
      return spawnSync('ffmpeg', ['-version'], { timeout: 2000 }).status === 0;
    } catch {
      return false;
    }
  }

  private validateSourceUrl(sourceUrl: string): void {
    let url: URL;
    try {
      url = new URL(sourceUrl);
    } catch {
      throw new Error('Transcode source URL is invalid.');
    }

    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('Transcode source must be a credential-free HTTPS URL.');
    }

    const configuredHosts = [process.env.R2_ENDPOINT, process.env.S3_ENDPOINT, process.env.R2_PUBLIC_DOMAIN]
      .filter((host): host is string => Boolean(host))
      .map(host => {
        try {
          return new URL(host).hostname.toLowerCase();
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    if (!configuredHosts.includes(url.hostname.toLowerCase())) {
      throw new Error('Transcode source host is not an approved object-storage host.');
    }
  }

  async enqueueTranscodeJob(
    courseId: string,
    lessonId: string,
    sourceUrl: string,
    tenantId?: string | null,
  ): Promise<TranscodeJob> {
    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required to persist transcoding jobs.');
    }
    if (!this.isFfmpegAvailable()) {
      throw new Error('FFmpeg is unavailable; transcoding job was not accepted.');
    }
    this.validateSourceUrl(sourceUrl);
    return await jobQueue.enqueueTranscodeJob({ courseId, lessonId, sourceUrl, tenantId }) as TranscodeJob;
  }

  async getJobStatus(jobId: string): Promise<TranscodeJob | null> {
    return await jobQueue.getJob(jobId) as TranscodeJob | null;
  }

  async getPersistentJobStatus(jobId: string): Promise<TranscodeJob | null> {
    if (!connectionState.isConnected) throw new Error('MongoDB is required to retrieve transcoding jobs.');
    return await TranscodeJobModel.findOne({ id: jobId }) as TranscodeJob | null;
  }

  async listJobsByCourse(courseId: string): Promise<TranscodeJob[]> {
    return await jobQueue.listJobsByCourse(courseId) as TranscodeJob[];
  }

  generateHlsMasterManifest(courseId: string, lessonId: string): string {
    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-STREAM-INF:BANDWIDTH=4500000,AVERAGE-BANDWIDTH=4000000,RESOLUTION=1920x1080,FRAME-RATE=30.000,CODECS="avc1.640028,mp4a.40.2"
1080p/1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2200000,AVERAGE-BANDWIDTH=2000000,RESOLUTION=1280x720,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"
720p/720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,AVERAGE-BANDWIDTH=750000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401e,mp4a.40.2"
480p/480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=400000,AVERAGE-BANDWIDTH=350000,RESOLUTION=640x360,FRAME-RATE=24.000,CODECS="avc1.42e01e,mp4a.40.2"
360p/360p.m3u8
`;
  }

  async getTelemetry(): Promise<TranscodingTelemetry> {
    const readiness = this.getReadiness();
    const ffmpegAvailable = this.isFfmpegAvailable();
    const configured = readiness.isReady;
    const totalJobsQueued = connectionState.isConnected
      ? await TranscodeJobModel.countDocuments({ status: 'QUEUED' })
      : 0;
    return {
      configured,
      mode: configured ? 'MONGODB_PERSISTENT_WORKER' : 'UNAVAILABLE',
      totalJobsQueued,
      details: !connectionState.isConnected
        ? 'MongoDB-backed transcode queue is unavailable.'
        : !ffmpegAvailable
          ? 'FFmpeg is unavailable; transcoding is disabled.'
          : 'Jobs are persisted in MongoDB and processed by the transcode worker.',
      isReady: configured,
      ffmpegAvailable,
    };
  }
}

export const transcodingService = new VideoTranscodingService();
