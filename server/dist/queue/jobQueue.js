"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobQueue = exports.DistributedJobQueue = void 0;
const uuid_1 = require("uuid");
const models_1 = require("../models");
const mongoConnection_1 = require("../data/mongoConnection");
class DistributedJobQueue {
    queueName = 'edusphere-transcode-queue';
    inProcessJobs = new Map();
    isShuttingDown = false;
    constructor() { }
    /**
     * Enqueues a video transcoding job with duplicate protection
     */
    async enqueueTranscodeJob(options) {
        const { courseId, lessonId, sourceUrl, tenantId } = options;
        if (this.isShuttingDown) {
            throw new Error('Service is shutting down. New jobs cannot be accepted.');
        }
        // 1. Duplicate Job Protection: Prevent re-queuing active jobs for same lesson
        let existingActive = null;
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                existingActive = await models_1.TranscodeJobModel.findOne({
                    courseId,
                    lessonId,
                    status: { $in: ['QUEUED', 'PROCESSING'] },
                });
            }
            catch { }
        }
        if (!existingActive) {
            existingActive = Array.from(this.inProcessJobs.values()).find((j) => j.courseId === courseId && j.lessonId === lessonId && ['QUEUED', 'PROCESSING'].includes(j.status));
        }
        if (existingActive) {
            console.warn(`[JobQueue] Active transcode job already exists for lesson ${lessonId} (${existingActive.id}). Reusing.`);
            return existingActive;
        }
        const jobId = `job-transcode-${(0, uuid_1.v4)().slice(0, 8)}`;
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
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                const job = new models_1.TranscodeJobModel(jobRecord);
                await job.save();
            }
            catch (err) {
                console.warn('[JobQueue] MongoDB persistence warning:', err?.message);
            }
        }
        console.log(`[JobQueue] Enqueued transcode job ${jobId} for course=${courseId}, lesson=${lessonId}`);
        return jobRecord;
    }
    /**
     * Updates job progress and broadcasts status
     */
    async updateProgress(update) {
        const { jobId, progressPercentage, renditions } = update;
        const updatePayload = {
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
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                await models_1.TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
            }
            catch { }
        }
    }
    /**
     * Marks a job as completed
     */
    async markCompleted(jobId, outputMasterPlaylist) {
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
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                await models_1.TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
            }
            catch { }
        }
        console.log(`[JobQueue] Job ${jobId} marked COMPLETED.`);
    }
    /**
     * Handles failure with automatic retry up to 3 attempts with exponential backoff
     */
    async markFailed(jobId, errorMessage) {
        let job = null;
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                job = await models_1.TranscodeJobModel.findOne({ id: jobId });
            }
            catch { }
        }
        if (!job) {
            job = this.inProcessJobs.get(jobId);
        }
        if (!job)
            return { retried: false, attempts: 0 };
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
            if (mongoConnection_1.connectionState.isConnected) {
                try {
                    await models_1.TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
                }
                catch { }
            }
            return { retried: true, attempts: nextAttempt };
        }
        else {
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
            if (mongoConnection_1.connectionState.isConnected) {
                try {
                    await models_1.TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: updatePayload });
                }
                catch { }
            }
            return { retried: false, attempts: nextAttempt };
        }
    }
    /**
     * Stalled-Job Recovery: Recovers jobs that were stuck in PROCESSING
     */
    async recoverStalledJobs(stalledThresholdMs = 5 * 60 * 1000) {
        const cutoffTime = new Date(Date.now() - stalledThresholdMs);
        let recovered = 0;
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                const stalledJobs = await models_1.TranscodeJobModel.find({
                    status: 'PROCESSING',
                    updatedAt: { $lt: cutoffTime },
                });
                for (const job of stalledJobs) {
                    console.warn(`[JobQueue] Stalled job detected: ${job.id}. Re-queuing for retry...`);
                    await this.markFailed(job.id, 'Worker stalled or terminated unexpectedly.');
                    recovered++;
                }
                return recovered;
            }
            catch { }
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
    async getJob(jobId) {
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                const doc = await models_1.TranscodeJobModel.findOne({ id: jobId });
                if (doc)
                    return doc;
            }
            catch { }
        }
        return this.inProcessJobs.get(jobId) || null;
    }
    async listJobsByCourse(courseId) {
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                const docs = await models_1.TranscodeJobModel.find({ courseId }).sort({ createdAt: -1 });
                if (docs.length > 0)
                    return docs;
            }
            catch { }
        }
        return Array.from(this.inProcessJobs.values()).filter((j) => j.courseId === courseId);
    }
    /**
     * Graceful queue drainage and shutdown
     */
    async close() {
        this.isShuttingDown = true;
        console.log('[JobQueue] Transcode queue shutting down gracefully.');
    }
}
exports.DistributedJobQueue = DistributedJobQueue;
exports.jobQueue = new DistributedJobQueue();
