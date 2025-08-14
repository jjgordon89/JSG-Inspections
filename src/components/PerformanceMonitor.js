import React, { useState, useEffect, useRef } from 'react';
import { BundleAnalyzer, MemoryMonitor, PerformanceBudget } from '../utils/performance';
import useUIStore from '../store/uiStore';

/**
 * Performance monitoring component for real-time performance tracking
 */
const PerformanceMonitor = ({ isOpen = false, onClose, metrics: dashboardMetrics }) => {
  const isVisible = isOpen;
  const { darkMode } = useUIStore();
  const [metrics, setMetrics] = useState({
    bundle: null,
    memory: null,
    budget: null,
    resources: null
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [history, setHistory] = useState([]);
  const monitoringRef = useRef(null);

  // Initialize performance monitoring
  useEffect(() => {
    if (isVisible) {
      updateMetrics();
    }
  }, [isVisible]);

  // Start/stop continuous monitoring
  useEffect(() => {
    if (isMonitoring && isVisible) {
      const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring, isVisible]);

  const updateMetrics = () => {
    const bundleMetrics = BundleAnalyzer.analyzeBundleSize();
    const resourceMetrics = BundleAnalyzer.getResourceMetrics();
    const memoryMetrics = MemoryMonitor.getMemoryUsage();
    const budgetResults = PerformanceBudget.checkBudget();
    const recommendations = BundleAnalyzer.getOptimizationRecommendations();

    const newMetrics = {
      bundle: bundleMetrics,
      memory: memoryMetrics,
      budget: budgetResults,
      resources: resourceMetrics,
      recommendations,
      timestamp: new Date().toISOString()
    };

    setMetrics(newMetrics);

    // Add to history (keep last 20 entries)
    setHistory(prev => {
      const updated = [...prev, newMetrics].slice(-20);
      return updated;
    });
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const exportMetrics = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  const themeClasses = darkMode
    ? 'bg-gray-800 text-white border-gray-600'
    : 'bg-white text-gray-900 border-gray-300';

  const cardClasses = darkMode
    ? 'bg-gray-700 border-gray-600'
    : 'bg-gray-50 border-gray-200';

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
      <div className={`${themeClasses} border rounded-lg shadow-xl w-11/12 max-w-6xl max-h-5/6 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-600">
          <h2 className="text-xl font-semibold">Performance Monitor</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMonitoring}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isMonitoring
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
            <button
              onClick={updateMetrics}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={exportMetrics}
              className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium"
              disabled={history.length === 0}
            >
              Export
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Usage */}
            {metrics.memory && (
              <div className={`${cardClasses} border rounded-lg p-4`}>
                <h3 className="text-lg font-semibold mb-3">Memory Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Used Heap:</span>
                    <span className="font-mono">{metrics.memory.usedJSHeapSize} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Heap:</span>
                    <span className="font-mono">{metrics.memory.totalJSHeapSize} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Limit:</span>
                    <span className="font-mono">{metrics.memory.jsHeapSizeLimit} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span className={`font-mono ${
                      metrics.memory.usage > 80 ? 'text-red-500' :
                      metrics.memory.usage > 60 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {metrics.memory.usage}%
                    </span>
                  </div>
                  {/* Memory usage bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        metrics.memory.usage > 80 ? 'bg-red-500' :
                        metrics.memory.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(metrics.memory.usage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Resource Metrics */}
            {metrics.resources && (
              <div className={`${cardClasses} border rounded-lg p-4`}>
                <h3 className="text-lg font-semibold mb-3">Resource Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Resources:</span>
                    <span className="font-mono">{metrics.resources.totalResources}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Time:</span>
                    <span className={`font-mono ${
                      metrics.resources.totalLoadTime > 3000 ? 'text-red-500' :
                      metrics.resources.totalLoadTime > 1500 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {Math.round(metrics.resources.totalLoadTime)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DOM Content Loaded:</span>
                    <span className={`font-mono ${
                      metrics.resources.domContentLoaded > 1500 ? 'text-red-500' :
                      metrics.resources.domContentLoaded > 800 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {Math.round(metrics.resources.domContentLoaded)}ms
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bundle Analysis */}
            {metrics.bundle && (
              <div className={`${cardClasses} border rounded-lg p-4`}>
                <h3 className="text-lg font-semibold mb-3">Bundle Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Scripts:</span>
                    <span className="font-mono">{metrics.bundle.totalScripts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stylesheets:</span>
                    <span className="font-mono">{metrics.bundle.totalStylesheets}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Budget */}
            {metrics.budget && (
              <div className={`${cardClasses} border rounded-lg p-4`}>
                <h3 className="text-lg font-semibold mb-3">Performance Budget</h3>
                <div className="space-y-2">
                  {Object.entries(metrics.budget).map(([key, result]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className={`font-mono px-2 py-1 rounded text-xs ${
                        result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {metrics.recommendations && metrics.recommendations.length > 0 && (
            <div className={`${cardClasses} border rounded-lg p-4 mt-6`}>
              <h3 className="text-lg font-semibold mb-3">Optimization Recommendations</h3>
              <ul className="space-y-2">
                {metrics.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Largest Resources */}
          {metrics.resources && metrics.resources.largestResources && (
            <div className={`${cardClasses} border rounded-lg p-4 mt-6`}>
              <h3 className="text-lg font-semibold mb-3">Largest Resources</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left py-2">Resource</th>
                      <th className="text-left py-2">Size</th>
                      <th className="text-left py-2">Duration</th>
                      <th className="text-left py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.resources.largestResources.slice(0, 5).map((resource, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 truncate max-w-xs" title={resource.name}>
                          {resource.name.split('/').pop()}
                        </td>
                        <td className="py-2 font-mono">
                          {resource.size ? `${Math.round(resource.size / 1024)} KB` : 'N/A'}
                        </td>
                        <td className="py-2 font-mono">
                          {Math.round(resource.duration)}ms
                        </td>
                        <td className="py-2">{resource.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* History Chart */}
          {history.length > 1 && (
            <div className={`${cardClasses} border rounded-lg p-4 mt-6`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Performance History</h3>
                <button
                  onClick={clearHistory}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                >
                  Clear History
                </button>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing last {history.length} measurements
              </div>
              {/* Simple text-based history for now */}
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {history.slice(-5).map((entry, index) => (
                  <div key={index} className="text-xs font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString()}: 
                    {entry.memory && ` Memory: ${entry.memory.usage}%`}
                    {entry.resources && ` Load: ${Math.round(entry.resources.totalLoadTime)}ms`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;