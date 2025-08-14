/**
 * Performance Monitoring Script
 * 
 * Provides comprehensive performance analysis including:
 * - Bundle size analysis
 * - Runtime performance metrics
 * - Memory usage tracking
 * - Load time analysis
 * - Performance recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceMonitor {
  constructor() {
    this.buildDir = path.join(process.cwd(), 'build');
    this.reportDir = path.join(process.cwd(), 'performance-reports');
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  // Analyze bundle composition and dependencies
  analyzeBundleComposition() {
    console.log('🔍 Analyzing bundle composition...');
    
    const staticDir = path.join(this.buildDir, 'static');
    if (!fs.existsSync(staticDir)) {
      throw new Error('Build directory not found. Run npm run build first.');
    }

    const jsFiles = this.getFilesByExtension(staticDir, '.js');
    const cssFiles = this.getFilesByExtension(staticDir, '.css');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      totalFiles: jsFiles.length + cssFiles.length,
      javascript: this.analyzeJSFiles(jsFiles),
      css: this.analyzeCSSFiles(cssFiles),
      chunks: this.analyzeChunks(jsFiles),
      recommendations: []
    };

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  getFilesByExtension(dir, ext) {
    const files = [];
    
    const scanDir = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (path.extname(item) === ext) {
          files.push({
            name: item,
            path: fullPath,
            size: stat.size,
            relativePath: path.relative(this.buildDir, fullPath)
          });
        }
      }
    };

    scanDir(dir);
    return files.sort((a, b) => b.size - a.size);
  }

  analyzeJSFiles(jsFiles) {
    const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
    const mainFiles = jsFiles.filter(f => f.name.includes('main'));
    const chunkFiles = jsFiles.filter(f => f.name.includes('chunk'));
    
    return {
      totalFiles: jsFiles.length,
      totalSize,
      mainFiles: mainFiles.length,
      chunkFiles: chunkFiles.length,
      averageChunkSize: chunkFiles.length > 0 ? 
        chunkFiles.reduce((sum, f) => sum + f.size, 0) / chunkFiles.length : 0,
      largestFiles: jsFiles.slice(0, 10).map(f => ({
        name: f.name,
        size: f.size,
        sizeFormatted: this.formatBytes(f.size)
      }))
    };
  }

  analyzeCSSFiles(cssFiles) {
    const totalSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
    
    return {
      totalFiles: cssFiles.length,
      totalSize,
      averageSize: cssFiles.length > 0 ? totalSize / cssFiles.length : 0,
      largestFiles: cssFiles.slice(0, 5).map(f => ({
        name: f.name,
        size: f.size,
        sizeFormatted: this.formatBytes(f.size)
      }))
    };
  }

  analyzeChunks(jsFiles) {
    const chunks = {
      main: jsFiles.filter(f => f.name.includes('main')),
      vendor: jsFiles.filter(f => f.name.match(/\d+\.[a-f0-9]+\.chunk\.js$/)),
      runtime: jsFiles.filter(f => f.name.includes('runtime'))
    };

    return {
      mainChunks: chunks.main.length,
      vendorChunks: chunks.vendor.length,
      runtimeChunks: chunks.runtime.length,
      totalChunks: jsFiles.length,
      chunkSizeDistribution: this.getChunkSizeDistribution(jsFiles)
    };
  }

  getChunkSizeDistribution(files) {
    const sizes = files.map(f => f.size);
    const distribution = {
      small: sizes.filter(s => s < 50 * 1024).length,    // < 50KB
      medium: sizes.filter(s => s >= 50 * 1024 && s < 200 * 1024).length, // 50KB - 200KB
      large: sizes.filter(s => s >= 200 * 1024 && s < 500 * 1024).length, // 200KB - 500KB
      xlarge: sizes.filter(s => s >= 500 * 1024).length  // > 500KB
    };

    return distribution;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for large chunks
    const largeChunks = analysis.javascript.largestFiles.filter(f => f.size > 500 * 1024);
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Bundle Size',
        message: `${largeChunks.length} chunk(s) exceed 500KB. Consider further code splitting.`,
        files: largeChunks.map(f => f.name)
      });
    }

    // Check for too many small chunks
    if (analysis.chunks.chunkSizeDistribution.small > 10) {
      recommendations.push({
        type: 'info',
        category: 'Bundle Optimization',
        message: `${analysis.chunks.chunkSizeDistribution.small} very small chunks detected. Consider chunk merging.`
      });
    }

    // Check CSS optimization
    if (analysis.css.totalFiles > 15) {
      recommendations.push({
        type: 'info',
        category: 'CSS Optimization',
        message: `${analysis.css.totalFiles} CSS files found. Consider CSS concatenation.`
      });
    }

    // Performance budget checks
    const totalJSSize = analysis.javascript.totalSize;
    if (totalJSSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push({
        type: 'error',
        category: 'Performance Budget',
        message: `Total JavaScript size (${this.formatBytes(totalJSSize)}) exceeds 2MB budget.`
      });
    }

    return recommendations;
  }

  // Generate performance metrics
  generatePerformanceMetrics(analysis) {
    const totalSize = analysis.javascript.totalSize + analysis.css.totalSize;
    
    return {
      bundleSize: {
        total: totalSize,
        javascript: analysis.javascript.totalSize,
        css: analysis.css.totalSize,
        formatted: {
          total: this.formatBytes(totalSize),
          javascript: this.formatBytes(analysis.javascript.totalSize),
          css: this.formatBytes(analysis.css.totalSize)
        }
      },
      loadTime: {
        fast3G: this.estimateLoadTime(totalSize, 1.6), // 1.6 Mbps
        slow3G: this.estimateLoadTime(totalSize, 0.4), // 400 Kbps
        cable: this.estimateLoadTime(totalSize, 5.0)   // 5 Mbps
      },
      compression: {
        estimated: '70%', // Typical gzip compression
        compressedSize: Math.round(totalSize * 0.3),
        compressedSizeFormatted: this.formatBytes(Math.round(totalSize * 0.3))
      },
      chunks: {
        total: analysis.chunks.totalChunks,
        distribution: analysis.chunks.chunkSizeDistribution
      }
    };
  }

  estimateLoadTime(bytes, mbps) {
    const bits = bytes * 8;
    const megabits = bits / (1024 * 1024);
    const seconds = megabits / mbps;
    return Math.round(seconds * 100) / 100;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate comprehensive report
  generateReport() {
    console.log('📊 Generating performance report...');
    
    const analysis = this.analyzeBundleComposition();
    const metrics = this.generatePerformanceMetrics(analysis);
    
    const report = {
      timestamp: new Date().toISOString(),
      analysis,
      metrics,
      summary: this.generateSummary(analysis, metrics)
    };

    // Save detailed report
    const reportPath = path.join(this.reportDir, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Save latest report
    const latestPath = path.join(this.reportDir, 'latest-performance-report.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    this.displayReport(report);
    
    return report;
  }

  generateSummary(analysis, metrics) {
    return {
      totalFiles: analysis.totalFiles,
      bundleSize: metrics.bundleSize.formatted.total,
      jsFiles: analysis.javascript.totalFiles,
      cssFiles: analysis.css.totalFiles,
      recommendationsCount: analysis.recommendations.length,
      criticalIssues: analysis.recommendations.filter(r => r.type === 'error').length,
      estimatedLoadTime3G: `${metrics.loadTime.fast3G}s`,
      compressionSavings: metrics.compression.compressedSizeFormatted
    };
  }

  displayReport(report) {
    console.log('\n📊 PERFORMANCE MONITORING REPORT');
    console.log('==================================================');
    
    console.log('\n📋 SUMMARY:');
    console.log(`Total files: ${report.summary.totalFiles}`);
    console.log(`Bundle size: ${report.summary.bundleSize}`);
    console.log(`JavaScript files: ${report.summary.jsFiles}`);
    console.log(`CSS files: ${report.summary.cssFiles}`);
    
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`Estimated 3G load time: ${report.summary.estimatedLoadTime3G}`);
    console.log(`Estimated compression savings: ${report.summary.compressionSavings}`);
    
    console.log('\n📁 LARGEST JAVASCRIPT FILES:');
    report.analysis.javascript.largestFiles.slice(0, 5).forEach((file, index) => {
      const icon = file.size > 500 * 1024 ? '🔴' : file.size > 200 * 1024 ? '🟡' : '🟢';
      console.log(`${index + 1}. ${icon} ${file.name} (${file.sizeFormatted})`);
    });
    
    if (report.analysis.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.analysis.recommendations.forEach((rec, index) => {
        const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${index + 1}. ${icon} [${rec.type.toUpperCase()}] ${rec.message}`);
      });
    }
    
    console.log('\n==================================================');
    console.log(`💾 Detailed report saved to: ${path.join(this.reportDir, 'latest-performance-report.json')}`);
    
    const criticalIssues = report.analysis.recommendations.filter(r => r.type === 'error').length;
    if (criticalIssues > 0) {
      console.log(`\n⚠️  Found ${criticalIssues} critical performance issue(s).`);
    } else {
      console.log('\n✅ No critical performance issues detected.');
    }
  }
}

// CLI execution
if (require.main === module) {
  try {
    const monitor = new PerformanceMonitor();
    monitor.generateReport();
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

module.exports = PerformanceMonitor;