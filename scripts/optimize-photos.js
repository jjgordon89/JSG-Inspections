#!/usr/bin/env node

/**
 * Photo Optimization Script
 * 
 * Optimizes images in the project for better performance.
 * Generates responsive image variants and compresses existing images.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIRS = [
  path.join(__dirname, '..', 'src', 'assets', 'images'),
  path.join(__dirname, '..', 'public', 'images'),
  path.join(__dirname, '..', 'public', 'assets')
];
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'optimized-images');
const REPORT_FILE = path.join(__dirname, '..', 'photo-optimization-report.json');

// Supported image formats
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];

// Optimization settings
const OPTIMIZATION_SETTINGS = {
  quality: {
    high: 85,
    medium: 70,
    low: 50
  },
  sizes: {
    thumbnail: 150,
    small: 300,
    medium: 600,
    large: 1200,
    xlarge: 1920
  },
  formats: ['webp', 'jpg'] // Target formats for optimization
};

class PhotoOptimizer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      processed: [],
      errors: [],
      summary: {
        totalFiles: 0,
        totalSizeBefore: 0,
        totalSizeAfter: 0,
        compressionRatio: 0
      },
      recommendations: []
    };
  }

  /**
   * Check if required tools are available
   */
  checkDependencies() {
    const requiredTools = ['convert', 'identify']; // ImageMagick tools
    const missingTools = [];

    for (const tool of requiredTools) {
      try {
        execSync(`${tool} -version`, { stdio: 'ignore' });
        console.log(`✅ ${tool} is available`);
      } catch (error) {
        missingTools.push(tool);
      }
    }

    if (missingTools.length > 0) {
      console.log('\n⚠️  Missing required tools:');
      console.log('ImageMagick is required for image optimization.');
      console.log('\nInstallation instructions:');
      console.log('- Windows: Download from https://imagemagick.org/script/download.php#windows');
      console.log('- macOS: brew install imagemagick');
      console.log('- Linux: sudo apt-get install imagemagick');
      console.log('\n🔄 Falling back to basic optimization without ImageMagick...');
      return false;
    }

    return true;
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
   * Find all image files in source directories
   */
  findImageFiles() {
    const imageFiles = [];

    for (const sourceDir of SOURCE_DIRS) {
      if (!fs.existsSync(sourceDir)) {
        console.log(`⚠️  Directory not found: ${sourceDir}`);
        continue;
      }

      const files = this.scanDirectory(sourceDir);
      imageFiles.push(...files);
    }

    console.log(`🔍 Found ${imageFiles.length} image files`);
    return imageFiles;
  }

  /**
   * Recursively scan directory for image files
   */
  scanDirectory(dir) {
    const files = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.scanDirectory(fullPath));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (SUPPORTED_FORMATS.includes(ext)) {
            files.push({
              path: fullPath,
              name: entry.name,
              extension: ext,
              size: this.getFileSize(fullPath),
              relativePath: path.relative(path.join(__dirname, '..'), fullPath)
            });
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning directory ${dir}:`, error.message);
    }

    return files;
  }

  /**
   * Get image dimensions using ImageMagick
   */
  getImageDimensions(filePath) {
    try {
      const output = execSync(`identify -format "%w %h" "${filePath}"`, { encoding: 'utf8' });
      const [width, height] = output.trim().split(' ').map(Number);
      return { width, height };
    } catch (error) {
      console.warn(`⚠️  Could not get dimensions for ${filePath}`);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Optimize single image with ImageMagick
   */
  optimizeWithImageMagick(inputPath, outputPath, options = {}) {
    const {
      quality = OPTIMIZATION_SETTINGS.quality.medium,
      width,
      height,
      format = 'jpg'
    } = options;

    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let command = `convert "${inputPath}"`;

      // Resize if dimensions specified
      if (width || height) {
        const resize = width && height ? `${width}x${height}` : width ? `${width}x` : `x${height}`;
        command += ` -resize ${resize}`;
      }

      // Set quality and format
      command += ` -quality ${quality}`;
      
      // Strip metadata to reduce file size
      command += ` -strip`;
      
      // Auto-orient based on EXIF data
      command += ` -auto-orient`;
      
      command += ` "${outputPath}"`;

      execSync(command, { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error(`❌ Failed to optimize ${inputPath}:`, error.message);
      return false;
    }
  }

  /**
   * Basic optimization without ImageMagick (fallback)
   */
  basicOptimization(file) {
    // For basic optimization, we'll just copy the file and provide recommendations
    const outputPath = path.join(OUTPUT_DIR, 'basic', file.name);
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      fs.copyFileSync(file.path, outputPath);
      return {
        success: true,
        originalSize: file.size,
        optimizedSize: file.size,
        outputPath,
        compressionRatio: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate responsive image variants
   */
  generateResponsiveVariants(file, hasImageMagick) {
    if (!hasImageMagick) {
      return this.basicOptimization(file);
    }

    const results = [];
    const dimensions = this.getImageDimensions(file.path);
    const baseName = path.parse(file.name).name;
    
    // Generate different sizes
    for (const [sizeName, maxWidth] of Object.entries(OPTIMIZATION_SETTINGS.sizes)) {
      // Skip if original is smaller than target size
      if (dimensions.width > 0 && dimensions.width < maxWidth) {
        continue;
      }

      for (const format of OPTIMIZATION_SETTINGS.formats) {
        const outputFileName = `${baseName}-${sizeName}.${format}`;
        const outputPath = path.join(OUTPUT_DIR, 'responsive', outputFileName);
        
        const success = this.optimizeWithImageMagick(file.path, outputPath, {
          width: maxWidth,
          quality: OPTIMIZATION_SETTINGS.quality.medium,
          format
        });

        if (success) {
          const optimizedSize = this.getFileSize(outputPath);
          results.push({
            size: sizeName,
            format,
            originalSize: file.size,
            optimizedSize,
            outputPath,
            compressionRatio: Math.round((1 - optimizedSize / file.size) * 100)
          });
        }
      }
    }

    return results;
  }

  /**
   * Analyze and provide recommendations
   */
  analyzeAndRecommend() {
    const { processed, summary } = this.results;
    const recommendations = [];

    // Check for large images
    const largeImages = processed.filter(p => p.originalSize > 1024 * 1024); // > 1MB
    if (largeImages.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'file-size',
        message: `${largeImages.length} image(s) are larger than 1MB. Consider further compression.`,
        files: largeImages.map(img => img.relativePath)
      });
    }

    // Check compression ratio
    if (summary.compressionRatio < 20) {
      recommendations.push({
        type: 'info',
        category: 'compression',
        message: 'Low compression ratio achieved. Images may already be optimized or consider different formats.',
        suggestion: 'Try WebP format for better compression'
      });
    }

    // Check for missing responsive variants
    const hasResponsiveVariants = processed.some(p => p.variants && p.variants.length > 0);
    if (!hasResponsiveVariants) {
      recommendations.push({
        type: 'suggestion',
        category: 'responsive',
        message: 'No responsive image variants generated. Consider implementing responsive images for better performance.',
        suggestion: 'Use <picture> element with multiple sources for different screen sizes'
      });
    }

    return recommendations;
  }

  /**
   * Run the optimization process
   */
  async optimize() {
    console.log('🖼️  Starting photo optimization...');
    
    const hasImageMagick = this.checkDependencies();
    const imageFiles = this.findImageFiles();
    
    if (imageFiles.length === 0) {
      console.log('ℹ️  No image files found to optimize.');
      return this.results;
    }

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (const file of imageFiles) {
      console.log(`🔄 Processing: ${file.relativePath}`);
      
      totalSizeBefore += file.size;
      
      try {
        if (hasImageMagick) {
          // Generate responsive variants
          const variants = this.generateResponsiveVariants(file, true);
          
          const processedFile = {
            ...file,
            variants,
            status: 'success'
          };
          
          // Calculate total size after optimization
          const variantSizes = variants.reduce((sum, v) => sum + v.optimizedSize, 0);
          totalSizeAfter += variantSizes || file.size;
          
          this.results.processed.push(processedFile);
        } else {
          // Basic optimization
          const result = this.basicOptimization(file);
          
          const processedFile = {
            ...file,
            optimizedSize: result.optimizedSize,
            status: result.success ? 'basic' : 'failed',
            error: result.error
          };
          
          totalSizeAfter += result.optimizedSize || file.size;
          this.results.processed.push(processedFile);
        }
      } catch (error) {
        console.error(`❌ Error processing ${file.relativePath}:`, error.message);
        this.results.errors.push({
          file: file.relativePath,
          error: error.message
        });
      }
    }

    // Calculate summary
    this.results.summary = {
      totalFiles: imageFiles.length,
      totalSizeBefore,
      totalSizeAfter,
      compressionRatio: totalSizeBefore > 0 ? Math.round((1 - totalSizeAfter / totalSizeBefore) * 100) : 0
    };

    this.results.recommendations = this.analyzeAndRecommend();
    
    console.log('✅ Photo optimization complete');
    return this.results;
  }

  /**
   * Display results
   */
  displayResults() {
    const { processed, errors, summary, recommendations } = this.results;
    
    console.log('\n📊 PHOTO OPTIMIZATION RESULTS');
    console.log('='.repeat(50));
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Files processed: ${summary.totalFiles}`);
    console.log(`Size before: ${this.formatBytes(summary.totalSizeBefore)}`);
    console.log(`Size after: ${this.formatBytes(summary.totalSizeAfter)}`);
    console.log(`Compression: ${summary.compressionRatio}%`);
    console.log(`Space saved: ${this.formatBytes(summary.totalSizeBefore - summary.totalSizeAfter)}`);
    
    // Errors
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}: ${error.error}`);
      });
    }
    
    // Recommendations
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, index) => {
        const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'suggestion' ? '💡' : 'ℹ️';
        console.log(`${index + 1}. ${icon} ${rec.message}`);
        if (rec.suggestion) {
          console.log(`   💭 ${rec.suggestion}`);
        }
      });
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
  const optimizer = new PhotoOptimizer();
  
  optimizer.optimize()
    .then(() => {
      optimizer.displayResults();
      optimizer.saveResults();
    })
    .catch(error => {
      console.error('❌ Optimization failed:', error.message);
      process.exit(1);
    });
}

module.exports = PhotoOptimizer;