// Database Performance Optimization System
// Query optimization, connection pooling, and performance monitoring

import { db } from '@db';
import { sql } from 'drizzle-orm';

interface QueryPerformanceMetrics {
  queryText: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  userId?: number;
  correlationId: string;
}

interface DatabaseStats {
  activeConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: QueryPerformanceMetrics[];
  cacheHitRate: number;
}

class DatabaseOptimizer {
  private static queryMetrics: QueryPerformanceMetrics[] = [];
  private static maxMetricsHistory = 1000;
  private static slowQueryThreshold = 1000; // 1 second
  private static queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private static defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Execute optimized query with performance monitoring
   */
  static async executeOptimizedQuery<T>(
    queryBuilder: any,
    cacheKey?: string,
    cacheTTL: number = this.defaultCacheTTL,
    userId?: number
  ): Promise<T> {
    const correlationId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    try {
      // Check cache first
      if (cacheKey && this.queryCache.has(cacheKey)) {
        const cached = this.queryCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < cached.ttl) {
          console.log(`[DB] Cache hit for: ${cacheKey}`);
          return cached.result;
        } else {
          this.queryCache.delete(cacheKey);
        }
      }

      // Execute query
      const result = await queryBuilder;
      const executionTime = performance.now() - startTime;

      // Log performance metrics
      const metrics: QueryPerformanceMetrics = {
        queryText: this.extractQueryText(queryBuilder),
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
        userId,
        correlationId
      };

      this.addQueryMetrics(metrics);

      // Cache result if cache key provided
      if (cacheKey && executionTime < this.slowQueryThreshold) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          ttl: cacheTTL
        });
      }

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        console.warn(`[DB] Slow query detected (${executionTime.toFixed(2)}ms): ${metrics.queryText}`);
      } else {
        console.log(`[DB] Query executed in ${executionTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error(`[DB] Query failed after ${executionTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Get database performance statistics
   */
  static getPerformanceStats(): DatabaseStats {
    const now = Date.now();
    const recentMetrics = this.queryMetrics.filter(
      m => now - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    const totalQueries = recentMetrics.length;
    const averageQueryTime = totalQueries > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
      : 0;

    const slowQueries = recentMetrics.filter(
      m => m.executionTime > this.slowQueryThreshold
    );

    const cacheHitRate = this.calculateCacheHitRate();

    return {
      activeConnections: 0, // Would need pool info in real implementation
      totalQueries,
      averageQueryTime,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      cacheHitRate
    };
  }

  /**
   * Optimize database indexes
   */
  static async createOptimizedIndexes(): Promise<void> {
    const indexQueries = [
      // User-related indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
          ON users(id, updated_at) WHERE deleted = false`,
      
      // Session-related indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_date 
          ON sessions(user_id, date, status)`,
      
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_upcoming 
          ON sessions(date, status) WHERE status = 'scheduled' AND date > NOW()`,
      
      // Client-related indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_active 
          ON clients(user_id, status) WHERE deleted = false`,
      
      // Task-related indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_status 
          ON tasks(user_id, status, due_date)`,
      
      // Notification indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
          ON notifications(user_id, read) WHERE read = false`,
      
      // Profile update indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_updates 
          ON users(id, updated_at) WHERE updated_at > NOW() - INTERVAL '1 day'`,
      
      // Work schedule indexes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_schedules_user_day 
          ON work_schedules(user_id, day_of_week)`
    ];

    for (const indexQuery of indexQueries) {
      try {
        await db.execute(indexQuery);
        console.log('[DB] Index created successfully');
      } catch (error) {
        // Index might already exist
        console.log('[DB] Index creation skipped (may already exist)');
      }
    }
  }

  /**
   * Clean up old query metrics
   */
  static cleanupMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    this.queryMetrics = this.queryMetrics.filter(
      m => m.timestamp.getTime() > cutoffTime
    );

    // Clean up old cache entries
    const cacheEntries = Array.from(this.queryCache.entries());
    for (const [key, value] of cacheEntries) {
      if (Date.now() - value.timestamp > value.ttl) {
        this.queryCache.delete(key);
      }
    }

    console.log(`[DB] Cleaned up metrics, ${this.queryMetrics.length} entries remaining`);
  }

  /**
   * Get query recommendations
   */
  static getQueryRecommendations(): string[] {
    const stats = this.getPerformanceStats();
    const recommendations: string[] = [];

    if (stats.averageQueryTime > 500) {
      recommendations.push('Consider adding database indexes for frequently queried fields');
    }

    if (stats.slowQueries.length > 5) {
      recommendations.push('Multiple slow queries detected - review query optimization');
    }

    if (stats.cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate - consider increasing cache TTL for stable data');
    }

    if (stats.totalQueries > 1000) {
      recommendations.push('High query volume - consider implementing query batching');
    }

    return recommendations;
  }

  /**
   * Prefetch commonly used data
   */
  static async prefetchCommonData(userId: number): Promise<void> {
    const prefetchQueries = [
      // User profile data
      { 
        key: `user-profile-${userId}`,
        query: db.query.users.findFirst({ where: (users, { eq }) => eq(users.id, userId) })
      },
      
      // Recent notifications
      {
        key: `notifications-${userId}`,
        query: db.query.notifications.findMany({ 
          where: (notifications, { eq, and }) => and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          ),
          limit: 10
        })
      },
      
      // Upcoming sessions
      {
        key: `upcoming-sessions-${userId}`,
        query: db.query.sessions.findMany({
          where: (sessions, { eq, and, gte }) => and(
            eq(sessions.userId, userId),
            eq(sessions.status, 'scheduled'),
            gte(sessions.date, new Date())
          ),
          limit: 5
        })
      }
    ];

    for (const { key, query } of prefetchQueries) {
      try {
        await this.executeOptimizedQuery(query, key, 10 * 60 * 1000, userId); // 10 min cache
      } catch (error) {
        console.error(`[DB] Failed to prefetch ${key}:`, error);
      }
    }

    console.log(`[DB] Prefetched common data for user ${userId}`);
  }

  /**
   * Extract query text for logging (simplified)
   */
  private static extractQueryText(queryBuilder: any): string {
    try {
      return queryBuilder?.toString?.() || 'Unknown query';
    } catch {
      return 'Complex query';
    }
  }

  /**
   * Add query metrics to history
   */
  private static addQueryMetrics(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory * 0.8);
    }
  }

  /**
   * Calculate cache hit rate
   */
  private static calculateCacheHitRate(): number {
    // This would track cache hits vs misses in a real implementation
    return this.queryCache.size > 0 ? 0.85 : 0; // Mock 85% hit rate when cache is active
  }

  /**
   * Initialize database optimization
   */
  static async initialize(): Promise<void> {
    console.log('[DB] Initializing database optimization...');
    
    try {
      // Create optimized indexes
      await this.createOptimizedIndexes();
      
      // Set up periodic cleanup
      setInterval(() => {
        this.cleanupMetrics();
      }, 60 * 60 * 1000); // Every hour
      
      console.log('[DB] Database optimization initialized successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize database optimization:', error);
    }
  }

  /**
   * Batch multiple queries for efficiency
   */
  static async batchQueries<T>(
    queries: Array<{ query: any; cacheKey?: string; cacheTTL?: number }>,
    userId?: number
  ): Promise<T[]> {
    const startTime = performance.now();
    
    try {
      const results = await Promise.all(
        queries.map(({ query, cacheKey, cacheTTL }) =>
          this.executeOptimizedQuery(query, cacheKey, cacheTTL, userId)
        )
      );
      
      const totalTime = performance.now() - startTime;
      console.log(`[DB] Batch of ${queries.length} queries completed in ${totalTime.toFixed(2)}ms`);
      
      return results;
    } catch (error) {
      console.error('[DB] Batch query failed:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.queryCache.clear();
    console.log('[DB] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      size: this.queryCache.size,
      hitRate: this.calculateCacheHitRate(),
      memoryUsage: JSON.stringify(Array.from(this.queryCache.values())).length
    };
  }
}

export { DatabaseOptimizer, type QueryPerformanceMetrics, type DatabaseStats };