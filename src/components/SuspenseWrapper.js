/**
 * Suspense Wrapper Component
 * 
 * Provides a reusable wrapper for lazy-loaded components with error boundaries,
 * loading states, and performance monitoring.
 */

import React, { Suspense } from 'react';
import { LoadingFallback, ErrorFallback } from '../utils/lazyComponents';

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error Boundary caught an error:', error, errorInfo);
    
    // Log to performance monitoring if available
    if (window.performance && window.performance.mark) {
      window.performance.mark(`component-error-${this.props.componentName || 'unknown'}`);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

const SuspenseWrapper = ({ 
  children, 
  componentName = 'Component',
  fallback = null,
  onError = null,
  enablePerformanceTracking = true
}) => {
  // Custom loading fallback or default
  const loadingFallback = fallback || <LoadingFallback componentName={componentName} />;

  // Performance tracking
  React.useEffect(() => {
    if (enablePerformanceTracking && window.performance) {
      const startMark = `${componentName}-load-start`;
      window.performance.mark(startMark);

      return () => {
        const endMark = `${componentName}-load-end`;
        window.performance.mark(endMark);
        
        try {
          window.performance.measure(
            `${componentName}-load-time`,
            startMark,
            endMark
          );
        } catch (error) {
          console.warn('Performance measurement failed:', error);
        }
      };
    }
  }, [componentName, enablePerformanceTracking]);

  const handleError = (error, errorInfo) => {
    console.error(`Error in ${componentName}:`, error, errorInfo);
    
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to performance monitoring
    if (window.performance && window.performance.mark) {
      window.performance.mark(`${componentName}-error`);
    }
  };

  return (
    <ComponentErrorBoundary 
      componentName={componentName}
      onError={handleError}
    >
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ComponentErrorBoundary>
  );
};

// Higher-order component for easy wrapping
export const withSuspense = (Component, options = {}) => {
  const WrappedComponent = React.forwardRef((props, ref) => {
    const componentName = options.componentName || Component.displayName || Component.name || 'Component';
    
    return (
      <SuspenseWrapper 
        componentName={componentName}
        fallback={options.fallback}
        onError={options.onError}
        enablePerformanceTracking={options.enablePerformanceTracking !== false}
      >
        <Component ref={ref} {...props} />
      </SuspenseWrapper>
    );
  });

  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

// Route-based suspense wrapper for React Router
export const RouteSuspenseWrapper = ({ children, routeName }) => {
  return (
    <SuspenseWrapper 
      componentName={`Route-${routeName}`}
      enablePerformanceTracking={true}
    >
      {children}
    </SuspenseWrapper>
  );
};

// Preload helper for critical routes
export const usePreloadRoute = (importFunc, delay = 2000) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      importFunc().catch(error => {
        console.warn('Failed to preload route:', error);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [importFunc, delay]);
};

// Performance metrics collector
export const useComponentPerformance = (componentName) => {
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    if (!window.performance) return;

    const measureName = `${componentName}-load-time`;
    
    // Check if measurement exists
    const measures = window.performance.getEntriesByName(measureName, 'measure');
    if (measures.length > 0) {
      const latestMeasure = measures[measures.length - 1];
      setMetrics({
        loadTime: latestMeasure.duration,
        startTime: latestMeasure.startTime,
        name: componentName
      });
    }
  }, [componentName]);

  return metrics;
};

export default SuspenseWrapper;