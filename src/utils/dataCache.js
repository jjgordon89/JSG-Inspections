/**
 * Data Caching Layer
 * 
 * Provides intelligent caching for frequently accessed database operations
 * to improve performance and reduce database load.
 */

class DataCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxCacheSize = 100; // Maximum number of cached items
    
    // Different TTL for different data types
    this.ttlConfig = {
      'equipment.getAll': 10 * 60 * 1000, // 10 minutes - equipment changes less frequently
      'equipment.getStatusCounts': 5 * 60 * 1000, // 5 minutes
      'equipment.getDistinctTypes': 30 * 60 * 1000, // 30 minutes - types rarely change
      'inspections.getCount': 2 * 60 * 1000, // 2 minutes - inspections change more frequently
      'inspections.getPerMonth': 10 * 60 * 1000, // 10 minutes
      'inspections.getComplianceStatus': 5 * 60 * 1000, // 5 minutes
      'inspections.getOverdue': 5 * 60 * 1000, // 5 minutes
      'scheduledInspections.getUpcoming': 5 * 60 * 1000, // 5 minutes
      'loadTests.getTotal': 10 * 60 * 1000, // 10 minutes
      'loadTests.getOverdue': 5 * 60 * 1000, // 5 minutes
      'calibrations.getTotal': 10 * 60 * 1000, // 10 minutes
      'calibrations.getOverdue': 5 * 60 * 1000, // 5 minutes
      'certificates.getTotal': 10 * 60 * 1000, // 10 minutes
      'credentials.getTotal': 10 * 60 * 1000, // 10 minutes
      'credentials.getExpiring': 5 * 60 * 1000, // 5 minutes
    };
    
    // Operations that should invalidate related cache entries
    this.invalidationRules = {
      'equipment.create': ['equipment.getAll', 'equipment.getStatusCounts', 'equipment.getDistinctTypes'],
      'equipment.update': ['equipment.getAll', 'equipment.getStatusCounts'],
      'equipment.delete': ['equipment.getAll', 'equipment.getStatusCounts'],
      'inspections.create': ['inspections.getCount', 'inspections.getPerMonth', 'inspections.getComplianceStatus'],
      'inspections.createFromScheduled': ['inspections.getCount', 'inspections.getPerMonth', 'inspections.getComplianceStatus'],
      'scheduledInspections.create': ['scheduledInspections.getUpcoming'],
      'scheduledInspections.update': ['scheduledInspections.getUpcoming'],
      'scheduledInspections.delete': ['scheduledInspections.getUpcoming'],
      'loadTests.create': ['loadTests.getTotal'],
      'calibrations.create': ['calibrations.getTotal'],
      'credentials.create': ['credentials.getTotal'],
      'credentials.updateStatus': ['credentials.getTotal', 'credentials.getExpiring'],
    };
  }

  /**
   * Generate cache key from operation and parameters
   */
  _generateKey(category, operation, params = {}) {
    const baseKey = `${category}.${operation}`;
    if (Object.keys(params).length === 0) {
      return baseKey;
    }
    
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${baseKey}:${sortedParams}`;
  }

  /**
   * Check if cached data is still valid
   */
  _isValid(key) {
    if (!this.cache.has(key) || !this.cacheTimestamps.has(key)) {
      return false;
    }
    
    const timestamp = this.cacheTimestamps.get(key);
    const operationKey = key.split(':')[0]; // Get base operation key
    const ttl = this.ttlConfig[operationKey] || this.defaultTTL;
    
    return (Date.now() - timestamp) < ttl;
  }

  /**
   * Clean up expired cache entries
   */
  _cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      const operationKey = key.split(':')[0];
      const ttl = this.ttlConfig[operationKey] || this.defaultTTL;
      
      if ((now - timestamp) >= ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Enforce cache size limit using LRU strategy
   */
  _enforceSizeLimit() {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }
    
    // Sort by timestamp (oldest first)
    const sortedEntries = Array.from(this.cacheTimestamps.entries())
      .sort((a, b) => a[1] - b[1]);
    
    // Remove oldest entries
    const entriesToRemove = sortedEntries.slice(0, this.cache.size - this.maxCacheSize);
    entriesToRemove.forEach(([key]) => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Get cached data if available and valid
   */
  get(category, operation, params = {}) {
    const key = this._generateKey(category, operation, params);
    
    if (this._isValid(key)) {
      // Update timestamp for LRU
      this.cacheTimestamps.set(key, Date.now());
      return this.cache.get(key);
    }
    
    return null;
  }

  /**
   * Store data in cache
   */
  set(category, operation, params = {}, data) {
    const key = this._generateKey(category, operation, params);
    
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
    
    this._enforceSizeLimit();
    
    // Periodic cleanup
    if (Math.random() < 0.1) { // 10% chance
      this._cleanup();
    }
  }

  /**
   * Invalidate cache entries based on operation
   */
  invalidate(category, operation) {
    const operationKey = `${category}.${operation}`;
    const rulesToInvalidate = this.invalidationRules[operationKey] || [];
    
    // Add the operation itself to invalidation list
    const allToInvalidate = [operationKey, ...rulesToInvalidate];
    
    allToInvalidate.forEach(ruleKey => {
      const keysToDelete = [];
      
      for (const key of this.cache.keys()) {
        if (key.startsWith(ruleKey)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      });
    });
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmUp(secureOperation) {
    const warmUpOperations = [
      { category: 'equipment', operation: 'getAll' },
      { category: 'equipment', operation: 'getStatusCounts' },
      { category: 'equipment', operation: 'getDistinctTypes' },
      { category: 'inspections', operation: 'getCount' },
      { category: 'loadTests', operation: 'getTotal' },
      { category: 'calibrations', operation: 'getTotal' },
      { category: 'certificates', operation: 'getTotal' },
      { category: 'credentials', operation: 'getTotal' }
    ];

    const promises = warmUpOperations.map(async ({ category, operation }) => {
      try {
        const data = await secureOperation(category, operation, {});
        this.set(category, operation, {}, data);
      } catch (error) {
        console.warn(`Cache warm-up failed for ${category}.${operation}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}

// Create singleton instance
const dataCache = new DataCache();

/**
 * Cached wrapper for secure database operations
 */
export const cachedSecureOperation = async (category, operation, params = {}) => {
  // Check if this operation should be cached
  const operationKey = `${category}.${operation}`;
  const shouldCache = Object.keys(dataCache.ttlConfig).includes(operationKey) || 
                     operation.startsWith('get');
  
  if (!shouldCache) {
    // For write operations, invalidate cache and execute directly
    if (['create', 'update', 'delete'].some(op => operation.includes(op))) {
      dataCache.invalidate(category, operation);
    }
    return await window.api.secureOperation(category, operation, params);
  }
  
  // Try to get from cache first
  const cachedData = dataCache.get(category, operation, params);
  if (cachedData !== null) {
    return cachedData;
  }
  
  // Fetch from database and cache the result
  try {
    const data = await window.api.secureOperation(category, operation, params);
    dataCache.set(category, operation, params, data);
    return data;
  } catch (error) {
    console.error(`Cached operation failed for ${category}.${operation}:`, error);
    throw error;
  }
};

/**
 * Preload commonly accessed data
 */
export const preloadDashboardData = async () => {
  if (typeof window !== 'undefined' && window.api) {
    await dataCache.warmUp(window.api.secureOperation);
  }
};

/**
 * Clear cache (useful for testing or manual refresh)
 */
export const clearCache = () => {
  dataCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return dataCache.getStats();
};

export default dataCache;