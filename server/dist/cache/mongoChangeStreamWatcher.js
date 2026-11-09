"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoChangeStreamWatcher = exports.MongoChangeStreamWatcher = void 0;
const models_1 = require("../models");
const cacheService_1 = require("./cacheService");
const mongoConnection_1 = require("../data/mongoConnection");
class MongoChangeStreamWatcher {
    activeStreams = [];
    isWatching = false;
    initialize() {
        if (this.isWatching || !mongoConnection_1.connectionState.isConnected) {
            return;
        }
        try {
            // 1. Course mutations -> Invalidate course catalogs and individual course detail caches
            const courseStream = models_1.CourseModel.watch([], { fullDocument: 'updateLookup' });
            courseStream.on('change', async (change) => {
                try {
                    const courseId = change.fullDocument?.id || change.documentKey?._id?.toString();
                    await cacheService_1.cacheService.invalidateByTag('courses:catalog');
                    if (courseId) {
                        await cacheService_1.cacheService.invalidateByTag(`course:${courseId}`);
                    }
                }
                catch (err) {
                    console.warn('[ChangeStream] Course invalidation warning:', err.message);
                }
            });
            courseStream.on('error', (err) => {
                // Standalone MongoDB instances or connection drops
                console.warn('[ChangeStream] Course watcher degraded:', err.message);
            });
            this.activeStreams.push(courseStream);
            // 2. Tenant mutations -> Invalidate accredited tenant directories
            const tenantStream = models_1.TenantModel.watch([], { fullDocument: 'updateLookup' });
            tenantStream.on('change', async (change) => {
                try {
                    const tenantId = change.fullDocument?.id || change.documentKey?._id?.toString();
                    await cacheService_1.cacheService.invalidateByTag('tenants:directory');
                    if (tenantId) {
                        await cacheService_1.cacheService.invalidateByTag(`tenant:${tenantId}`);
                    }
                }
                catch (err) {
                    console.warn('[ChangeStream] Tenant invalidation warning:', err.message);
                }
            });
            tenantStream.on('error', () => { });
            this.activeStreams.push(tenantStream);
            // 3. Certificate mutations -> Invalidate public credential verification caches
            const certStream = models_1.CertificateModel.watch([], { fullDocument: 'updateLookup' });
            certStream.on('change', async (change) => {
                try {
                    const certCode = change.fullDocument?.certificateNumber;
                    if (certCode) {
                        await cacheService_1.cacheService.invalidateKey(`cert:verify:${certCode}`);
                    }
                }
                catch (err) {
                    console.warn('[ChangeStream] Certificate invalidation warning:', err.message);
                }
            });
            certStream.on('error', () => { });
            this.activeStreams.push(certStream);
            this.isWatching = true;
            console.log('⚡ [EduSphere Cache] Real-time MongoDB Change Streams active for intelligent invalidation.');
        }
        catch (err) {
            console.warn('⚠️ [EduSphere Cache] Change Streams unavailable (requires replica set). Operating with TTL-based invalidation.');
        }
    }
    stop() {
        for (const stream of this.activeStreams) {
            try {
                stream.close();
            }
            catch { }
        }
        this.activeStreams = [];
        this.isWatching = false;
    }
}
exports.MongoChangeStreamWatcher = MongoChangeStreamWatcher;
exports.mongoChangeStreamWatcher = new MongoChangeStreamWatcher();
