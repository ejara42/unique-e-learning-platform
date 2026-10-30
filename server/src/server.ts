import express from 'express';
import cors from 'cors';
import { config } from './config';
import { tenantMiddleware } from './middleware/tenant';
import { connectMongoDB, disconnectMongoDB, connectionState } from './data/mongoConnection';
import { DatabaseUnavailableError } from './errors';
import authRoutes from './routes/authRoutes';
import tenantRoutes from './routes/tenantRoutes';
import courseRoutes from './routes/courseRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import liveRoutes from './routes/liveRoutes';
import certificateRoutes from './routes/certificateRoutes';
import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import interoperabilityRoutes from './routes/interoperabilityRoutes';
import { transcodingService } from './services/transcodingService';
import { livekitService } from './services/livekitService';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));

// Express JSON with raw body capture for cryptographic webhook signatures
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(tenantMiddleware);

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

// Transcoding & HLS Streaming endpoints
app.post('/api/transcode/enqueue', async (req, res) => {
  try {
    const { courseId, lessonId, sourceUrl } = req.body;
    if (!courseId || !lessonId) {
      res.status(400).json({ message: 'courseId and lessonId are required' });
      return;
    }
    const job = await transcodingService.enqueueTranscodeJob(
      courseId,
      lessonId,
      sourceUrl || 'https://storage.edusphere.io/raw-uploads/video-sample.mp4'
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
  res.status(statusCode).json({
    message: err?.message || 'Internal Server Error',
    error: err?.name || 'ServerError',
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
  } catch (err: any) {
    if (config.isProduction) {
      console.error('[FATAL] Process exiting due to production database connection failure.');
      process.exit(1);
    }
  }
});

// Graceful process termination
process.on('SIGINT', async () => {
  console.log('\n[EduSphere] Shutting down gracefully...');
  await disconnectMongoDB();
  server.close(() => {
    process.exit(0);
  });
});

export { app, server };
