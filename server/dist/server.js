"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const storageRoutes_1 = __importDefault(require("./routes/storageRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const transcodingService_1 = require("./services/transcodingService");
const livekitService_1 = require("./services/livekitService");
const storageService_1 = require("./services/storageService");
const emailService_1 = require("./services/emailService");
const app = (0, express_1.default)();
exports.app = app;
// Multi-origin CORS Configuration with strict Cloudflare Pages project binding
const allowedOrigins = config_1.config.corsOrigin
    ? config_1.config.corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
    : [];
// Extract authorized Cloudflare Pages project slugs from configured origins (e.g. 'unique-e-learning-platform')
const configuredPagesProjects = allowedOrigins
    .map(o => {
    const match = o.match(/^https?:\/\/([a-zA-Z0-9-]+)\.pages\.dev$/);
    return match ? match[1] : null;
})
    .filter((p) => Boolean(p));
if (configuredPagesProjects.length === 0) {
    configuredPagesProjects.push('unique-e-learning-platform');
}
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        // In development or test mode, allow all origins
        if (!config_1.config.isProduction)
            return callback(null, true);
        // Check wildcard or exact match in configured allowed origins
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Strictly permit legitimate project deployments and preview branches on Cloudflare Pages
        // Prevents rogue third-party *.pages.dev hostnames from accessing credentialed endpoints
        const isAuthorizedPagesOrigin = configuredPagesProjects.some(project => {
            const pattern = new RegExp(`^https:\\/\\/([a-zA-Z0-9-]+[.-])?${project}\\.pages\\.dev$`);
            return pattern.test(origin);
        });
        if (isAuthorizedPagesOrigin) {
            return callback(null, true);
        }
        callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Slug', 'x-tenant-slug', 'x-tenant-id'],
};
app.use((0, cors_1.default)(corsOptions));
// Express JSON with raw body capture for cryptographic webhook signatures
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(tenant_1.tenantMiddleware);
// Lightweight health probe for Cloud Load Balancers and Render Health Checks
app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
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
        objectStorage: storageService_1.storageService.getTelemetry(),
        transactionalEmail: emailService_1.emailService.getTelemetry(),
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
app.use('/api/storage', storageRoutes_1.default);
app.use('/api/support', supportRoutes_1.default);
// Transcoding & HLS Streaming endpoints
app.post('/api/transcode/enqueue', async (req, res) => {
    try {
        const { courseId, lessonId, sourceUrl } = req.body;
        if (!courseId || !lessonId || !sourceUrl) {
            res.status(400).json({ message: 'courseId, lessonId, and sourceUrl are required' });
            return;
        }
        const job = await transcodingService_1.transcodingService.enqueueTranscodeJob(courseId, lessonId, sourceUrl);
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
        // Automated Platform Admin provisioning on deployment if configured in Environment
        if (process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD) {
            try {
                const { bootstrapPlatformAdmin } = await Promise.resolve().then(() => __importStar(require('./scripts/bootstrapAdmin')));
                await bootstrapPlatformAdmin({
                    email: process.env.INITIAL_ADMIN_EMAIL,
                    password: process.env.INITIAL_ADMIN_PASSWORD,
                    fullName: process.env.INITIAL_ADMIN_NAME || 'Platform Administrator',
                    preserveConnection: true,
                });
            }
            catch (adminBootstrapErr) {
                console.error('[EduSphere Admin Bootstrap Error]', adminBootstrapErr?.message || adminBootstrapErr);
            }
        }
    }
    catch (err) {
        if (config_1.config.isProduction) {
            console.error('[FATAL] Process exiting due to production database connection failure.');
            process.exit(1);
        }
    }
});
exports.server = server;
// Graceful process termination (SIGINT for local dev, SIGTERM for cloud orchestrators like Render/Kubernetes)
const handleGracefulShutdown = async (signal) => {
    console.log(`\n[EduSphere] Received ${signal}. Shutting down gracefully...`);
    try {
        await (0, mongoConnection_1.disconnectMongoDB)();
    }
    catch (err) {
        console.error('[EduSphere] Error disconnecting MongoDB during shutdown:', err?.message || err);
    }
    server.close(() => {
        console.log('[EduSphere] HTTP server closed cleanly.');
        process.exit(0);
    });
};
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
