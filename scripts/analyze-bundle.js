#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * Analyzes the current React build bundle and provides optimization recommendations.
 * Run this script after building the project to get detailed bundle insights.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BUILD_DIR = path.join(__dirname, '..', 'build');
const STATIC_DIR = path.join(BUILD_DIR, 'static');
const REPORT_FILE = path.join(__dirname, '..', 'bundle-analysis-report.json');

// Size thresholds (in bytes)
const THRESHOLDS = {
  JS_WARNING: 500 * 1024,    // 500KB
  JS_ERROR: 1024 * 1024,     // 1MB
  CSS_WARNING: 100 * 1024,   // 100KB
  CSS_ERROR: 200 * 1024,     // 200KB
  TOTAL_WARNING: 2 * 1024 * 1024,  // 2MB
  TOTAL_ERROR: 5 * 1024 * 1024     // 5MB
};

class BundleAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      files: [],
      summary: {},
      recommendations: [],
      performance: {}
    };
  }

  /**
   * Check if build directory exists
   */
  checkBuildExists() {
    if (!fs.existsSync(BUILD_DIR)) {
      console.error('❌ Build directory not found. Please run "npm run build" first.');
      process.exit(1);
    }

    if (!fs.existsSync(STATIC_DIR)) {
      console.error('❌ Static directory not found in build.');
      process.exit(1);
    }

    console.log('✅ Build directory found');
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Analyze JavaScript files
   */
  analyzeJavaScript() {
    const jsDir = path.join(STATIC_DIR, 'js');
    if (!fs.existsSync(jsDir)) {
      console.warn('⚠️  No JavaScript directory found');
      return [];
    }

    const jsFiles = fs.readdirSync(jsDir)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(jsDir, file);
        const size = this.getFileSize(filePath);
        const isMainChunk = file.includes('main');
        const isVendorChunk = file.includes('vendor') || file.includes('chunk');
        
        return {
          name: file,
          path: filePath,
          size,
          formattedSize: this.formatBytes(size),
          type: 'javascript',
          isMainChunk,
          isVendorChunk,
          severity: this.getSeverity(size, 'js')
        };
      })
      .sort((a, b) => b.size - a.size);

    return jsFiles;
  }

  /**
   * Analyze CSS files
   */
  analyzeCSS() {
    const cssDir = path.join(STATIC_DIR, 'css');
    if (!fs.existsSync(cssDir)) {
      console.warn('⚠️  No CSS directory found');
      return [];
    }

    const cssFiles = fs.readdirSync(cssDir)
      .filter(file => file.endsWith('.css'))
      .map(file => {
        const filePath = path.join(cssDir, file);
        const size = this.getFileSize(filePath);
        
        return {
          name: file,
          path: filePath,
          size,
          formattedSize: this.formatBytes(size),
          type: 'css',
          severity: this.getSeverity(size, 'css')
        };
      })
      .sort((a, b) => b.size - a.size);

    return cssFiles;
  }

  /**
   * Analyze media files
   */
  analyzeMedia() {
    const mediaDir = path.join(STATIC_DIR, 'media');
    if (!fs.existsSync(mediaDir)) {
      return [];
    }

    const mediaFiles = fs.readdirSync(mediaDir)
      .map(file => {
        const filePath = path.join(mediaDir, file);
        const size = this.getFileSize(filePath);
        const ext = path.extname(file).toLowerCase();
        
        return {
          name: file,
          path: filePath,
          size,
          formattedSize: this.formatBytes(size),
          type: 'media',
          extension: ext,
          severity: size > 100 * 1024 ? 'warning' : 'ok' // 100KB threshold for media
        };
      })
      .sort((a, b) => b.size - a.size);

    return mediaFiles;
  }

  /**
   * Get severity level based on file size
   */
  getSeverity(size, type) {
    const thresholds = type === 'js' 
      ? { warning: THRESHOLDS.JS_WARNING, error: THRESHOLDS.JS_ERROR }
      : { warning: THRESHOLDS.CSS_WARNING, error: THRESHOLDS.CSS_ERROR };

    if (size >= thresholds.error) return 'error';
    if (size >= thresholds.warning) return 'warning';
    return 'ok';
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations() {
    const recommendations = [];
    const { files, summary } = this.results;

    // Check total bundle size
    if (summary.totalSize >= THRESHOLDS.TOTAL_ERROR) {
      recommendations.push({
        type: 'critical',
        category: 'bundle-size',
        message: `Total bundle size (${this.formatBytes(summary.totalSize)}) exceeds 5MB. Consider aggressive code splitting and lazy loading.`,
        priority: 'high'
      });
    } else if (summary.totalSize >= THRESHOLDS.TOTAL_WARNING) {
      recommendations.push({
        type: 'warning',
        category: 'bundle-size',
        message: `Total bundle size (${this.formatBytes(summary.totalSize)}) exceeds 2MB. Consider code splitting and optimization.`,
        priority: 'medium'
      });
    }

    // Check large JavaScript files
    const largeJsFiles = files.filter(f => f.type === 'javascript' && f.severity === 'error');
    if (largeJsFiles.length > 0) {
      recommendations.push({
        type: 'error',
        category: 'javascript',
        message: `${largeJsFiles.length} JavaScript file(s) exceed 1MB. Consider code splitting: ${largeJsFiles.map(f => f.name).join(', ')}`,
        priority: 'high'
      });
    }

    // Check for missing code splitting
    const mainChunks = files.filter(f => f.type === 'javascript' && f.isMainChunk);
    if (mainChunks.length === 1 && mainChunks[0].size > THRESHOLDS.JS_WARNING) {
      recommendations.push({
        type: 'warning',
        category: 'code-splitting',
        message: 'No code splitting detected. Consider implementing route-based code splitting.',
        priority: 'medium'
      });
    }

    // Check for large media files
    const largeMediaFiles = files.filter(f => f.type === 'media' && f.size > 500 * 1024); // 500KB
    if (largeMediaFiles.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'media',
        message: `${largeMediaFiles.length} large media file(s) found. Consider optimization: ${largeMediaFiles.map(f => f.name).join(', ')}`,
        priority: 'low'
      });
    }

    // Check CSS optimization
    const cssFiles = files.filter(f => f.type === 'css');
    if (cssFiles.length > 3) {
      recommendations.push({
        type: 'info',
        category: 'css',
        message: `${cssFiles.length} CSS files found. Consider CSS concatenation and minification.`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics() {
    const { files } = this.results;
    
    const jsFiles = files.filter(f => f.type === 'javascript');
    const cssFiles = files.filter(f => f.type === 'css');
    const mediaFiles = files.filter(f => f.type === 'media');

    // Estimate load times (assuming 3G connection: ~1.6 Mbps)
    const connectionSpeed = 1.6 * 1024 * 1024 / 8; // bytes per second
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const estimatedLoadTime = totalSize / connectionSpeed;

    return {
      totalFiles: files.length,
      totalSize,
      jsSize: jsFiles.reduce((sum, file) => sum + file.size, 0),
      cssSize: cssFiles.reduce((sum, file) => sum + file.size, 0),
      mediaSize: mediaFiles.reduce((sum, file) => sum + file.size, 0),
      estimatedLoadTime3G: Math.round(estimatedLoadTime * 100) / 100,
      compressionRatio: this.estimateCompressionRatio(files)
    };
  }

  /**
   * Estimate compression ratio
   */
  estimateCompressionRatio(files) {
    // Rough estimates for gzip compression
    const jsFiles = files.filter(f => f.type === 'javascript');
    const cssFiles = files.filter(f => f.type === 'css');
    
    const jsCompressed = jsFiles.reduce((sum, file) => sum + (file.size * 0.3), 0); // ~70% compression
    const cssCompressed = cssFiles.reduce((sum, file) => sum + (file.size * 0.2), 0); // ~80% compression
    const mediaSize = files.filter(f => f.type === 'media').reduce((sum, file) => sum + file.size, 0);
    
    const totalOriginal = files.reduce((sum, file) => sum + file.size, 0);
    const totalCompressed = jsCompressed + cssCompressed + mediaSize;
    
    return Math.round((1 - totalCompressed / totalOriginal) * 100);
  }

  /**
   * Run the complete analysis
   */
  analyze() {
    console.log('🔍 Starting bundle analysis...');
    
    this.checkBuildExists();
    
    // Analyze all file types
    const jsFiles = this.analyzeJavaScript();
    const cssFiles = this.analyzeCSS();
    const mediaFiles = this.analyzeMedia();
    
    this.results.files = [...jsFiles, ...cssFiles, ...mediaFiles];
    this.results.performance = this.calculatePerformanceMetrics();
    this.results.summary = {
      totalFiles: this.results.files.length,
      totalSize: this.results.files.reduce((sum, file) => sum + file.size, 0),
      jsFiles: jsFiles.length,
      cssFiles: cssFiles.length,
      mediaFiles: mediaFiles.length
    };
    
    this.results.recommendations = this.generateRecommendations();
    
    console.log('✅ Analysis complete');
    return this.results;
  }

  /**
   * Display results in console
   */
  displayResults() {
    const { files, summary, recommendations, performance } = this.results;
    
    console.log('\n📊 BUNDLE ANALYSIS RESULTS');
    console.log('=' .repeat(50));
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Total files: ${summary.totalFiles}`);
    console.log(`Total size: ${this.formatBytes(summary.totalSize)}`);
    console.log(`JavaScript files: ${summary.jsFiles}`);
    console.log(`CSS files: ${summary.cssFiles}`);
    console.log(`Media files: ${summary.mediaFiles}`);
    
    // Performance metrics
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`Estimated 3G load time: ${performance.estimatedLoadTime3G}s`);
    console.log(`Estimated compression: ${performance.compressionRatio}%`);
    
    // Largest files
    console.log('\n📁 LARGEST FILES:');
    files.slice(0, 10).forEach((file, index) => {
      const icon = file.severity === 'error' ? '🔴' : file.severity === 'warning' ? '🟡' : '🟢';
      console.log(`${index + 1}. ${icon} ${file.name} (${file.formattedSize})`);
    });
    
    // Recommendations
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, index) => {
        const icon = rec.type === 'critical' ? '🚨' : rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${index + 1}. ${icon} [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    } else {
      console.log('\n✅ No optimization recommendations - bundle looks good!');
    }
    
    console.log('\n' + '='.repeat(50));
  }

  /**
   * Save results to file
   */
  saveResults() {
    try {
      fs.writeFileSync(REPORT_FILE, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Results saved to: ${REPORT_FILE}`);
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
    }
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  
  try {
    const results = analyzer.analyze();
    analyzer.displayResults();
    analyzer.saveResults();
    
    // Exit with error code if critical issues found
    const criticalIssues = results.recommendations.filter(r => r.type === 'critical' || r.type === 'error');
    if (criticalIssues.length > 0) {
      console.log(`\n⚠️  Found ${criticalIssues.length} critical issue(s). Consider addressing them.`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

module.exports = BundleAnalyzer;