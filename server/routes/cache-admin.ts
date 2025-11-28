import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { CacheService } from '../services/CacheService';
import { db } from '@db';
import { organizationMemberships } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Cache Administration Routes
 * 
 * Provides endpoints for cache monitoring and management.
 * All endpoints require business_owner role for security.
 */

/**
 * Check if user has business_owner permission
 */
async function checkBusinessOwnerPermission(userId: number): Promise<boolean> {
  try {
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
    
    if (!membership) {
      return false;
    }
    
    return membership.role === 'business_owner';
  } catch (error) {
    console.error('Error checking business owner permission:', error);
    return false;
  }
}

/**
 * GET /api/admin/cache/stats
 * Get cache statistics and health information
 * Requires: business_owner role
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check permission
    const hasPermission = await checkBusinessOwnerPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only business owners can access cache statistics'
      });
    }
    
    // Get cache stats
    const stats = await CacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ 
      error: 'CACHE_STATS_FETCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch cache statistics'
    });
  }
});

/**
 * GET /api/admin/cache/health
 * Check cache health
 * Requires: business_owner role
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check permission
    const hasPermission = await checkBusinessOwnerPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only business owners can check cache health'
      });
    }
    
    // Check if cache is healthy
    const isHealthy = await CacheService.isHealthy();
    
    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking cache health:', error);
    res.status(500).json({ 
      error: 'CACHE_HEALTH_CHECK_FAILED',
      message: error instanceof Error ? error.message : 'Failed to check cache health'
    });
  }
});

/**
 * POST /api/admin/cache/clear
 * Clear all cache
 * Requires: business_owner role
 */
router.post('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check permission
    const hasPermission = await checkBusinessOwnerPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only business owners can clear cache'
      });
    }
    
    // Clear all cache
    await CacheService.clear();
    
    console.log(`[Cache] All cache cleared by user ${userId}`);
    
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'CACHE_CLEAR_FAILED',
      message: error instanceof Error ? error.message : 'Failed to clear cache'
    });
  }
});

/**
 * POST /api/admin/cache/clear/:namespace
 * Clear cache for a specific namespace
 * Requires: business_owner role
 */
router.post('/clear/:namespace', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check permission
    const hasPermission = await checkBusinessOwnerPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only business owners can clear cache'
      });
    }
    
    const { namespace } = req.params;
    
    // Validate namespace
    const validNamespaces = ['medical-codes', 'organization', 'therapist-public'];
    if (!validNamespaces.includes(namespace)) {
      return res.status(400).json({
        error: 'INVALID_NAMESPACE',
        message: `Invalid namespace. Valid options: ${validNamespaces.join(', ')}`
      });
    }
    
    // Clear namespace
    await CacheService.deletePattern(`${namespace}:*`);
    
    console.log(`[Cache] Namespace "${namespace}" cleared by user ${userId}`);
    
    res.json({
      success: true,
      message: `Cache cleared for namespace: ${namespace}`
    });
  } catch (error) {
    console.error('Error clearing cache namespace:', error);
    res.status(500).json({ 
      error: 'CACHE_CLEAR_FAILED',
      message: error instanceof Error ? error.message : 'Failed to clear cache namespace'
    });
  }
});

/**
 * POST /api/admin/cache/warm
 * Warm the cache by preloading common data
 * Requires: business_owner role
 */
router.post('/warm', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check permission
    const hasPermission = await checkBusinessOwnerPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only business owners can warm cache'
      });
    }
    
    // Warm cache
    await CacheService.warmCache();
    
    console.log(`[Cache] Cache warmed by user ${userId}`);
    
    res.json({
      success: true,
      message: 'Cache warmed successfully'
    });
  } catch (error) {
    console.error('Error warming cache:', error);
    res.status(500).json({ 
      error: 'CACHE_WARM_FAILED',
      message: error instanceof Error ? error.message : 'Failed to warm cache'
    });
  }
});

export default router;

