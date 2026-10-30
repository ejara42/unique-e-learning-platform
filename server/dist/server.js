"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const tenant_1 = require("./middleware/tenant");
const mongoConnection_1 = require("./data/mongoConnection");
const errors_1 = require("./errors");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const tenantRoutes_1 = __importDefault(require("./routes/tenantRoutes"));
const courseRoutes_1 = __importDefault(require("./routes/courseRoutes"));
const assessmentRoutes_1 = __importDefault(require("./routes/assessmentRoutes"));
const liveRoutes_1 = __importDefault(require("./routes/liveRoutes"));
const certificateRoutes_1 = __importDefault(require("./routes/certificateRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const interoperabilityRoutes_1 = __importDefault(require("./routes/interoperabilityRoutes"));
const transcodingService_1 = require("./services/transcodingService");
const livekitService_1 = require("./services/livekitService");
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, cors_1.default)({ origin: true, credentials: true }));
// Express JSON with raw body capture for cryptographic webhook signatures
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(tenant_1.tenantMiddleware);
// Health check with Database, Multi-Tenant, LiveKit & Transcoding telemetry
app.get('/api/health', async (req, res) => {
    const livekitTelemetry = await livekitService_1.livekitService.getTelemetry();
    const transcodingTelemetry = transcodingService_1.transcodingService.getTelemetry();
    const transcodingReadiness = transcodingService_1.transcodingService.getReadiness();
    const isDbHealthy = !config_1.config.isProduction || mongoConnection_1.connectionState.isConnected;
    const isTranscodingHealthy = !config_1.config.isProduction || transcodingReadiness.isReady;
    const isHealthy = isDbHealthy && isTranscodingHealthy;
    const status = isHealthy ? 'ONLINE' : 'DEGRADED';
    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json({
        status,
        ready: mongoConnection_1.connectionState.isConnected && transcodingReadiness.isReady,
        environment: config_1.config.nodeEnv,
        version: '1.0.0',
        service: 'EduSphere Enterprise API Gateway',
        timestamp: new Date().toISOString(),
        database: {
            provider: 'MongoDB 8.x / Mongoose ODM',
            connected: mongoConnection_1.connectionState.isConnected,
            activeDatabase: mongoConnection_1.connectionState.databaseName || (config_1.config.isProduction ? 'NONE' : 'in-memory-synchronized'),
            error: mongoConnection_1.connectionState.error,
        },
        multiTenancy: {
            mode: 'AsyncLocalStorage Logical Partitioning',
            activeContext: req.tenant || null,
        },
        liveKit: livekitTelemetry,
        mediaTranscoding: transcodingTelemetry,
    });
});
// Mount Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/tenants', tenantRoutes_1.default);
app.use('/api/courses', courseRoutes_1.default);
app.use('/api/assessments', assessmentRoutes_1.default);
app.use('/api/live-sessions', liveRoutes_1.default);
app.use('/api/certificates', certificateRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/interoperability', interoperabilityRoutes_1.default);
// Transcoding & HLS Streaming endpoints
app.post('/api/transcode/enqueue', async (req, res) => {
    try {
        const { courseId, lessonId, sourceUrl } = req.body;
        if (!courseId || !lessonId) {
            res.status(400).json({ message: 'courseId and lessonId are required' });
            return;
        }
        const job = await transcodingService_1.transcodingService.enqueueTranscodeJob(courseId, lessonId, sourceUrl || 'https://storage.edusphere.io/raw-uploads/video-sample.mp4');
        res.status(202).json({ message: 'Transcoding job queued into BullMQ runner', job });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to enqueue transcoding job', error: err.message });
    }
});
app.get('/api/transcode/:jobId', (req, res) => {
    const job = transcodingService_1.transcodingService.getJobStatus(req.params.jobId);
    if (!job) {
        res.status(404).json({ message: 'Transcode job not found' });
        return;
    }
    res.json({ job });
});
app.get('/api/transcode/hls/:courseId/:lessonId/master.m3u8', (req, res) => {
    const manifest = transcodingService_1.transcodingService.generateHlsMasterManifest(req.params.courseId, req.params.lessonId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(manifest);
});
// Centralized Enterprise Error Handler
app.use((err, _req, res, _next) => {
    if (err instanceof errors_1.DatabaseUnavailableError || err?.name === 'DatabaseUnavailableError') {
        res.status(503).json({
            error: 'SERVICE_UNAVAILABLE',
            message: err.message,
        });
        return;
    }
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    console.error('[EduSphere Server Error]', err);
    res.status(statusCode).json({
        message: err?.message || 'Internal Server Error',
        error: err?.name || 'ServerError',
    });
});
// Start Server and initialize MongoDB connection
const server = app.listen(config_1.config.port, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 EduSphere Backend API Server is active!`);
    console.log(`📡 URL: http://localhost:${config_1.config.port}`);
    console.log(`🛡️  Multi-Tenant Context: AsyncLocalStorage Active`);
    console.log(`=======================================================`);
    try {
        await (0, mongoConnection_1.connectMongoDB)();
    }
    catch (err) {
        if (config_1.config.isProduction) {
            console.error('[FATAL] Process exiting due to production database connection failure.');
            process.exit(1);
        }
    }
});
exports.server = server;
// Graceful process termination
process.on('SIGINT', async () => {
    console.log('\n[EduSphere] Shutting down gracefully...');
    await (0, mongoConnection_1.disconnectMongoDB)();
    server.close(() => {
        process.exit(0);
    });
});
