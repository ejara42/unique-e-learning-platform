import crypto from 'crypto';
import { redisClient } from '../queue/redisClient';

export interface CacheOptions {
  ttlSeconds?: number;
  tags?: string[];
}

interface InMemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class EnterpriseCacheService {
  private memoryCache: Map<string, InMemoryCacheEntry<any>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    // Periodic garbage collector for expired cache entries (every 60s)
    this.cleanupTimer = setInterval(() => this.purgeExpiredEntries(), 60000);
    this.cleanupTimer.unref();
  }

  public hashQuery(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const normalized: Record<string, any> = {};
    for (const k of sortedKeys) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        normalized[k] = params[k];
      }
    }
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 12);
  }

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const entry = this.memoryCache.get(key);

    if (entry) {
      if (entry.expiresAt > now) {
        return entry.value as T;
      }
      this.memoryCache.delete(key);
    }

    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
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
      this.tagIndex.get(tag)!.add(key);
    }
  }

  async invalidateKey(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;

    let invalidatedCount = 0;
    for (const key of keys) {
      if (this.memoryCache.delete(key)) {
        invalidatedCount++;
      }
    }

    this.tagIndex.delete(tag);
    return invalidatedCount;
  }

  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    this.tagIndex.clear();
  }

  private purgeExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  public getStats(): { totalEntries: number; totalTags: number } {
    return {
      totalEntries: this.memoryCache.size,
      totalTags: this.tagIndex.size,
    };
  }
}

export const cacheService = new EnterpriseCacheService();
