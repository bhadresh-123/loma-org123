import type { Request, Response, NextFunction } from 'express';
import { CacheService, CACHE_CONFIG, stripPHIFields } from '../services/CacheService';

/**
 * Cache Middleware Configuration
 */
export interface CacheMiddlewareConfig {
  /**
   * Time to live in seconds
   */
  ttl: number;
  
  /**
   * Cache key generator function
   * Default: Uses request path as key
   */
  keyGenerator?: (req: Request) => string;
  
  /**
   * Namespace for cache keys
   * Used to group related cache entries for easy invalidation
   */
  namespace: string;
  
  /**
   * Conditional caching predicate
   * Return false to skip caching for specific requests
   */
  shouldCache?: (req: Request, res: Response) => boolean;
  
  /**
   * Strip PHI fields from response before caching
   * Default: false (assumes endpoint returns no PHI)
   */
  stripPHI?: boolean;
  
  /**
   * Feature flag to enable/disable this specific cache
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Response caching middleware
 * 
 * Caches GET request responses in Redis for improved performance.
 * 
 * HIPAA Safety Features:
 * - Only caches GET requests (never caches mutations)
 * - Respects feature flags (can be disabled)
 * - Graceful degradation if Redis unavailable
 * - Optional PHI field stripping
 * - Audit logging for cache operations
 * 
 * @example
 * // Cache medical codes for 24 hours
 * router.get('/cpt', 
 *   authenticateToken,
 *   withCache({
 *     namespace: 'medical-codes',
 *     ttl: 86400,
 *     keyGenerator: (req) => `cpt:all`,
 *   }),
 *   async (req, res) => {
 *     const codes = await MedicalCodesService.getAllCPTCodes();
 *     res.json(codes);
 *   }
 * );
 * 
 * @param config - Cache middleware configuration
 * @returns Express middleware function
 */
export function withCache(config: CacheMiddlewareConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Check if caching is globally enabled
    if (!CACHE_CONFIG.enabled) {
      return next();
    }
    
    // Check if this specific cache is enabled
    if (config.enabled === false) {
      return next();
    }
    
    // Check conditional caching
    if (config.shouldCache && !config.shouldCache(req, res)) {
      return next();
    }
    
    // Check if Redis is available
    const isHealthy = await CacheService.isHealthy();
    if (!isHealthy) {
      console.log(`[Cache] Redis unavailable, skipping cache for ${req.path}`);
      return next();
    }
    
    try {
      // Generate cache key
      const key = config.keyGenerator
        ? CacheService.generateKey(config.namespace, config.keyGenerator(req))
        : CacheService.generateKeyFromRequest(req, config.namespace);
      
      // Try to get from cache
      const cached = await CacheService.get<any>(key);
      
      if (cached !== null) {
        // Cache hit - return cached response
        console.log(`[Cache] Serving cached response for ${key}`);
        
        // Set cache hit header
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', key);
        
        res.json(cached);
        return;
      }
      
      // Cache miss - intercept response to cache it
      console.log(`[Cache] Cache miss for ${key}, fetching fresh data`);
      
      // Store original res.json function
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(body: any): Response {
        // Cache the response
        (async () => {
          try {
            // Strip PHI fields if configured
            const dataToCache = config.stripPHI 
              ? stripPHIFields(body)
              : body;
            
            // Store in cache
            await CacheService.set(key, dataToCache, config.ttl);
            
            console.log(`[Cache] Cached response for ${key} (TTL: ${config.ttl}s)`);
            
          } catch (error) {
            console.error(`[Cache] Failed to cache response for ${key}:`, error);
          }
        })();
        
        // Set cache miss header
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', key);
        
        // Call original res.json
        return originalJson(body);
      };
      
      // Continue to route handler
      next();
      
    } catch (error) {
      console.error('[Cache] Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * 
 * Automatically invalidates cache on write operations (POST, PUT, DELETE).
 * Call this AFTER the route handler to ensure the write succeeded.
 * 
 * @example
 * // Invalidate medical codes cache on create/update/delete
 * router.post('/cpt',
 *   authenticateToken,
 *   async (req, res) => {
 *     const code = await MedicalCodesService.createCPTCode(req.body);
 *     res.json(code);
 *   },
 *   invalidateCache({ namespace: 'medical-codes', pattern: 'cpt:*' })
 * );
 * 
 * @param config - Invalidation configuration
 * @returns Express middleware function
 */
export function invalidateCache(config: {
  namespace: string;
  pattern?: string;
  keyGenerator?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only invalidate on successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        if (config.pattern) {
          // Invalidate by pattern
          const pattern = CacheService.generateKey(config.namespace, config.pattern);
          await CacheService.deletePattern(pattern);
          console.log(`[Cache] Invalidated pattern: ${pattern}`);
        } else if (config.keyGenerator) {
          // Invalidate specific key
          const key = CacheService.generateKey(config.namespace, config.keyGenerator(req));
          await CacheService.delete(key);
          console.log(`[Cache] Invalidated key: ${key}`);
        }
      } catch (error) {
        console.error('[Cache] Cache invalidation error:', error);
      }
    }
    
    next();
  };
}

/**
 * Predefined cache configurations for common use cases
 */
export const CachePresets = {
  /**
   * Medical codes cache (24 hours)
   * Safe to cache: Reference data, no PHI
   */
  medicalCodes: (keyGenerator?: (req: Request) => string): CacheMiddlewareConfig => ({
    namespace: 'medical-codes',
    ttl: CACHE_CONFIG.medical_codes.ttl,
    enabled: CACHE_CONFIG.medical_codes.enabled,
    keyGenerator,
    stripPHI: false, // No PHI in medical codes
  }),
  
  /**
   * Organization settings cache (1 hour)
   * Warning: Must strip PHI fields
   */
  organizationSettings: (keyGenerator?: (req: Request) => string): CacheMiddlewareConfig => ({
    namespace: 'organization',
    ttl: CACHE_CONFIG.organizations.ttl,
    enabled: CACHE_CONFIG.organizations.enabled,
    keyGenerator,
    stripPHI: true, // Strip PHI fields like businessEin, addresses, etc.
  }),
  
  /**
   * Public therapist data cache (30 minutes)
   * Warning: Must strip PHI fields
   */
  therapistPublic: (keyGenerator?: (req: Request) => string): CacheMiddlewareConfig => ({
    namespace: 'therapist-public',
    ttl: CACHE_CONFIG.therapists.ttl,
    enabled: CACHE_CONFIG.therapists.enabled,
    keyGenerator,
    stripPHI: true, // Strip personal contact info, license numbers, etc.
  }),
};

/**
 * Helper to invalidate medical codes cache
 */
export async function invalidateMedicalCodesCache(codeType?: 'cpt' | 'icd10' | 'hcpcs'): Promise<void> {
  if (codeType) {
    await CacheService.deletePattern(`medical-codes:${codeType}:*`);
  } else {
    await CacheService.deletePattern('medical-codes:*');
  }
}

/**
 * Helper to invalidate organization cache
 */
export async function invalidateOrganizationCache(organizationId: number): Promise<void> {
  await CacheService.deletePattern(`organization:*:${organizationId}:*`);
  await CacheService.delete(`organization:settings:${organizationId}`);
}

/**
 * Helper to invalidate therapist cache
 */
export async function invalidateTherapistCache(therapistId: number): Promise<void> {
  await CacheService.deletePattern(`therapist-public:*:${therapistId}:*`);
  await CacheService.delete(`therapist-public:${therapistId}`);
}

