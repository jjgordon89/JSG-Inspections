import { memo, useMemo, useCallback, lazy } from 'react';
import React from 'react';

/**
 * Performance optimization utilities for React components
 * Enhanced with photo optimization and bundle analysis capabilities
 */

// Memoization helper for expensive calculations
export const useMemoizedData = (data, dependencies = []) => {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data;
  }, dependencies);
};

// Debounced search hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Optimized list renderer with virtualization support
export const OptimizedList = memo(({ items, renderItem, keyExtractor, className = '' }) => {
  const memoizedItems = useMemoizedData(items, [items]);
  
  return (
    <div className={`optimized-list ${className}`}>
      {memoizedItems.map((item, index) => (
        <div key={keyExtractor ? keyExtractor(item, index) : index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
});

// Lazy loading wrapper for heavy components
export const createLazyComponent = (importFunc, fallback = <div>Loading...</div>) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
};

// Optimized event handlers
export const createOptimizedHandlers = (handlers) => {
  const memoizedHandlers = {};
  
  Object.keys(handlers).forEach(key => {
    memoizedHandlers[key] = useCallback(handlers[key], []);
  });
  
  return memoizedHandlers;
};

// Data filtering and sorting utilities
export const useOptimizedFilter = (data, filterFn, dependencies = []) => {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(filterFn);
  }, [data, ...dependencies]);
};

export const useOptimizedSort = (data, sortFn, dependencies = []) => {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].sort(sortFn);
  }, [data, ...dependencies]);
};

// Batch API calls utility
export const batchApiCalls = async (apiCalls, batchSize = 5) => {
  const results = [];
  
  for (let i = 0; i < apiCalls.length; i += batchSize) {
    const batch = apiCalls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    // Small delay between batches to prevent overwhelming the API
    if (i + batchSize < apiCalls.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return results;
};

// Memory usage monitoring
export const useMemoryMonitor = (componentName) => {
  React.useEffect(() => {
    if (performance.memory) {
      const initialMemory = performance.memory.usedJSHeapSize;
      
      return () => {
        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryDiff = finalMemory - initialMemory;
        
        if (memoryDiff > 1024 * 1024) { // 1MB threshold
          console.warn(`High memory usage in ${componentName}: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
        }
      };
    }
  }, [componentName]);
};

// Component size optimization
export const withSizeOptimization = (Component) => {
  return memo((props) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef();
    
    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
      
      if (ref.current) {
        observer.observe(ref.current);
      }
      
      return () => observer.disconnect();
    }, []);
    
    return (
      <div ref={ref}>
        {isVisible ? <Component {...props} /> : <div style={{ height: '200px' }}>Loading...</div>}
      </div>
    );
  });
};

/**
 * Photo optimization utilities
 */
export const PhotoOptimizer = {
  /**
   * Compress and resize image file
   * @param {File} file - Image file to optimize
   * @param {Object} options - Optimization options
   * @returns {Promise<Blob>} - Optimized image blob
   */
  async optimizeImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, format, quality);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Generate multiple sizes for responsive images
   * @param {File} file - Original image file
   * @returns {Promise<Object>} - Object with different sized images
   */
  async generateResponsiveSizes(file) {
    const sizes = {
      thumbnail: { maxWidth: 150, maxHeight: 150, quality: 0.7 },
      small: { maxWidth: 480, maxHeight: 320, quality: 0.8 },
      medium: { maxWidth: 1024, maxHeight: 768, quality: 0.8 },
      large: { maxWidth: 1920, maxHeight: 1080, quality: 0.85 }
    };

    const results = {};
    
    for (const [sizeName, options] of Object.entries(sizes)) {
      try {
        results[sizeName] = await this.optimizeImage(file, options);
      } catch (error) {
        console.warn(`Failed to generate ${sizeName} size:`, error);
      }
    }

    return results;
  },

  /**
   * Estimate file size reduction
   * @param {File} originalFile - Original file
   * @param {Blob} optimizedBlob - Optimized blob
   * @returns {Object} - Size comparison stats
   */
  getSizeStats(originalFile, optimizedBlob) {
    const originalSize = originalFile.size;
    const optimizedSize = optimizedBlob.size;
    const reduction = ((originalSize - optimizedSize) / originalSize) * 100;

    return {
      originalSize,
      optimizedSize,
      reduction: Math.round(reduction * 100) / 100,
      compressionRatio: Math.round((originalSize / optimizedSize) * 100) / 100
    };
  }
};

/**
 * Bundle analysis utilities
 */
export const BundleAnalyzer = {
  /**
   * Analyze current bundle size and performance
   * @returns {Object} - Bundle analysis results
   */
  analyzeBundleSize() {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    const analysis = {
      scripts: scripts.map(script => ({
        src: script.src,
        async: script.async,
        defer: script.defer
      })),
      stylesheets: stylesheets.map(link => ({
        href: link.href,
        media: link.media
      })),
      totalScripts: scripts.length,
      totalStylesheets: stylesheets.length
    };

    return analysis;
  },

  /**
   * Monitor resource loading performance
   * @returns {Object} - Resource loading metrics
   */
  getResourceMetrics() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return null;
    }

    const resources = window.performance.getEntriesByType('resource');
    const navigation = window.performance.getEntriesByType('navigation')[0];

    const metrics = {
      totalResources: resources.length,
      totalLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      largestResources: resources
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 10)
        .map(resource => ({
          name: resource.name,
          size: resource.transferSize,
          duration: resource.duration,
          type: resource.initiatorType
        }))
    };

    return metrics;
  },

  /**
   * Get recommendations for bundle optimization
   * @returns {Array} - Array of optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const metrics = this.getResourceMetrics();
    
    if (!metrics) {
      return ['Performance API not available'];
    }

    // Check for large resources
    const largeResources = metrics.largestResources.filter(r => r.size > 500000); // > 500KB
    if (largeResources.length > 0) {
      recommendations.push(`Consider code splitting or lazy loading for ${largeResources.length} large resources`);
    }

    // Check total load time
    if (metrics.totalLoadTime > 3000) {
      recommendations.push('Total load time exceeds 3 seconds - consider optimizing critical resources');
    }

    // Check DOM content loaded time
    if (metrics.domContentLoaded > 1500) {
      recommendations.push('DOM content loaded time is slow - optimize critical CSS and JavaScript');
    }

    // Check number of resources
    if (metrics.totalResources > 50) {
      recommendations.push('High number of resources - consider bundling or HTTP/2 server push');
    }

    return recommendations.length > 0 ? recommendations : ['Bundle performance looks good!'];
  }
};

/**
 * Memory usage monitoring
 */
export const MemoryMonitor = {
  /**
   * Get current memory usage (if available)
   * @returns {Object|null} - Memory usage information
   */
  getMemoryUsage() {
    if (!window.performance || !window.performance.memory) {
      return null;
    }

    const memory = window.performance.memory;
    return {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      usage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100) // %
    };
  },

  /**
   * Monitor memory usage over time
   * @param {number} interval - Monitoring interval in ms
   * @param {Function} callback - Callback function for memory updates
   * @returns {Function} - Cleanup function
   */
  startMonitoring(interval = 5000, callback) {
    const monitor = setInterval(() => {
      const usage = this.getMemoryUsage();
      if (usage && callback) {
        callback(usage);
      }
    }, interval);

    return () => clearInterval(monitor);
  }
};

/**
 * Performance budget checker
 */
export const PerformanceBudget = {
  budgets: {
    loadTime: 3000, // 3 seconds
    domContentLoaded: 1500, // 1.5 seconds
    maxResourceSize: 500000, // 500KB
    maxResources: 50,
    maxMemoryUsage: 80 // 80% of heap limit
  },

  /**
   * Check if current performance meets budget
   * @returns {Object} - Budget compliance report
   */
  checkBudget() {
    const metrics = BundleAnalyzer.getResourceMetrics();
    const memory = MemoryMonitor.getMemoryUsage();
    const results = {};

    if (metrics) {
      results.loadTime = {
        actual: metrics.totalLoadTime,
        budget: this.budgets.loadTime,
        passed: metrics.totalLoadTime <= this.budgets.loadTime
      };

      results.domContentLoaded = {
        actual: metrics.domContentLoaded,
        budget: this.budgets.domContentLoaded,
        passed: metrics.domContentLoaded <= this.budgets.domContentLoaded
      };

      results.resourceCount = {
        actual: metrics.totalResources,
        budget: this.budgets.maxResources,
        passed: metrics.totalResources <= this.budgets.maxResources
      };

      const largeResources = metrics.largestResources.filter(r => r.size > this.budgets.maxResourceSize);
      results.resourceSize = {
        actual: largeResources.length,
        budget: 0,
        passed: largeResources.length === 0
      };
    }

    if (memory) {
      results.memoryUsage = {
        actual: memory.usage,
        budget: this.budgets.maxMemoryUsage,
        passed: memory.usage <= this.budgets.maxMemoryUsage
      };
    }

    return results;
  }
};

export default {
  useMemoizedData,
  useDebounce,
  OptimizedList,
  createLazyComponent,
  usePerformanceMonitor,
  createOptimizedHandlers,
  useOptimizedFilter,
  useOptimizedSort,
  batchApiCalls,
  useMemoryMonitor,
  withSizeOptimization,
  PhotoOptimizer,
  BundleAnalyzer,
  MemoryMonitor,
  PerformanceBudget
};