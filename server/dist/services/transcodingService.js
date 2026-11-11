"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcodingService = exports.VideoTranscodingService = void 0;
const child_process_1 = require("child_process");
const models_1 = require("../models");
const mongoConnection_1 = require("../data/mongoConnection");
const jobQueue_1 = require("../queue/jobQueue");
class VideoTranscodingService {
    getReadiness() {
        if (!mongoConnection_1.connectionState.isConnected) {
            return { isReady: false, status: 'DEGRADED', reason: 'MongoDB-backed transcode queue is unavailable.' };
        }
        return { isReady: true, status: 'ONLINE' };
    }
    isFfmpegAvailable() {
        try {
            return (0, child_process_1.spawnSync)('ffmpeg', ['-version'], { timeout: 2000 }).status === 0;
        }
        catch {
            return false;
        }
    }
    validateSourceUrl(sourceUrl) {
        let url;
        try {
            url = new URL(sourceUrl);
        }
        catch {
            throw new Error('Transcode source URL is invalid.');
        }
        if (url.protocol !== 'https:' || url.username || url.password) {
            throw new Error('Transcode source must be a credential-free HTTPS URL.');
        }
        const configuredHosts = [process.env.R2_ENDPOINT, process.env.S3_ENDPOINT, process.env.R2_PUBLIC_DOMAIN]
            .filter((host) => Boolean(host))
            .map(host => {
            try {
                return new URL(host).hostname.toLowerCase();
            }
            catch {
                return '';
            }
        })
            .filter(Boolean);
        if (!configuredHosts.includes(url.hostname.toLowerCase())) {
            throw new Error('Transcode source host is not an approved object-storage host.');
        }
    }
    async enqueueTranscodeJob(courseId, lessonId, sourceUrl, tenantId) {
        if (!mongoConnection_1.connectionState.isConnected) {
            throw new Error('MongoDB is required to persist transcoding jobs.');
        }
        this.validateSourceUrl(sourceUrl);
        return await jobQueue_1.jobQueue.enqueueTranscodeJob({ courseId, lessonId, sourceUrl, tenantId });
    }
    async getJobStatus(jobId) {
        return await jobQueue_1.jobQueue.getJob(jobId);
    }
    async getPersistentJobStatus(jobId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB is required to retrieve transcoding jobs.');
        return await models_1.TranscodeJobModel.findOne({ id: jobId });
    }
    async listJobsByCourse(courseId) {
        return await jobQueue_1.jobQueue.listJobsByCourse(courseId);
    }
    generateHlsMasterManifest(courseId, lessonId) {
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
    async getTelemetry() {
        const readiness = this.getReadiness();
        const ffmpegAvailable = this.isFfmpegAvailable();
        const configured = readiness.isReady;
        const totalJobsQueued = mongoConnection_1.connectionState.isConnected
            ? await models_1.TranscodeJobModel.countDocuments({ status: 'QUEUED' })
            : 0;
        return {
            configured,
            mode: configured ? 'MONGODB_PERSISTENT_QUEUE' : 'UNAVAILABLE',
            totalJobsQueued,
            details: !mongoConnection_1.connectionState.isConnected
                ? 'MongoDB-backed transcode queue is unavailable.'
                : 'Jobs are persisted in MongoDB FIFO queue and processed by the dedicated FFmpeg background worker.',
            isReady: configured,
            ffmpegAvailable,
        };
    }
}
exports.VideoTranscodingService = VideoTranscodingService;
exports.transcodingService = new VideoTranscodingService();
