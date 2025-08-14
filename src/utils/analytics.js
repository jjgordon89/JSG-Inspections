/**
 * Analytics and Monitoring Utilities for JSG Inspections
 * Provides comprehensive analytics, user behavior tracking, performance monitoring, and business intelligence
 * Uses browser-compatible APIs for performance monitoring
 */

class AnalyticsManager {
  constructor() {
    this.events = [];
    this.userSessions = new Map();
    this.performanceMetrics = new Map();
    this.businessMetrics = new Map();
    this.errorTracking = [];
    this.featureUsage = new Map();
    this.userBehavior = new Map();
    this.dashboardMetrics = new Map();
    
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.startTime = Date.now();
    
    this.init();
  }

  /**
   * Initialize analytics system
   */
  init() {
    this.setupEventListeners();
    this.startSessionTracking();
    this.setupPerformanceMonitoring();
    this.setupErrorTracking();
    this.setupBusinessMetricsTracking();
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId) {
    this.userId = userId;
    this.trackEvent('user_identified', { userId });
  }

  /**
   * Setup event listeners for automatic tracking
   */
  setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Page visibility changes
      document.addEventListener('visibilitychange', () => {
        this.trackEvent('page_visibility_change', {
          hidden: document.hidden,
          visibilityState: document.visibilityState
        });
      });

      // Click tracking
      document.addEventListener('click', (event) => {
        this.trackClick(event);
      });

      // Form submissions
      document.addEventListener('submit', (event) => {
        this.trackFormSubmission(event);
      });

      // Page unload
      window.addEventListener('beforeunload', () => {
        this.endSession();
      });

      // Route changes (for SPAs)
      window.addEventListener('popstate', () => {
        this.trackPageView(window.location.pathname);
      });
    }
  }

  /**
   * Start session tracking
   */
  startSessionTracking() {
    const session = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      lastActivity: this.startTime,
      pageViews: [],
      events: [],
      duration: 0,
      bounced: false,
      device: this.getDeviceInfo(),
      browser: this.getBrowserInfo(),
      referrer: typeof window !== 'undefined' ? document.referrer : null
    };

    this.userSessions.set(this.sessionId, session);
    this.trackEvent('session_start', { sessionId: this.sessionId });
  }

  /**
   * End current session
   */
  endSession() {
    const session = this.userSessions.get(this.sessionId);
    if (session) {
      session.duration = Date.now() - session.startTime;
      session.bounced = session.pageViews.length <= 1 && session.duration < 30000;
      
      this.trackEvent('session_end', {
        sessionId: this.sessionId,
        duration: session.duration,
        bounced: session.bounced,
        pageViews: session.pageViews.length
      });

      this.sendAnalyticsData();
    }
  }

  /**
   * Track custom event
   */
  trackEvent(eventName, properties = {}) {
    const event = {
      eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      }
    };

    this.events.push(event);
    
    // Update session last activity
    const session = this.userSessions.get(this.sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.events.push(event);
    }

    // Track feature usage
    this.updateFeatureUsage(eventName, properties);

    console.log('Analytics: Event tracked:', eventName, properties);
  }

  /**
   * Track page view
   */
  trackPageView(path, title = null) {
    const pageView = {
      path,
      title: title || (typeof document !== 'undefined' ? document.title : null),
      timestamp: Date.now(),
      referrer: typeof document !== 'undefined' ? document.referrer : null
    };

    const session = this.userSessions.get(this.sessionId);
    if (session) {
      session.pageViews.push(pageView);
    }

    this.trackEvent('page_view', pageView);
  }

  /**
   * Track click events
   */
  trackClick(event) {
    const element = event.target;
    const clickData = {
      elementType: element.tagName.toLowerCase(),
      elementId: element.id || null,
      elementClass: element.className || null,
      elementText: element.textContent?.substring(0, 100) || null,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };

    // Track specific UI interactions
    if (element.closest('button')) {
      this.trackEvent('button_click', clickData);
    } else if (element.closest('a')) {
      this.trackEvent('link_click', clickData);
    } else if (element.closest('.menu-item')) {
      this.trackEvent('menu_click', clickData);
    }
  }

  /**
   * Track form submissions
   */
  trackFormSubmission(event) {
    const form = event.target;
    const formData = {
      formId: form.id || null,
      formClass: form.className || null,
      formAction: form.action || null,
      formMethod: form.method || null,
      fieldCount: form.elements.length,
      timestamp: Date.now()
    };

    this.trackEvent('form_submission', formData);
  }

  /**
   * Track business-specific events
   */
  trackInspectionEvent(eventType, inspectionData) {
    const businessEvent = {
      eventType,
      inspectionId: inspectionData.id,
      inspectionType: inspectionData.type,
      status: inspectionData.status,
      duration: inspectionData.duration,
      equipmentId: inspectionData.equipmentId,
      userId: this.userId,
      timestamp: Date.now()
    };

    this.trackEvent('inspection_' + eventType, businessEvent);
    this.updateBusinessMetrics('inspections', eventType, businessEvent);
  }

  /**
   * Track equipment-related events
   */
  trackEquipmentEvent(eventType, equipmentData) {
    const equipmentEvent = {
      eventType,
      equipmentId: equipmentData.id,
      equipmentType: equipmentData.type,
      location: equipmentData.location,
      status: equipmentData.status,
      userId: this.userId,
      timestamp: Date.now()
    };

    this.trackEvent('equipment_' + eventType, equipmentEvent);
    this.updateBusinessMetrics('equipment', eventType, equipmentEvent);
  }

  /**
   * Track work order events
   */
  trackWorkOrderEvent(eventType, workOrderData) {
    const workOrderEvent = {
      eventType,
      workOrderId: workOrderData.id,
      priority: workOrderData.priority,
      status: workOrderData.status,
      assignedTo: workOrderData.assignedTo,
      estimatedHours: workOrderData.estimatedHours,
      userId: this.userId,
      timestamp: Date.now()
    };

    this.trackEvent('work_order_' + eventType, workOrderEvent);
    this.updateBusinessMetrics('workOrders', eventType, workOrderEvent);
  }

  /**
   * Update feature usage statistics
   */
  updateFeatureUsage(eventName, properties) {
    if (!this.featureUsage.has(eventName)) {
      this.featureUsage.set(eventName, {
        count: 0,
        firstUsed: Date.now(),
        lastUsed: Date.now(),
        users: new Set(),
        properties: []
      });
    }

    const feature = this.featureUsage.get(eventName);
    feature.count++;
    feature.lastUsed = Date.now();
    
    if (this.userId) {
      feature.users.add(this.userId);
    }
    
    feature.properties.push(properties);

    // Keep only last 100 property records
    if (feature.properties.length > 100) {
      feature.properties.shift();
    }
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics(category, eventType, data) {
    const key = `${category}_${eventType}`;
    
    if (!this.businessMetrics.has(key)) {
      this.businessMetrics.set(key, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        byStatus: new Map(),
        byUser: new Map(),
        byTimeOfDay: new Map(),
        trends: []
      });
    }

    const metric = this.businessMetrics.get(key);
    metric.count++;
    
    if (data.duration) {
      metric.totalDuration += data.duration;
      metric.averageDuration = metric.totalDuration / metric.count;
    }

    // Track by status
    if (data.status) {
      const statusCount = metric.byStatus.get(data.status) || 0;
      metric.byStatus.set(data.status, statusCount + 1);
    }

    // Track by user
    if (data.userId) {
      const userCount = metric.byUser.get(data.userId) || 0;
      metric.byUser.set(data.userId, userCount + 1);
    }

    // Track by time of day
    const hour = new Date().getHours();
    const hourCount = metric.byTimeOfDay.get(hour) || 0;
    metric.byTimeOfDay.set(hour, hourCount + 1);

    // Add to trends (keep last 100 data points)
    metric.trends.push({
      timestamp: Date.now(),
      value: 1,
      data
    });
    
    if (metric.trends.length > 100) {
      metric.trends.shift();
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.trackPerformanceMetric('navigation', {
            loadTime: entry.loadEventEnd - entry.loadEventStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            firstPaint: entry.responseEnd - entry.requestStart,
            transferSize: entry.transferSize
          });
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.transferSize > 0) {
            this.trackPerformanceMetric('resource', {
              name: entry.name,
              duration: entry.duration,
              transferSize: entry.transferSize,
              type: entry.initiatorType
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformanceMetric(type, data) {
    const metric = {
      type,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    if (!this.performanceMetrics.has(type)) {
      this.performanceMetrics.set(type, []);
    }

    this.performanceMetrics.get(type).push(metric);

    // Keep only last 50 metrics per type
    const metrics = this.performanceMetrics.get(type);
    if (metrics.length > 50) {
      metrics.shift();
    }
  }

  /**
   * Setup error tracking
   */
  setupErrorTracking() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.trackError({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: Date.now()
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.trackError({
          type: 'promise',
          message: event.reason?.message || 'Unhandled Promise Rejection',
          stack: event.reason?.stack,
          timestamp: Date.now()
        });
      });
    }
  }

  /**
   * Track errors
   */
  trackError(error) {
    const errorData = {
      ...error,
      sessionId: this.sessionId,
      userId: this.userId,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };

    this.errorTracking.push(errorData);
    this.trackEvent('error_occurred', errorData);

    console.error('Analytics: Error tracked:', errorData);
  }

  /**
   * Setup business metrics tracking
   */
  setupBusinessMetricsTracking() {
    // Track dashboard metrics every 30 seconds
    setInterval(() => {
      this.updateDashboardMetrics();
    }, 30000);
  }

  /**
   * Update dashboard metrics
   */
  updateDashboardMetrics() {
    const metrics = {
      activeUsers: this.getActiveUsersCount(),
      sessionDuration: Date.now() - this.startTime,
      pageViews: this.getPageViewsCount(),
      errorRate: this.getErrorRate(),
      featureUsage: this.getTopFeatures(),
      timestamp: Date.now()
    };

    this.dashboardMetrics.set(Date.now(), metrics);

    // Keep only last 100 dashboard metric snapshots
    if (this.dashboardMetrics.size > 100) {
      const oldestKey = Math.min(...this.dashboardMetrics.keys());
      this.dashboardMetrics.delete(oldestKey);
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    if (typeof navigator === 'undefined') return null;
    
    return {
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenWidth: typeof window !== 'undefined' && window.screen ? window.screen.width : null,
      screenHeight: typeof window !== 'undefined' && window.screen ? window.screen.height : null,
      colorDepth: typeof window !== 'undefined' && window.screen ? window.screen.colorDepth : null
    };
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    if (typeof navigator === 'undefined') return null;
    
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      version = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      version = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
      version = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      version = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] || 'Unknown';
    }

    return {
      name: browser,
      version,
      userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Get active users count
   */
  getActiveUsersCount() {
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    
    let activeCount = 0;
    for (const session of this.userSessions.values()) {
      if (now - session.lastActivity < activeThreshold) {
        activeCount++;
      }
    }
    
    return activeCount;
  }

  /**
   * Get page views count
   */
  getPageViewsCount() {
    const session = this.userSessions.get(this.sessionId);
    return session ? session.pageViews.length : 0;
  }

  /**
   * Get error rate
   */
  getErrorRate() {
    const totalEvents = this.events.length;
    const errorEvents = this.events.filter(e => e.eventName === 'error_occurred').length;
    
    return totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
  }

  /**
   * Get top features by usage
   */
  getTopFeatures(limit = 10) {
    const features = Array.from(this.featureUsage.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        uniqueUsers: data.users.size,
        lastUsed: data.lastUsed
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return features;
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary() {
    const session = this.userSessions.get(this.sessionId);
    
    return {
      session: {
        id: this.sessionId,
        userId: this.userId,
        duration: Date.now() - this.startTime,
        pageViews: session ? session.pageViews.length : 0,
        events: this.events.length,
        bounced: session ? session.bounced : false
      },
      performance: {
        metricsCollected: this.performanceMetrics.size,
        averageLoadTime: this.getAverageLoadTime(),
        errorRate: this.getErrorRate()
      },
      business: {
        inspectionEvents: this.getBusinessMetricCount('inspections'),
        equipmentEvents: this.getBusinessMetricCount('equipment'),
        workOrderEvents: this.getBusinessMetricCount('workOrders')
      },
      features: {
        totalFeatures: this.featureUsage.size,
        topFeatures: this.getTopFeatures(5)
      }
    };
  }

  /**
   * Get average load time
   */
  getAverageLoadTime() {
    const navMetrics = this.performanceMetrics.get('navigation') || [];
    if (navMetrics.length === 0) return 0;
    
    const totalLoadTime = navMetrics.reduce((sum, metric) => {
      return sum + (metric.data.loadTime || 0);
    }, 0);
    
    return totalLoadTime / navMetrics.length;
  }

  /**
   * Get business metric count
   */
  getBusinessMetricCount(category) {
    let count = 0;
    for (const [key, metric] of this.businessMetrics) {
      if (key.startsWith(category)) {
        count += metric.count;
      }
    }
    return count;
  }

  /**
   * Send analytics data to server
   */
  async sendAnalyticsData() {
    try {
      const data = {
        events: this.events,
        session: this.userSessions.get(this.sessionId),
        performance: Object.fromEntries(this.performanceMetrics),
        business: Object.fromEntries(this.businessMetrics),
        features: Object.fromEntries(this.featureUsage),
        errors: this.errorTracking,
        timestamp: Date.now()
      };

      // Send to analytics endpoint
      if (typeof window !== 'undefined' && window.api) {
        await window.api.secureOperation('analytics', 'sendData', { data });
        console.log('Analytics: Data sent to server');
      }

      // Clear sent data
      this.events.length = 0;
      this.errorTracking.length = 0;
      
    } catch (error) {
      console.error('Analytics: Failed to send data:', error);
    }
  }

  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    const data = {
      summary: this.getAnalyticsSummary(),
      events: this.events,
      sessions: Object.fromEntries(this.userSessions),
      performance: Object.fromEntries(this.performanceMetrics),
      business: Object.fromEntries(this.businessMetrics),
      features: Object.fromEntries(this.featureUsage),
      errors: this.errorTracking,
      dashboard: Object.fromEntries(this.dashboardMetrics),
      exportedAt: Date.now()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion for events
    const headers = ['timestamp', 'eventName', 'userId', 'sessionId', 'properties'];
    const rows = data.events.map(event => [
      event.properties.timestamp,
      event.eventName,
      event.properties.userId || '',
      event.properties.sessionId || '',
      JSON.stringify(event.properties)
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Clear all analytics data
   */
  clearData() {
    this.events.length = 0;
    this.userSessions.clear();
    this.performanceMetrics.clear();
    this.businessMetrics.clear();
    this.errorTracking.length = 0;
    this.featureUsage.clear();
    this.userBehavior.clear();
    this.dashboardMetrics.clear();
    
    console.log('Analytics: All data cleared');
  }
}

// Create and export singleton instance
const analytics = new AnalyticsManager();

export default analytics;

// Export specific functions
export const {
  setUserId,
  trackEvent,
  trackPageView,
  trackInspectionEvent,
  trackEquipmentEvent,
  trackWorkOrderEvent,
  getAnalyticsSummary,
  exportData,
  clearData
} = analytics;