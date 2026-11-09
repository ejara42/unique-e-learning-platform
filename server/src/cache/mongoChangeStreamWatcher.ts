import { CourseModel, TenantModel, CertificateModel } from '../models';
import { cacheService } from './cacheService';
import { connectionState } from '../data/mongoConnection';

export class MongoChangeStreamWatcher {
  private activeStreams: any[] = [];
  private isWatching = false;

  public initialize(): void {
    if (this.isWatching || !connectionState.isConnected) {
      return;
    }

    try {
      // 1. Course mutations -> Invalidate course catalogs and individual course detail caches
      const courseStream = CourseModel.watch([], { fullDocument: 'updateLookup' });
      courseStream.on('change', async (change: any) => {
        try {
          const courseId = change.fullDocument?.id || change.documentKey?._id?.toString();
          await cacheService.invalidateByTag('courses:catalog');
          if (courseId) {
            await cacheService.invalidateByTag(`course:${courseId}`);
          }
        } catch (err: any) {
          console.warn('[ChangeStream] Course invalidation warning:', err.message);
        }
      });
      courseStream.on('error', (err: any) => {
        // Standalone MongoDB instances or connection drops
        console.warn('[ChangeStream] Course watcher degraded:', err.message);
      });
      this.activeStreams.push(courseStream);

      // 2. Tenant mutations -> Invalidate accredited tenant directories
      const tenantStream = TenantModel.watch([], { fullDocument: 'updateLookup' });
      tenantStream.on('change', async (change: any) => {
        try {
          const tenantId = change.fullDocument?.id || change.documentKey?._id?.toString();
          await cacheService.invalidateByTag('tenants:directory');
          if (tenantId) {
            await cacheService.invalidateByTag(`tenant:${tenantId}`);
          }
        } catch (err: any) {
          console.warn('[ChangeStream] Tenant invalidation warning:', err.message);
        }
      });
      tenantStream.on('error', () => {});
      this.activeStreams.push(tenantStream);

      // 3. Certificate mutations -> Invalidate public credential verification caches
      const certStream = CertificateModel.watch([], { fullDocument: 'updateLookup' });
      certStream.on('change', async (change: any) => {
        try {
          const certCode = change.fullDocument?.certificateNumber;
          if (certCode) {
            await cacheService.invalidateKey(`cert:verify:${certCode}`);
          }
        } catch (err: any) {
          console.warn('[ChangeStream] Certificate invalidation warning:', err.message);
        }
      });
      certStream.on('error', () => {});
      this.activeStreams.push(certStream);

      this.isWatching = true;
      console.log('⚡ [EduSphere Cache] Real-time MongoDB Change Streams active for intelligent invalidation.');
    } catch (err: any) {
      console.warn('⚠️ [EduSphere Cache] Change Streams unavailable (requires replica set). Operating with TTL-based invalidation.');
    }
  }

  public stop(): void {
    for (const stream of this.activeStreams) {
      try {
        stream.close();
      } catch {}
    }
    this.activeStreams = [];
    this.isWatching = false;
  }
}

export const mongoChangeStreamWatcher = new MongoChangeStreamWatcher();
