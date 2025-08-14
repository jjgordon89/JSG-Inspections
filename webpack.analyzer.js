/**
 * Webpack Bundle Analyzer Configuration
 * 
 * Provides detailed bundle analysis and visualization using webpack-bundle-analyzer
 * Run with: npm run analyze:webpack
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

// Custom webpack config for bundle analysis
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: path.resolve(__dirname, 'bundle-analysis', 'bundle-report.html'),
      defaultSizes: 'gzip',
      generateStatsFile: true,
      statsFilename: path.resolve(__dirname, 'bundle-analysis', 'bundle-stats.json'),
      statsOptions: {
        source: false,
        reasons: true,
        modules: true,
        chunks: true,
        chunkModules: true,
        chunkOrigins: true,
        depth: true,
        usedExports: true,
        providedExports: true,
        optimizationBailout: true,
        errorDetails: true,
        publicPath: true,
        exclude: false,
        maxModules: 1000,
      },
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    modules: ['node_modules', 'src'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
};