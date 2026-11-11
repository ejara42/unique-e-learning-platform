import express from 'express';
import cors from 'cors';
import { config } from './config';
import { tenantMiddleware } from './middleware/tenant';
import { connectMongoDB, disconnectMongoDB, connectionState } from './data/mongoConnection';
import { DatabaseUnavailableError } from './errors';
import { requireAuth, requireRole, AuthRequest } from './middleware/auth';
import authRoutes from './routes/authRoutes';
import tenantRoutes from './routes/tenantRoutes';
import courseRoutes from './routes/courseRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import liveRoutes from './routes/liveRoutes';
import certificateRoutes from './routes/certificateRoutes';
import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import interoperabilityRoutes from './routes/interoperabilityRoutes';
import storageRoutes from './routes/storageRoutes';
import supportRoutes from './routes/supportRoutes';
import mediaRoutes from './routes/mediaRoutes';
import searchRoutes from './routes/searchRoutes';
import { transcodingService } from './services/transcodingService';
import { livekitService } from './services/livekitService';
import { storageService } from './services/storageService';
import { emailService } from './services/emailService';
import { mongoSanitize } from './middleware/mongoSanitize';
import { repo } from './data/dbRepository';
import { validateBody, validateParams, validateQuery } from './middleware/validate';
import { emptyQuerySchema, transcodeJobParamsSchema, transcodeLessonParamsSchema, transcodeRequestSchema } from './validation/schemas';

const app = express();

const authRequestWindowMs = 15 * 60 * 1000;
const authRequestBuckets = new Map<string, { count: number; resetAt: number }>();

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
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
const allowedOrigins = config.corsOrigin
  ? config.corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
  : [];

// Extract authorized Cloudflare Pages project slugs from configured origins (e.g. 'unique-e-learning-platform')
const configuredPagesProjects = allowedOrigins
  .map(o => {
    const match = o.match(/^https?:\/\/([a-zA-Z0-9-]+)\.pages\.dev$/);
    return match ? match[1] : null;
  })
  .filter((p): p is string => Boolean(p));

if (configuredPagesProjects.length === 0) {
  configuredPagesProjects.push('unique-e-learning-platform');
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // In development or test mode, allow all origins
    if (!config.isProduction) return callback(null, true);

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

app.use(cors(corsOptions));

// Express JSON with raw body capture for cryptographic webhook signatures
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// NoSQL Injection Mitigation (OWASP A03:2021)
app.use(mongoSanitize);

app.use('/api/auth', authRateLimiter(20));
app.use(tenantMiddleware);

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
  const isDbReady = connectionState.isConnected;
  const isQueueReady = connectionState.isConnected;
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
  if (connectionState.isConnected) {
    res.status(200).json({ status: 'READY', connected: true, database: connectionState.databaseName || 'edusphere' });
  } else {
    res.status(503).json({ status: 'UNAVAILABLE', connected: false, error: connectionState.error || 'Database connection dropped.' });
  }
});

app.get('/api/health/queue', (_req, res) => {
  if (connectionState.isConnected) {
    res.status(200).json({ status: 'READY', provider: 'MongoDB Persistent FIFO Queue', ready: true });
  } else {
    res.status(503).json({ status: 'UNAVAILABLE', provider: 'MongoDB Persistent FIFO Queue', ready: false, reason: 'Database offline.' });
  }
});

app.get('/api/health/storage', (_req, res) => {
  const storageTel = storageService.getTelemetry();
  res.status(storageTel.configured ? 200 : 200).json({
    status: storageTel.configured ? 'CONFIGURED' : 'UNCONFIGURED',
    telemetry: storageTel,
  });
});

app.get('/api/health/integrations', async (_req, res) => {
  const livekitTelemetry = await livekitService.getTelemetry();
  const emailTelemetry = emailService.getTelemetry();
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
  const livekitTelemetry = await livekitService.getTelemetry();
  const transcodingTelemetry = await transcodingService.getTelemetry();
  const storageTelemetry = storageService.getTelemetry();
  const emailTelemetry = emailService.getTelemetry();

  const isDbReady = connectionState.isConnected;
  const isReady = isDbReady;

  const status = isReady ? 'ONLINE' : 'DEGRADED';
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status,
    ready: isReady,
    environment: config.nodeEnv,
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
      connected: connectionState.isConnected,
      activeDatabase: connectionState.databaseName || (config.isProduction ? 'NONE' : 'in-memory-synchronized'),
      error: connectionState.error,
    },
    multiTenancy: {
      mode: 'AsyncLocalStorage Logical Partitioning',
      activeContext: (req as any).tenant || null,
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
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/live-sessions', liveRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/interoperability', interoperabilityRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/search', searchRoutes);

// Transcoding & HLS Streaming endpoints
app.post('/api/transcode/enqueue', requireAuth, requireRole('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), validateBody(transcodeRequestSchema), async (req: AuthRequest, res) => {
  try {
    const { courseId, lessonId, sourceUrl } = req.body;
    const course = await repo.getCourseById(courseId);
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

    const job = await transcodingService.enqueueTranscodeJob(
      courseId,
      lessonId,
      sourceUrl,
      req.user?.institutionId || null
    );
    res.status(202).json({ message: 'Transcoding job queued into BullMQ runner', job });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to enqueue transcoding job', error: err.message });
  }
});

app.get('/api/transcode/:jobId', validateParams(transcodeJobParamsSchema), validateQuery(emptyQuerySchema), async (req, res) => {
  const jobId = req.params.jobId;
  if (typeof jobId !== 'string') {
    res.status(400).json({ message: 'Invalid transcode job ID' });
    return;
  }
  const job = await transcodingService.getJobStatus(jobId);
  if (!job) {
    res.status(404).json({ message: 'Transcode job not found' });
    return;
  }
  res.json({ job });
});

app.get('/api/transcode/hls/:courseId/:lessonId/master.m3u8', validateParams(transcodeLessonParamsSchema), validateQuery(emptyQuerySchema), (req, res) => {
  const { courseId, lessonId } = req.params;
  if (typeof courseId !== 'string' || typeof lessonId !== 'string') {
    res.status(400).json({ message: 'Invalid course or lesson ID' });
    return;
  }
  const manifest = transcodingService.generateHlsMasterManifest(courseId, lessonId);
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(manifest);
});

// Centralized Enterprise Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (
    err instanceof DatabaseUnavailableError ||
    err?.name === 'DatabaseUnavailableError' ||
    err?.name === 'MongooseError' ||
    err?.name === 'MongoServerSelectionError' ||
    err?.name === 'MongoNetworkError' ||
    err?.name === 'MongoTimeoutError' ||
    (typeof err?.message === 'string' && (
      err.message.includes('buffering timed out') ||
      err.message.includes('Could not connect to any servers')
    ))
  ) {
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
    message: isInternal && config.isProduction ? 'Internal Server Error' : (err?.message || 'Internal Server Error'),
    error: isInternal && config.isProduction ? 'ServerError' : (err?.name || 'ServerError'),
  });
});

// Start Server and initialize MongoDB connection if not running in test mode
let server: any = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 EduSphere Backend API Server is active!`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`🛡️  Multi-Tenant Context: AsyncLocalStorage Active`);
    console.log(`=======================================================`);

    try {
      await connectMongoDB();

      // Initialize real-time MongoDB Change Streams for intelligent cache invalidation
      try {
        const { mongoChangeStreamWatcher } = await import('./cache/mongoChangeStreamWatcher');
        mongoChangeStreamWatcher.initialize();
      } catch { }

      // Initialize Decoupled Faceted Search Engine
      try {
        const { searchService } = await import('./search/searchService');
        await searchService.initialize();
      } catch { }

      // Initialize Decoupled Event Bus Subscribers
      try {
        const { registerAllSubscribers } = await import('./events/subscribers');
        registerAllSubscribers();
      } catch (subErr: any) {
        console.warn('[EventBus] Subscriber registration warning:', subErr?.message);
      }

      // Automated Platform Admin provisioning on deployment if configured in Environment
      if (process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD) {
        try {
          const { bootstrapPlatformAdmin } = await import('./scripts/bootstrapAdmin');
          await bootstrapPlatformAdmin({
            email: process.env.INITIAL_ADMIN_EMAIL,
            password: process.env.INITIAL_ADMIN_PASSWORD,
            fullName: process.env.INITIAL_ADMIN_NAME || 'Platform Administrator',
            preserveConnection: true,
          });
        } catch (adminBootstrapErr: any) {
          console.error('[EduSphere Admin Bootstrap Error]', adminBootstrapErr?.message || adminBootstrapErr);
        }
      }
    } catch (err: any) {
      if (config.isProduction) {
        console.error('[FATAL] Process exiting due to production database connection failure.');
        process.exit(1);
      }
    }
  });

  // Graceful process termination (SIGINT for local dev, SIGTERM for cloud orchestrators like Render/Kubernetes)
  const handleGracefulShutdown = async (signal: string) => {
    console.log(`\n[EduSphere] Received ${signal}. Shutting down gracefully...`);
    try {
      const { mongoChangeStreamWatcher } = await import('./cache/mongoChangeStreamWatcher');
      mongoChangeStreamWatcher.stop();
    } catch { }
    try {
      await disconnectMongoDB();
    } catch (err: any) {
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

export { app, server };
