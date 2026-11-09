"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobQueue = exports.PersistentTranscodeQueue = void 0;
const uuid_1 = require("uuid");
const models_1 = require("../models");
const mongoConnection_1 = require("../data/mongoConnection");
class PersistentTranscodeQueue {
    isShuttingDown = false;
    assertDatabase() {
        if (!mongoConnection_1.connectionState.isConnected) {
            throw new Error('MongoDB is required for persistent transcoding jobs.');
        }
    }
    async enqueueTranscodeJob(options) {
        this.assertDatabase();
        if (this.isShuttingDown)
            throw new Error('Service is shutting down. New jobs cannot be accepted.');
        const { courseId, lessonId, sourceUrl, tenantId } = options;
        const existing = await models_1.TranscodeJobModel.findOne({
            courseId,
            lessonId,
            status: { $in: ['QUEUED', 'PROCESSING'] },
        });
        if (existing)
            return existing;
        const jobId = `job-transcode-${(0, uuid_1.v4)().slice(0, 8)}`;
        const renditions = [
            { resolution: '1080p', bitrateKbps: 4500, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/1080p.m3u8` },
            { resolution: '720p', bitrateKbps: 2200, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/720p.m3u8` },
            { resolution: '480p', bitrateKbps: 800, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/480p.m3u8` },
            { resolution: '360p', bitrateKbps: 400, playlistUrl: `https://stream.edusphere.io/hls/${courseId}/${lessonId}/360p.m3u8` },
        ];
        const outputMasterPlaylist = `https://stream.edusphere.io/hls/${courseId}/${lessonId}/master.m3u8`;
        return models_1.TranscodeJobModel.create({
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
    async updateProgress(update) {
        this.assertDatabase();
        const updatePayload = {
            progressPercentage: update.progressPercentage,
            status: 'PROCESSING',
            updatedAt: new Date(),
        };
        if (update.renditions)
            updatePayload.renditions = update.renditions;
        const result = await models_1.TranscodeJobModel.findOneAndUpdate({ id: update.jobId }, { $set: updatePayload }, { new: true });
        if (!result)
            throw new Error(`Transcode job ${update.jobId} was not found.`);
    }
    async markCompleted(jobId, outputMasterPlaylist) {
        this.assertDatabase();
        const result = await models_1.TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: {
                status: 'COMPLETED',
                progressPercentage: 100,
                outputMasterPlaylist,
                completedAt: new Date().toISOString(),
                updatedAt: new Date(),
            } }, { new: true });
        if (!result)
            throw new Error(`Transcode job ${jobId} was not found.`);
    }
    async markFailed(jobId, errorMessage) {
        this.assertDatabase();
        const job = await models_1.TranscodeJobModel.findOne({ id: jobId });
        if (!job)
            throw new Error(`Transcode job ${jobId} was not found.`);
        const attempts = (job.attempts || 0) + 1;
        const retried = attempts < 3;
        await models_1.TranscodeJobModel.findOneAndUpdate({ id: jobId }, { $set: {
                status: retried ? 'QUEUED' : 'FAILED',
                attempts,
                errorMessage,
                ...(retried ? {} : { completedAt: new Date().toISOString() }),
                updatedAt: new Date(),
            } });
        return { retried, attempts };
    }
    async recoverStalledJobs(stalledThresholdMs = 5 * 60 * 1000) {
        this.assertDatabase();
        const cutoffTime = new Date(Date.now() - stalledThresholdMs);
        const stalledJobs = await models_1.TranscodeJobModel.find({
            status: 'PROCESSING',
            updatedAt: { $lt: cutoffTime },
        });
        for (const job of stalledJobs)
            await this.markFailed(job.id, 'Worker stalled or terminated unexpectedly.');
        return stalledJobs.length;
    }
    async getJob(jobId) {
        this.assertDatabase();
        return models_1.TranscodeJobModel.findOne({ id: jobId });
    }
    async listJobsByCourse(courseId) {
        this.assertDatabase();
        return models_1.TranscodeJobModel.find({ courseId }).sort({ createdAt: -1 });
    }
    async close() {
        this.isShuttingDown = true;
    }
}
exports.PersistentTranscodeQueue = PersistentTranscodeQueue;
exports.jobQueue = new PersistentTranscodeQueue();
