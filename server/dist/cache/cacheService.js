"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.EnterpriseCacheService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class EnterpriseCacheService {
    memoryCache = new Map();
    tagIndex = new Map();
    cleanupTimer;
    constructor() {
        // Periodic garbage collector for expired cache entries (every 60s)
        this.cleanupTimer = setInterval(() => this.purgeExpiredEntries(), 60000);
        this.cleanupTimer.unref();
    }
    hashQuery(params) {
        const sortedKeys = Object.keys(params).sort();
        const normalized = {};
        for (const k of sortedKeys) {
            if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                normalized[k] = params[k];
            }
        }
        return crypto_1.default.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 12);
    }
    async get(key) {
        const now = Date.now();
        const entry = this.memoryCache.get(key);
        if (entry) {
            if (entry.expiresAt > now) {
                return entry.value;
            }
            this.memoryCache.delete(key);
        }
        return null;
    }
    async set(key, value, options) {
        const ttlSeconds = options?.ttlSeconds ?? 300; // default 5 minutes
        const tags = options?.tags ?? [];
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.memoryCache.set(key, {
            value,
            expiresAt,
            tags,
        });
        // Index tags for O(1) bulk invalidation
        for (const tag of tags) {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(key);
        }
    }
    async invalidateKey(key) {
        this.memoryCache.delete(key);
    }
    async invalidateByTag(tag) {
        const keys = this.tagIndex.get(tag);
        if (!keys || keys.size === 0)
            return 0;
        let invalidatedCount = 0;
        for (const key of keys) {
            if (this.memoryCache.delete(key)) {
                invalidatedCount++;
            }
        }
        this.tagIndex.delete(tag);
        return invalidatedCount;
    }
    async clearAll() {
        this.memoryCache.clear();
        this.tagIndex.clear();
    }
    purgeExpiredEntries() {
        const now = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiresAt <= now) {
                this.memoryCache.delete(key);
            }
        }
    }
    getStats() {
        return {
            totalEntries: this.memoryCache.size,
            totalTags: this.tagIndex.size,
        };
    }
}
exports.EnterpriseCacheService = EnterpriseCacheService;
exports.cacheService = new EnterpriseCacheService();
