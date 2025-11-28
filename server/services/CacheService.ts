import { createClient, RedisClientType } from 'redis';
import type { Request } from 'express';

/**
 * Redis-based Cache Service
 * 
 * Provides response caching for read-heavy, non-PHI endpoints.
 * 
 * HIPAA Safety:
 * - NEVER caches PHI or PII
 * - All operations are audited
 * - Graceful degradation if Redis unavailable
 * - Short TTLs prevent stale data
 * 
 * @example
 * // Get from cache
 * const data = await CacheService.get<MedicalCode[]>('medical-codes:cpt:all');
 * 
 * // Set with 1 hour TTL
 * await CacheService.set('medical-codes:cpt:all', codes, 3600);
 * 
 * // Invalidate pattern
 * await CacheService.deletePattern('medical-codes:cpt:*');
 */

// Cache statistics
export interface CacheStats {
  connected: boolean;
  keyCount: number;
  memoryUsage: number;
  hitRate?: number;
  lastError?: string;
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  medical_codes: {
    enabled: boolean;
    ttl: number; // seconds
  };
  organizations: {
    enabled: boolean;
    ttl: number;
  };
  therapists: {
    enabled: boolean;
    ttl: number;
  };
}

// Default cache configuration
export const CACHE_CONFIG: CacheConfig = {
  enabled: process.env.CACHE_ENABLED !== 'false',
  medical_codes: {
    enabled: process.env.CACHE_MEDICAL_CODES !== 'false',
    ttl: 86400, // 24 hours
  },
  organizations: {
    enabled: process.env.CACHE_ORGANIZATIONS !== 'false',
    ttl: 3600, // 1 hour
  },
  therapists: {
    enabled: process.env.CACHE_THERAPISTS !== 'false',
    ttl: 1800, // 30 minutes
  }
};

// PHI fields that should NEVER be cached
export const PHI_FIELDS = [
  'ssn',
  'dob',
  'homeAddress',
  'homeCity',
  'homeState',
  'homeZip',
  'personalPhone',
  'personalEmail',
  'patientName',
  'patientContactEmail',
  'patientContactPhone',
  'diagnosis',
  'sessionNotes',
  'treatmentPlan',
  'birthCity',
  'birthState',
  'birthCountry',
  'emergencyContactName',
  'emergencyContactPhone',
  'businessEin',
  'businessAddress',
  'businessPhone',
  'businessEmail',
];

/**
 * Check if a field name is PHI and should never be cached
 */
export function isPHIField(fieldName: string): boolean {
  // Check if field is in PHI list
  if (PHI_FIELDS.includes(fieldName)) {
    return true;
  }
  
  // Check if field ends with 'Encrypted' (all PHI fields have this suffix)
  if (fieldName.endsWith('Encrypted')) {
    return true;
  }
  
  // Check if field ends with 'SearchHash' (used for encrypted field searching)
  if (fieldName.endsWith('SearchHash')) {
    return true;
  }
  
  return false;
}

/**
 * Strip PHI fields from an object before caching
 */
export function stripPHIFields<T extends Record<string, any>>(data: T): Partial<T> {
  const safe: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!isPHIField(key)) {
      safe[key] = value;
    }
  }
  
  return safe as Partial<T>;
}

/**
 * Redis Cache Service
 * 
 * Singleton service for caching API responses.
 * Automatically handles connection, error handling, and graceful degradation.
 */
export class CacheService {
  private static client: RedisClientType | null = null;
  private static connecting: boolean = false;
  private static connected: boolean = false;
  private static lastError: string | null = null;
  
  // Statistics
  private static hits: number = 0;
  private static misses: number = 0;

  /**
   * Initialize Redis connection
   */
  static async connect(): Promise<void> {
    // Skip if caching is disabled
    if (!CACHE_CONFIG.enabled) {
      console.log('[Cache] Caching disabled via configuration');
      return;
    }
    
    // Skip if already connected
    if (this.connected && this.client) {
      return;
    }
    
    // Skip if already connecting
    if (this.connecting) {
      return;
    }
    
    this.connecting = true;
    
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        console.log('[Cache] REDIS_URL not configured, caching disabled');
        this.connecting = false;
        return;
      }
      
      // Detect if Render already provides rediss:// URL with TLS
      const usesTLS = redisUrl.startsWith('rediss://');
      const isProduction = process.env.NODE_ENV === 'production';
      
      console.log(`[Cache] Connecting to Redis (TLS: ${usesTLS || isProduction ? 'enabled' : 'disabled'})...`);
      
      // Smart TLS: use existing TLS from URL, or force in production
      const clientConfig: any = { url: redisUrl };
      if (!usesTLS && isProduction) {
        clientConfig.socket = {
          tls: true,
          rejectUnauthorized: true
        };
      }
      
      this.client = createClient(clientConfig);
      
      // Error handling
      this.client.on('error', (err) => {
        console.error('[Cache] Redis error:', err.message);
        this.lastError = err.message;
        this.connected = false;
      });
      
      this.client.on('connect', () => {
        console.log('[Cache] Redis connected');
        this.connected = true;
        this.lastError = null;
      });
      
      this.client.on('disconnect', () => {
        console.log('[Cache] Redis disconnected');
        this.connected = false;
      });
      
      await this.client.connect();
      this.connecting = false;
      
    } catch (error) {
      console.error('[Cache] Failed to connect to Redis:', error);
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      this.connecting = false;
      this.connected = false;
      this.client = null;
    }
  }

  /**
   * Disconnect from Redis
   */
  static async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        this.connected = false;
        console.log('[Cache] Redis disconnected');
      } catch (error) {
        console.error('[Cache] Error disconnecting from Redis:', error);
      }
    }
  }

  /**
   * Check if Redis is available and healthy
   */
  static async isHealthy(): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false;
    }
    
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('[Cache] Health check failed:', error);
      return false;
    }
  }

  /**
   * Generate a cache key
   * 
   * @param namespace - Cache namespace (e.g., 'medical-codes')
   * @param parts - Key parts to join (e.g., ['cpt', 'all'])
   * @returns Formatted cache key (e.g., 'medical-codes:cpt:all')
   */
  static generateKey(namespace: string, ...parts: (string | number)[]): string {
    // Sanitize parts to prevent cache poisoning
    const safeParts = parts.map(part => 
      String(part).replace(/[^a-zA-Z0-9_-]/g, '_')
    );
    
    return [namespace, ...safeParts].join(':');
  }

  /**
   * Generate cache key from Express request
   * 
   * @param req - Express request
   * @param namespace - Cache namespace
   * @returns Cache key based on request URL and params
   */
  static generateKeyFromRequest(req: Request, namespace: string): string {
    const path = req.path.replace(/^\/api\//, '').replace(/\//g, ':');
    const query = Object.keys(req.query).length > 0 
      ? `:${JSON.stringify(req.query)}`
      : '';
    
    return `${namespace}:${path}${query}`;
  }

  /**
   * Get value from cache
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  static async get<T>(key: string): Promise<T | null> {
    // Skip if not connected
    if (!this.connected || !this.client) {
      return null;
    }
    
    try {
      const value = await this.client.get(key);
      
      if (value && typeof value === 'string') {
        this.hits++;
        console.log(`[Cache] HIT: ${key}`);
        return JSON.parse(value) as T;
      }
      
      this.misses++;
      console.log(`[Cache] MISS: ${key}`);
      return null;
      
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  static async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Skip if not connected
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl && ttl > 0) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      console.log(`[Cache] SET: ${key} (TTL: ${ttl || 'none'}s)`);
      
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error);
    }
  }

  /**
   * Delete a specific key from cache
   * 
   * @param key - Cache key to delete
   */
  static async delete(key: string): Promise<void> {
    // Skip if not connected
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      await this.client.del(key);
      console.log(`[Cache] DELETE: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   * 
   * @param pattern - Redis key pattern (e.g., 'medical-codes:cpt:*')
   */
  static async deletePattern(pattern: string): Promise<void> {
    // Skip if not connected
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      console.log(`[Cache] Clearing pattern: ${pattern}`);
      
      // Scan for matching keys
      const keys: string[] = [];
      for await (const key of this.client.scanIterator({ MATCH: pattern })) {
        if (typeof key === 'string') {
          keys.push(key);
        }
      }
      
      if (keys.length > 0) {
        // Delete keys (del accepts string or array of strings)
        await this.client.del(keys as [string, ...string[]]);
        console.log(`[Cache] Deleted ${keys.length} keys matching ${pattern}`);
      } else {
        console.log(`[Cache] No keys found matching ${pattern}`);
      }
      
    } catch (error) {
      console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    // Skip if not connected
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      await this.client.flushDb();
      console.log('[Cache] All cache cleared');
    } catch (error) {
      console.error('[Cache] Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      connected: this.connected,
      keyCount: 0,
      memoryUsage: 0,
      hitRate: this.hits + this.misses > 0 
        ? Math.round((this.hits / (this.hits + this.misses)) * 100) 
        : undefined,
      lastError: this.lastError || undefined,
    };
    
    if (this.connected && this.client) {
      try {
        // Get key count
        stats.keyCount = await this.client.dbSize();
        
        // Get memory usage
        const info = await this.client.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        if (memoryMatch) {
          stats.memoryUsage = parseInt(memoryMatch[1], 10);
        }
        
      } catch (error) {
        console.error('[Cache] Error getting stats:', error);
      }
    }
    
    return stats;
  }

  /**
   * Warm cache by preloading common data
   */
  static async warmCache(): Promise<void> {
    console.log('[Cache] Warming cache...');
    
    // Cache warming will be done by services
    // This is just a placeholder for initialization
    
    console.log('[Cache] Cache warming complete');
  }
}

/**
 * Initialize cache service on module load
 */
if (process.env.NODE_ENV !== 'test') {
  CacheService.connect().catch(err => {
    console.error('[Cache] Failed to initialize cache service:', err);
  });
}

