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
const auth_1 = require("./middleware/auth");
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
const mediaRoutes_1 = __importDefault(require("./routes/mediaRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const transcodingService_1 = require("./services/transcodingService");
const livekitService_1 = require("./services/livekitService");
const storageService_1 = require("./services/storageService");
const emailService_1 = require("./services/emailService");
const mongoSanitize_1 = require("./middleware/mongoSanitize");
const dbRepository_1 = require("./data/dbRepository");
const validate_1 = require("./middleware/validate");
const schemas_1 = require("./validation/schemas");
const app = (0, express_1.default)();
exports.app = app;
const authRequestWindowMs = 15 * 60 * 1000;
const authRequestBuckets = new Map();
// Periodic TTL cleanup to prevent unbounded memory growth
const authCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of authRequestBuckets.entries()) {
        if (value.resetAt <= now) {
            authRequestBuckets.delete(key);
        }
    }
}, authRequestWindowMs);
authCleanupInterval.unref();
function authRateLimiter(maxRequests = 20) {
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const existing = authRequestBuckets.get(ip);
        if (!existing || existing.resetAt <= now) {
            authRequestBuckets.set(ip, { count: 1, resetAt: now + authRequestWindowMs });
            next();
            return;
        }
        existing.count += 1;
        if (existing.count > maxRequests) {
            res.status(429).json({ message: 'Too many authentication requests. Please retry shortly.' });
            return;
        }
        next();
    };
}
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
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
    limit: '1mb',
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    }
}));
// NoSQL Injection Mitigation (OWASP A03:2021)
app.use(mongoSanitize_1.mongoSanitize);
app.use('/api/auth', authRateLimiter(20));
app.use(tenant_1.tenantMiddleware);
// ==============================================================================
// HEALTH & READINESS PROBES (Separated Liveness, Readiness & Telemetry)
// ==============================================================================
// 1. Process Liveness Probes: Verifies HTTP server is up and event loop is responsive
app.get(['/healthz', '/api/health/live'], (_req, res) => {
    res.status(200).json({
        status: 'ok',
        alive: true,
        service: 'edusphere-api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
// 2. Gateway Readiness Probe: Fails with HTTP 503 if mandatory dependencies are unavailable
app.get('/api/health/ready', (_req, res) => {
    const isDbReady = mongoConnection_1.connectionState.isConnected;
    const isQueueReady = mongoConnection_1.connectionState.isConnected;
    const isReady = isDbReady && isQueueReady;
    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
        ready: isReady,
        status: isReady ? 'READY' : 'NOT_READY',
        timestamp: new Date().toISOString(),
        components: {
            database: isDbReady ? 'READY' : 'UNAVAILABLE',
            queue: isQueueReady ? 'READY' : 'UNAVAILABLE',
        },
        ...(!isReady && {
            reason: !isDbReady ? 'Mandatory MongoDB persistence is disconnected.' : 'Queue persistence is unavailable.'
        })
    });
});
// 3. Granular Component Probes
app.get('/api/health/database', (_req, res) => {
    if (mongoConnection_1.connectionState.isConnected) {
        res.status(200).json({ status: 'READY', connected: true, database: mongoConnection_1.connectionState.databaseName || 'edusphere' });
    }
    else {
        res.status(503).json({ status: 'UNAVAILABLE', connected: false, error: mongoConnection_1.connectionState.error || 'Database connection dropped.' });
    }
});
app.get('/api/health/queue', (_req, res) => {
    if (mongoConnection_1.connectionState.isConnected) {
        res.status(200).json({ status: 'READY', provider: 'MongoDB Persistent FIFO Queue', ready: true });
    }
    else {
        res.status(503).json({ status: 'UNAVAILABLE', provider: 'MongoDB Persistent FIFO Queue', ready: false, reason: 'Database offline.' });
    }
});
app.get('/api/health/storage', (_req, res) => {
    const storageTel = storageService_1.storageService.getTelemetry();
    res.status(storageTel.configured ? 200 : 200).json({
        status: storageTel.configured ? 'CONFIGURED' : 'UNCONFIGURED',
        telemetry: storageTel,
    });
});
app.get('/api/health/integrations', async (_req, res) => {
    const livekitTelemetry = await livekitService_1.livekitService.getTelemetry();
    const emailTelemetry = emailService_1.emailService.getTelemetry();
    res.status(200).json({
        liveKit: livekitTelemetry,
        transactionalEmail: emailTelemetry,
        stripe: {
            configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_edusphere_local_tests_only'),
            webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_local_tests_only'),
        }
    });
});
// 4. Comprehensive Telemetry Endpoint
app.get('/api/health', async (req, res) => {
    const livekitTelemetry = await livekitService_1.livekitService.getTelemetry();
    const transcodingTelemetry = await transcodingService_1.transcodingService.getTelemetry();
    const storageTelemetry = storageService_1.storageService.getTelemetry();
    const emailTelemetry = emailService_1.emailService.getTelemetry();
    const isDbReady = mongoConnection_1.connectionState.isConnected;
    const isReady = isDbReady;
    const status = isReady ? 'ONLINE' : 'DEGRADED';
    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
        status,
        ready: isReady,
        environment: config_1.config.nodeEnv,
        version: '1.0.0',
        service: 'EduSphere Enterprise API Gateway',
        timestamp: new Date().toISOString(),
        liveness: {
            alive: true,
            uptime: process.uptime(),
        },
        readiness: {
            overall: isReady,
            database: isDbReady ? 'READY' : 'DEGRADED',
            queue: isDbReady ? 'READY' : 'DEGRADED',
        },
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
        queue: {
            architecture: 'Persistent MongoDB FIFO Queue',
            status: isDbReady ? 'READY' : 'UNAVAILABLE',
        },
        mediaTranscoding: transcodingTelemetry,
        objectStorage: storageTelemetry,
        transactionalEmail: emailTelemetry,
        liveKit: livekitTelemetry,
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
app.use('/api/media', mediaRoutes_1.default);
app.use('/api/search', searchRoutes_1.default);
// Transcoding & HLS Streaming endpoints
app.post('/api/transcode/enqueue', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), (0, validate_1.validateBody)(schemas_1.transcodeRequestSchema), async (req, res) => {
    try {
        const { courseId, lessonId, sourceUrl } = req.body;
        const course = await dbRepository_1.repo.getCourseById(courseId);
        if (!course || !course.modules.some(module => module.lessons.some(lesson => lesson.id === lessonId))) {
            res.status(404).json({ message: 'Course lesson was not found' });
            return;
        }
        const user = req.user;
        const isPlatformAdmin = user?.activeRole === 'PLATFORM_ADMIN' && user.globalRole === 'PLATFORM_SUPERADMIN';
        const canManage = isPlatformAdmin ||
            (user?.activeRole === 'INSTRUCTOR' && course.instructorId === user.id) ||
            (user?.activeRole === 'INSTITUTION_ADMIN' && Boolean(user.institutionId && course.tenantId === user.institutionId));
        if (!canManage) {
            res.status(403).json({ message: 'Course ownership or offering-institution administration is required.' });
            return;
        }
        const job = await transcodingService_1.transcodingService.enqueueTranscodeJob(courseId, lessonId, sourceUrl, req.user?.institutionId || null);
        res.status(202).json({ message: 'Transcoding job queued into BullMQ runner', job });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to enqueue transcoding job', error: err.message });
    }
});
app.get('/api/transcode/:jobId', (0, validate_1.validateParams)(schemas_1.transcodeJobParamsSchema), (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), async (req, res) => {
    const jobId = req.params.jobId;
    if (typeof jobId !== 'string') {
        res.status(400).json({ message: 'Invalid transcode job ID' });
        return;
    }
    const job = await transcodingService_1.transcodingService.getJobStatus(jobId);
    if (!job) {
        res.status(404).json({ message: 'Transcode job not found' });
        return;
    }
    res.json({ job });
});
app.get('/api/transcode/hls/:courseId/:lessonId/master.m3u8', (0, validate_1.validateParams)(schemas_1.transcodeLessonParamsSchema), (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), (req, res) => {
    const { courseId, lessonId } = req.params;
    if (typeof courseId !== 'string' || typeof lessonId !== 'string') {
        res.status(400).json({ message: 'Invalid course or lesson ID' });
        return;
    }
    const manifest = transcodingService_1.transcodingService.generateHlsMasterManifest(courseId, lessonId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(manifest);
});
// Centralized Enterprise Error Handler
app.use((err, _req, res, _next) => {
    if (err instanceof errors_1.DatabaseUnavailableError ||
        err?.name === 'DatabaseUnavailableError' ||
        err?.name === 'MongooseError' ||
        err?.name === 'MongoServerSelectionError' ||
        err?.name === 'MongoNetworkError' ||
        err?.name === 'MongoTimeoutError' ||
        (typeof err?.message === 'string' && (err.message.includes('buffering timed out') ||
            err.message.includes('Could not connect to any servers')))) {
        res.status(503).json({
            error: 'SERVICE_UNAVAILABLE',
            message: err.message || 'Database persistence is currently unavailable.',
        });
        return;
    }
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    console.error('[EduSphere Server Error]', err);
    const isInternal = statusCode >= 500;
    res.status(statusCode).json({
        message: isInternal && config_1.config.isProduction ? 'Internal Server Error' : (err?.message || 'Internal Server Error'),
        error: isInternal && config_1.config.isProduction ? 'ServerError' : (err?.name || 'ServerError'),
    });
});
// Start Server and initialize MongoDB connection if not running in test mode
let server = null;
exports.server = server;
if (process.env.NODE_ENV !== 'test') {
    exports.server = server = app.listen(config_1.config.port, async () => {
        console.log(`=======================================================`);
        console.log(`🚀 EduSphere Backend API Server is active!`);
        console.log(`📡 URL: http://localhost:${config_1.config.port}`);
        console.log(`🛡️  Multi-Tenant Context: AsyncLocalStorage Active`);
        console.log(`=======================================================`);
        try {
            await (0, mongoConnection_1.connectMongoDB)();
            // Initialize real-time MongoDB Change Streams for intelligent cache invalidation
            try {
                const { mongoChangeStreamWatcher } = await Promise.resolve().then(() => __importStar(require('./cache/mongoChangeStreamWatcher')));
                mongoChangeStreamWatcher.initialize();
            }
            catch { }
            // Initialize Decoupled Faceted Search Engine
            try {
                const { searchService } = await Promise.resolve().then(() => __importStar(require('./search/searchService')));
                await searchService.initialize();
            }
            catch { }
            // Initialize Decoupled Event Bus Subscribers
            try {
                const { registerAllSubscribers } = await Promise.resolve().then(() => __importStar(require('./events/subscribers')));
                registerAllSubscribers();
            }
            catch (subErr) {
                console.warn('[EventBus] Subscriber registration warning:', subErr?.message);
            }
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
    // Graceful process termination (SIGINT for local dev, SIGTERM for cloud orchestrators like Render/Kubernetes)
    const handleGracefulShutdown = async (signal) => {
        console.log(`\n[EduSphere] Received ${signal}. Shutting down gracefully...`);
        try {
            const { mongoChangeStreamWatcher } = await Promise.resolve().then(() => __importStar(require('./cache/mongoChangeStreamWatcher')));
            mongoChangeStreamWatcher.stop();
        }
        catch { }
        try {
            await (0, mongoConnection_1.disconnectMongoDB)();
        }
        catch (err) {
            console.error('[EduSphere] Error disconnecting MongoDB during shutdown:', err?.message || err);
        }
        server?.close(() => {
            console.log('[EduSphere] HTTP server closed cleanly.');
            process.exit(0);
        });
    };
    process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
}
