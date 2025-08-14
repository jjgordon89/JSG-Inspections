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
    this.hitCount = 0;
    this.missCount = 0;
    this.backgroundSyncQueue = new Map();
    this.syncInProgress = false;
    this.offlineMode = false;
    this.compressionEnabled = true;
    this.persistentStorage = null;
    
    // Initialize persistent storage if available
    this.initPersistentStorage();
    
    // Setup background sync
    this.setupBackgroundSync();
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.offlineMode = !navigator.onLine;
    }
    
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
  async set(category, operation, params = {}, data) {
    const key = this._generateKey(category, operation, params);
    const timestamp = Date.now();
    
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, timestamp);
    
    // Save to persistent storage if available
    if (this.persistentStorage) {
      await this.saveToPersistentStorage(key, data, timestamp);
    }
    
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
   * Initialize persistent storage
   */
  async initPersistentStorage() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        this.persistentStorage = await this.openIndexedDB();
        await this.loadFromPersistentStorage();
      } catch (error) {
        console.warn('Failed to initialize persistent storage:', error);
      }
    }
  }

  /**
   * Open IndexedDB for persistent caching
   */
  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('JSGInspectionsCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Load cache from persistent storage
   */
  async loadFromPersistentStorage() {
    if (!this.persistentStorage) return;
    
    try {
      const transaction = this.persistentStorage.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result;
        items.forEach(item => {
          if (this._isValidPersistent(item)) {
            this.cache.set(item.key, item.data);
            this.cacheTimestamps.set(item.key, item.timestamp);
          }
        });
      };
    } catch (error) {
      console.warn('Failed to load from persistent storage:', error);
    }
  }

  /**
   * Save to persistent storage
   */
  async saveToPersistentStorage(key, data, timestamp) {
    if (!this.persistentStorage) return;
    
    try {
      const transaction = this.persistentStorage.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const compressedData = this.compressionEnabled ? 
        await this.compressData(data) : data;
      
      store.put({
        key,
        data: compressedData,
        timestamp,
        compressed: this.compressionEnabled
      });
    } catch (error) {
      console.warn('Failed to save to persistent storage:', error);
    }
  }

  /**
   * Setup background sync
   */
  setupBackgroundSync() {
    // Periodic sync every 30 seconds
    setInterval(() => {
      if (!this.offlineMode && !this.syncInProgress) {
        this.performBackgroundSync();
      }
    }, 30000);
  }

  /**
   * Handle online event
   */
  async handleOnline() {
    this.offlineMode = false;
    console.log('Cache: Back online, starting sync...');
    await this.performBackgroundSync();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    this.offlineMode = true;
    console.log('Cache: Offline mode activated');
  }

  /**
   * Perform background sync
   */
  async performBackgroundSync() {
    if (this.syncInProgress || this.offlineMode) return;
    
    this.syncInProgress = true;
    
    try {
      // Process sync queue
      for (const [id, operation] of this.backgroundSyncQueue) {
        try {
          await this.executeSyncOperation(operation);
          this.backgroundSyncQueue.delete(id);
        } catch (error) {
          console.warn(`Background sync failed for operation ${id}:`, error);
        }
      }
      
      // Refresh critical data
      await this.refreshCriticalData();
      
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Add operation to background sync queue
   */
  addToSyncQueue(operation) {
    const id = Date.now() + Math.random();
    this.backgroundSyncQueue.set(id, {
      ...operation,
      timestamp: Date.now()
    });
    return id;
  }

  /**
   * Execute sync operation
   */
  async executeSyncOperation(operation) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.secureOperation(
        operation.category,
        operation.operation,
        operation.params
      );
    }
  }

  /**
   * Refresh critical data in background
   */
  async refreshCriticalData() {
    const criticalOperations = [
      { category: 'equipment', operation: 'getStatusCounts' },
      { category: 'inspections', operation: 'getCount' },
      { category: 'deficiencies', operation: 'getOpenCritical' },
      { category: 'workOrders', operation: 'getDueToday' }
    ];
    
    for (const op of criticalOperations) {
      try {
        const data = await this.executeSyncOperation(op);
        if (data !== undefined) {
          this.set(op.category, op.operation, {}, data);
        }
      } catch (error) {
        console.warn(`Failed to refresh ${op.category}.${op.operation}:`, error);
      }
    }
  }

  /**
   * Compress data for storage
   */
  async compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      if (typeof CompressionStream !== 'undefined') {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonString));
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
      }
      return data; // Fallback to uncompressed
    } catch (error) {
      console.warn('Compression failed:', error);
      return data;
    }
  }

  /**
   * Check if persistent cache item is valid
   */
  _isValidPersistent(item) {
    const operationKey = item.key.split(':')[0];
    const ttl = this.ttlConfig[operationKey] || this.defaultTTL;
    return (Date.now() - item.timestamp) < ttl;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      entries: Array.from(this.cache.keys()),
      offlineMode: this.offlineMode,
      syncQueueSize: this.backgroundSyncQueue.size,
      syncInProgress: this.syncInProgress,
      persistentStorageEnabled: !!this.persistentStorage
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

// Initialize cache features
(async () => {
  await dataCache.initPersistentStorage();
  dataCache.setupBackgroundSync();
  
  // Setup online/offline event listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => dataCache.handleOnline());
    window.addEventListener('offline', () => dataCache.handleOffline());
  }
  
  // Initialize cache warmup
  dataCache.warmUp();
})();

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