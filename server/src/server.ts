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

// Lightweight health probe for Cloud Load Balancers and Render Health Checks
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Health check with Database, Multi-Tenant, LiveKit & Transcoding telemetry
app.get('/api/health', async (req, res) => {
  const livekitTelemetry = await livekitService.getTelemetry();
  const transcodingTelemetry = transcodingService.getTelemetry();
  const transcodingReadiness = transcodingService.getReadiness();

  const isDbHealthy = !config.isProduction || connectionState.isConnected;
  const isTranscodingHealthy = !config.isProduction || transcodingReadiness.isReady;
  const isHealthy = isDbHealthy && isTranscodingHealthy;

  const status = isHealthy ? 'ONLINE' : 'DEGRADED';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    ready: connectionState.isConnected && transcodingReadiness.isReady,
    environment: config.nodeEnv,
    version: '1.0.0',
    service: 'EduSphere Enterprise API Gateway',
    timestamp: new Date().toISOString(),
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
    liveKit: livekitTelemetry,
    mediaTranscoding: transcodingTelemetry,
    objectStorage: storageService.getTelemetry(),
    transactionalEmail: emailService.getTelemetry(),
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
app.post('/api/transcode/enqueue', requireAuth, requireRole('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { courseId, lessonId, sourceUrl } = req.body;
    if (!courseId || !lessonId || !sourceUrl) {
      res.status(400).json({ message: 'courseId, lessonId, and sourceUrl are required' });
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

app.get('/api/transcode/:jobId', (req, res) => {
  const job = transcodingService.getJobStatus(req.params.jobId);
  if (!job) {
    res.status(404).json({ message: 'Transcode job not found' });
    return;
  }
  res.json({ job });
});

app.get('/api/transcode/hls/:courseId/:lessonId/master.m3u8', (req, res) => {
  const manifest = transcodingService.generateHlsMasterManifest(req.params.courseId, req.params.lessonId);
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(manifest);
});

// Centralized Enterprise Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof DatabaseUnavailableError || err?.name === 'DatabaseUnavailableError') {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: err.message,
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

// Start Server and initialize MongoDB connection
const server = app.listen(config.port, async () => {
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
    } catch {}

    // Initialize Decoupled Faceted Search Engine
    try {
      const { searchService } = await import('./search/searchService');
      await searchService.initialize();
    } catch {}

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
  } catch {}
  try {
    await disconnectMongoDB();
  } catch (err: any) {
    console.error('[EduSphere] Error disconnecting MongoDB during shutdown:', err?.message || err);
  }
  server.close(() => {
    console.log('[EduSphere] HTTP server closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

export { app, server };
