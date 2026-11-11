"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcodeWorker = exports.TranscodeWorker = exports.RENDITIONS = void 0;
exports.generateHlsEncryptionKeyInfo = generateHlsEncryptionKeyInfo;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
const mongoConnection_1 = require("../data/mongoConnection");
const jobQueue_1 = require("../queue/jobQueue");
const storageService_1 = require("../services/storageService");
const models_1 = require("../models");
const config_1 = require("../config");
exports.RENDITIONS = [
    { resolution: '1080p', width: 1920, height: 1080, videoBitrate: '4500k', audioBitrate: '128k', bandwidth: 4800000 },
    { resolution: '720p', width: 1280, height: 720, videoBitrate: '2200k', audioBitrate: '128k', bandwidth: 2400000 },
    { resolution: '480p', width: 854, height: 480, videoBitrate: '800k', audioBitrate: '96k', bandwidth: 920000 },
    { resolution: '360p', width: 640, height: 360, videoBitrate: '400k', audioBitrate: '64k', bandwidth: 480000 },
];
/**
 * Generates AES-128 Encryption Key & Info File for FFmpeg HLS DRM Protection
 */
async function generateHlsEncryptionKeyInfo(courseId, lessonId, outputDir) {
    const targetDir = outputDir || path_1.default.join(os_1.default.tmpdir(), 'edusphere-drm', `${courseId}-${lessonId}`);
    if (!fs_1.default.existsSync(targetDir)) {
        fs_1.default.mkdirSync(targetDir, { recursive: true });
    }
    const rawKey = crypto_1.default.randomBytes(16); // 128-bit key
    const iv = crypto_1.default.randomBytes(16); // 128-bit IV
    const keyPath = path_1.default.join(targetDir, 'enc.key');
    fs_1.default.writeFileSync(keyPath, rawKey);
    const apiBase = config_1.config.apiBaseUrl;
    const keyUri = `${apiBase}/api/media/hls-key/${courseId}/${lessonId}`;
    const keyInfoPath = path_1.default.join(targetDir, 'key_info.txt');
    const keyInfoContent = `${keyUri}\n${keyPath}\n${iv.toString('hex')}\n`;
    fs_1.default.writeFileSync(keyInfoPath, keyInfoContent);
    const keyHex = rawKey.toString('hex');
    const ivHex = iv.toString('hex');
    if (mongoConnection_1.connectionState.isConnected) {
        try {
            await models_1.DrmKeyModel.findOneAndUpdate({ courseId, lessonId }, { $set: { keyHex, ivHex, keyUri, createdAt: new Date().toISOString() } }, { upsert: true });
        }
        catch (e) {
            console.warn('[Worker] DRM key store notice:', e.message);
        }
    }
    return {
        keyUri,
        keyInfoFilePath: keyInfoPath,
        keyInfoPath,
        keyFilePath: keyPath,
        keyPath,
        keyHex,
        ivHex,
        keyBytes: rawKey,
    };
}
class TranscodeWorker {
    isRunning = false;
    activeJobsCount = 0;
    workerId;
    constructor() {
        this.workerId = `worker-${(0, uuid_1.v4)().slice(0, 8)}`;
    }
    isFfmpegAvailable() {
        try {
            const probe = (0, child_process_1.spawnSync)('ffmpeg', ['-version'], { timeout: 2000 });
            return probe.status === 0;
        }
        catch {
            return false;
        }
    }
    isFfprobeAvailable() {
        try {
            const probe = (0, child_process_1.spawnSync)('ffprobe', ['-version'], { timeout: 2000 });
            return probe.status === 0;
        }
        catch {
            return false;
        }
    }
    async generateHlsEncryptionKeyInfo(tempDir, courseId, lessonId) {
        return generateHlsEncryptionKeyInfo(courseId, lessonId, tempDir);
    }
    /**
     * Main Worker Execution Loop
     */
    async start() {
        console.log('===============================================================');
        console.log('🎥 EDUSPHERE DEDICATED FFMPEG & HLS TRANSCODING WORKER');
        console.log('===============================================================');
        // 1. Verify Database
        await (0, mongoConnection_1.connectMongoDB)();
        // Verify FFmpeg before accepting persistent MongoDB jobs.
        const hasFfmpeg = this.isFfmpegAvailable();
        const hasFfprobe = this.isFfprobeAvailable();
        console.log(`[Worker] FFmpeg Detected: ${hasFfmpeg ? 'YES' : 'NO'}`);
        console.log(`[Worker] FFprobe Detected: ${hasFfprobe ? 'YES' : 'NO'}`);
        if (!hasFfmpeg) {
            console.error('[FATAL] FFmpeg binary not found on system PATH. Halting worker.');
            process.exit(1);
        }
        // Recover any stalled/interrupted jobs from previous worker crashes or restarts
        const recoveredCount = await jobQueue_1.jobQueue.recoverStalledJobs();
        if (recoveredCount > 0) {
            console.log(`[Worker] Recovered ${recoveredCount} stalled/interrupted jobs from previous worker session.`);
        }
        this.isRunning = true;
        console.log('[Worker] Worker loop initialized. Polling for transcode jobs...');
        this.pollQueue();
    }
    async pollQueue() {
        while (this.isRunning) {
            try {
                // Atomic claim: Claims next eligible QUEUED job (respecting exponential backoff and lease)
                const job = await jobQueue_1.jobQueue.claimNextJob(this.workerId, 120000);
                if (job) {
                    this.activeJobsCount++;
                    await this.processJob(job);
                    this.activeJobsCount--;
                }
                else {
                    // No eligible job in queue; sleep 2 seconds
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }
            catch (err) {
                console.error('[Worker Loop Error]', err?.message);
                await new Promise((r) => setTimeout(r, 3000));
            }
        }
    }
    /**
     * Processes a single transcoding job: Download -> Transcode HLS -> Upload R2 -> Cleanup
     */
    async processJob(job) {
        const jobId = job.id;
        const tempDir = path_1.default.join(os_1.default.tmpdir(), 'edusphere-transcode', jobId);
        console.log(`[Worker] Processing Job ${jobId} (Course: ${job.courseId}, Lesson: ${job.lessonId})`);
        // Worker Heartbeat: Keep renewing lease every 20s while this worker is actively processing
        const heartbeat = setInterval(() => {
            jobQueue_1.jobQueue.renewLease(jobId, this.workerId, 120000).catch((err) => {
                console.warn(`[Worker Heartbeat Warning for ${jobId}]`, err?.message);
            });
        }, 20000);
        try {
            // 1. Create clean workspace
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            const inputFilePath = path_1.default.join(tempDir, 'source.mp4');
            // 2. Obtain Source Video
            await jobQueue_1.jobQueue.updateProgress({ jobId, progressPercentage: 15, stage: 'DOWNLOADING_SOURCE' });
            const sourceUrl = this.validateSourceUrl(job.sourceUrl);
            const sourceResponse = await fetch(sourceUrl, { redirect: 'error' });
            if (!sourceResponse.ok || !sourceResponse.body) {
                throw new Error(`Source download failed with HTTP ${sourceResponse.status}`);
            }
            const contentLength = Number(sourceResponse.headers.get('content-length'));
            if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > 1024 * 1024 * 1024) {
                throw new Error('Video source must declare a positive size no larger than 1 GiB.');
            }
            if (!sourceResponse.headers.get('content-type')?.toLowerCase().startsWith('video/')) {
                throw new Error('Transcode source did not return a video content type.');
            }
            const reader = sourceResponse.body.getReader();
            const sourceFile = await fs_1.default.promises.open(inputFilePath, 'wx');
            let downloadedBytes = 0;
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    downloadedBytes += value.byteLength;
                    if (downloadedBytes > contentLength || downloadedBytes > 1024 * 1024 * 1024) {
                        await reader.cancel();
                        throw new Error('Video source exceeded its declared or maximum allowed size.');
                    }
                    await sourceFile.write(value);
                }
            }
            finally {
                await sourceFile.close();
            }
            if (downloadedBytes !== contentLength) {
                throw new Error('Downloaded video size did not match its declared content length.');
            }
            await jobQueue_1.jobQueue.updateProgress({ jobId, progressPercentage: 30, stage: 'TRANSCODING_HLS' });
            // 3. Generate AES-128 DRM Key Info for Stream Protection
            const drmKeyInfo = await this.generateHlsEncryptionKeyInfo(tempDir, job.courseId, job.lessonId);
            // 4. Execute FFmpeg if binary is present
            const hasFfmpeg = this.isFfmpegAvailable();
            const outputMasterPlaylistKey = `hls/${job.courseId}/${job.lessonId}/master.m3u8`;
            await this.executeFfmpegTranscode(inputFilePath, tempDir, job, drmKeyInfo);
            await jobQueue_1.jobQueue.updateProgress({ jobId, progressPercentage: 80, stage: 'UPLOADING_TO_R2' });
            // 4. Upload generated HLS files to Cloudflare R2
            const uploadedMasterUrl = await this.uploadHlsToR2(tempDir, job.courseId, job.lessonId);
            // 5. Complete Job
            await jobQueue_1.jobQueue.markCompleted(jobId, uploadedMasterUrl);
            console.log(`[Worker] Job ${jobId} successfully completed and uploaded to R2.`);
        }
        catch (err) {
            console.error(`[Worker] Transcode Job ${jobId} failed:`, err.message);
            await jobQueue_1.jobQueue.markFailed(jobId, err.message);
        }
        finally {
            clearInterval(heartbeat);
            // 6. Mandatory Cleanup: remove temporary video files to prevent disk leak
            try {
                if (fs_1.default.existsSync(tempDir)) {
                    fs_1.default.rmSync(tempDir, { recursive: true, force: true });
                }
            }
            catch (cleanupErr) {
                console.warn(`[Worker] Temp directory cleanup warning:`, cleanupErr?.message);
            }
        }
    }
    validateSourceUrl(source) {
        const url = new URL(source);
        if (url.protocol !== 'https:' || url.username || url.password) {
            throw new Error('Transcode source must be a credential-free HTTPS URL.');
        }
        const allowedHosts = [process.env.R2_ENDPOINT, process.env.S3_ENDPOINT, process.env.R2_PUBLIC_DOMAIN]
            .filter((value) => Boolean(value))
            .map(value => new URL(value).hostname.toLowerCase());
        if (!allowedHosts.includes(url.hostname.toLowerCase())) {
            throw new Error('Transcode source host is not an approved object-storage host.');
        }
        return url;
    }
    /**
     * Executes genuine FFmpeg to produce multi-bitrate HLS playlists and .ts chunks
     */
    async executeFfmpegTranscode(inputFile, outputDir, job, drmKeyInfo) {
        for (const rendition of exports.RENDITIONS) {
            const renditionDir = path_1.default.join(outputDir, rendition.resolution);
            if (!fs_1.default.existsSync(renditionDir)) {
                fs_1.default.mkdirSync(renditionDir, { recursive: true });
            }
            const playlistPath = path_1.default.join(renditionDir, `${rendition.resolution}.m3u8`);
            const segmentPattern = path_1.default.join(renditionDir, `${rendition.resolution}_%03d.ts`);
            const ffmpegArgs = [
                '-i', inputFile,
                '-vf', `scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease`,
                '-c:a', 'aac',
                '-ar', '48000',
                '-b:a', rendition.audioBitrate,
                '-c:v', 'h264',
                '-profile:v', 'main',
                '-crf', '20',
                '-sc_threshold', '0',
                '-g', '48',
                '-keyint_min', '48',
                '-hls_time', '4',
                '-hls_playlist_type', 'vod',
            ];
            // Inject AES-128 DRM Key Info File if provided
            if (drmKeyInfo) {
                ffmpegArgs.push('-hls_key_info_file', drmKeyInfo.keyInfoFilePath);
            }
            ffmpegArgs.push('-b:v', rendition.videoBitrate, '-maxrate', rendition.videoBitrate, '-bufsize', `${parseInt(rendition.videoBitrate) * 2}k`, '-hls_segment_filename', segmentPattern, playlistPath);
            await new Promise((resolve, reject) => {
                const proc = (0, child_process_1.spawn)('ffmpeg', ffmpegArgs);
                proc.on('close', (code) => {
                    if (code === 0)
                        resolve();
                    else
                        reject(new Error(`FFmpeg exited with non-zero code ${code} for rendition ${rendition.resolution}`));
                });
                proc.on('error', (err) => reject(err));
            });
        }
        // Generate Master Playlist
        const masterPlaylistContent = this.generateMasterPlaylist(exports.RENDITIONS);
        fs_1.default.writeFileSync(path_1.default.join(outputDir, 'master.m3u8'), masterPlaylistContent);
    }
    generateMasterPlaylist(renditions) {
        const list = renditions && Array.isArray(renditions) ? renditions : exports.RENDITIONS;
        let manifest = '#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-INDEPENDENT-SEGMENTS\n\n';
        for (const r of list) {
            manifest += `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},AVERAGE-BANDWIDTH=${Math.round(r.bandwidth * 0.9)},RESOLUTION=${r.width}x${r.height},CODECS="avc1.4d401f,mp4a.40.2"\n`;
            manifest += `${r.resolution}/${r.resolution}.m3u8\n\n`;
        }
        return manifest;
    }
    /**
     * Uploads all generated HLS segments and manifests to R2
     */
    async uploadHlsToR2(tempDir, courseId, lessonId) {
        const baseKey = `hls/${courseId}/${lessonId}`;
        // Upload master playlist
        const masterPath = path_1.default.join(tempDir, 'master.m3u8');
        if (fs_1.default.existsSync(masterPath)) {
            const masterBuffer = fs_1.default.readFileSync(masterPath);
            await storageService_1.storageService.uploadBuffer(`${baseKey}/master.m3u8`, masterBuffer, 'application/vnd.apple.mpegurl');
        }
        // Upload renditions
        for (const r of exports.RENDITIONS) {
            const rDir = path_1.default.join(tempDir, r.resolution);
            if (fs_1.default.existsSync(rDir)) {
                const files = fs_1.default.readdirSync(rDir);
                for (const file of files) {
                    const filePath = path_1.default.join(rDir, file);
                    const fileBuf = fs_1.default.readFileSync(filePath);
                    const contentType = file.endsWith('.m3u8')
                        ? 'application/vnd.apple.mpegurl'
                        : 'video/mp2t';
                    await storageService_1.storageService.uploadBuffer(`${baseKey}/${r.resolution}/${file}`, fileBuf, contentType);
                }
            }
        }
        return `${config_1.config.storagePublicUrl}/${baseKey}/master.m3u8`;
    }
    /**
     * Graceful Worker Shutdown
     */
    async stop() {
        console.log('[Worker] Graceful shutdown initiated. Waiting for active jobs...');
        this.isRunning = false;
        let waitCount = 0;
        while (this.activeJobsCount > 0 && waitCount < 30) {
            await new Promise((r) => setTimeout(r, 1000));
            waitCount++;
        }
        await jobQueue_1.jobQueue.close();
        await (0, mongoConnection_1.disconnectMongoDB)();
        console.log('[Worker] Worker terminated cleanly.');
    }
}
exports.TranscodeWorker = TranscodeWorker;
exports.transcodeWorker = new TranscodeWorker();
// Standalone CLI execution entrypoint
if (require.main === module) {
    (async () => {
        try {
            await exports.transcodeWorker.start();
        }
        catch (err) {
            console.error('[Worker Fatal Error]', err);
            process.exit(1);
        }
    })();
    const handleShutdown = async (sig) => {
        console.log(`[Worker] Received ${sig}`);
        await exports.transcodeWorker.stop();
        process.exit(0);
    };
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
}
