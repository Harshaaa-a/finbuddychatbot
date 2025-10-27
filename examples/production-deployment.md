# FinBuddy Production Deployment Guide

This guide provides comprehensive examples for deploying FinBuddy integrations to production environments with proper error handling, monitoring, and optimization.

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Security Best Practices](#security-best-practices)
3. [Performance Optimization](#performance-optimization)
4. [Monitoring and Logging](#monitoring-and-logging)
5. [Deployment Strategies](#deployment-strategies)
6. [CDN and Caching](#cdn-and-caching)
7. [Error Tracking](#error-tracking)

## Environment Configuration

### 1. Environment Variables

```bash
# Production Environment Variables
# .env.production

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_production_anon_key

# API Configuration
REACT_APP_API_TIMEOUT=30000
REACT_APP_MAX_RETRIES=3
REACT_APP_RATE_LIMIT_REQUESTS=10
REACT_APP_RATE_LIMIT_WINDOW=60000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
REACT_APP_MIXPANEL_TOKEN=your_mixpanel_token

# Error Tracking
REACT_APP_SENTRY_DSN=your_sentry_dsn
REACT_APP_BUGSNAG_API_KEY=your_bugsnag_key

# Performance Monitoring
REACT_APP_NEW_RELIC_LICENSE_KEY=your_newrelic_key
```

### 2. Configuration Management

```javascript
// config/environment.js
class EnvironmentConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig();
  }

  loadConfig() {
    const baseConfig = {
      supabase: {
        url: process.env.REACT_APP_SUPABASE_URL,
        anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY
      },
      api: {
        timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
        maxRetries: parseInt(process.env.REACT_APP_MAX_RETRIES) || 3,
        rateLimit: {
          requests: parseInt(process.env.REACT_APP_RATE_LIMIT_REQUESTS) || 10,
          window: parseInt(process.env.REACT_APP_RATE_LIMIT_WINDOW) || 60000
        }
      },
      features: {
        analytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
        errorReporting: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
        performanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true'
      }
    };

    // Environment-specific overrides
    const envConfigs = {
      development: {
        api: {
          timeout: 10000,
          maxRetries: 1
        },
        features: {
          analytics: false,
          errorReporting: false
        }
      },
      production: {
        api: {
          timeout: 30000,
          maxRetries: 3
        }
      }
    };

    return { ...baseConfig, ...envConfigs[this.env] };
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  validate() {
    const required = [
      'supabase.url',
      'supabase.anonKey'
    ];

    const missing = required.filter(path => !this.get(path));
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
}

export const config = new EnvironmentConfig();
config.validate();
```

## Security Best Practices

### 1. API Key Management

```javascript
// security/apiKeyManager.js
class APIKeyManager {
  constructor() {
    this.keys = new Map();
    this.rotationSchedule = new Map();
  }

  // Secure key storage with rotation
  setKey(name, key, rotationInterval = 24 * 60 * 60 * 1000) {
    this.keys.set(name, {
      value: key,
      createdAt: Date.now(),
      rotationInterval
    });

    // Schedule rotation
    if (rotationInterval > 0) {
      setTimeout(() => {
        this.rotateKey(name);
      }, rotationInterval);
    }
  }

  getKey(name) {
    const keyData = this.keys.get(name);
    if (!keyData) {
      throw new Error(`API key '${name}' not found`);
    }

    // Check if key needs rotation
    const age = Date.now() - keyData.createdAt;
    if (age > keyData.rotationInterval) {
      console.warn(`API key '${name}' is expired and needs rotation`);
    }

    return keyData.value;
  }

  async rotateKey(name) {
    // In a real implementation, this would fetch a new key from your key management service
    console.log(`Rotating API key: ${name}`);
    
    // Notify monitoring systems
    if (window.analytics) {
      window.analytics.track('api_key_rotated', { keyName: name });
    }
  }
}

export const apiKeyManager = new APIKeyManager();
```

### 2. Request Sanitization

```javascript
// security/requestSanitizer.js
class RequestSanitizer {
  static sanitizeMessage(message) {
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    // Remove potentially dangerous content
    let sanitized = message
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    // Limit length
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\b(eval|exec|system|shell_exec)\s*\(/i,
      /\b(drop|delete|truncate|alter)\s+table\b/i,
      /<iframe|<object|<embed/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Message contains potentially dangerous content');
      }
    }

    return sanitized;
  }

  static sanitizeHeaders(headers) {
    const allowedHeaders = [
      'content-type',
      'authorization',
      'user-agent',
      'accept',
      'accept-language'
    ];

    const sanitized = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      if (allowedHeaders.includes(lowerKey)) {
        // Sanitize header values
        sanitized[key] = String(value).replace(/[\r\n]/g, '');
      }
    }

    return sanitized;
  }
}

export { RequestSanitizer };
```

### 3. Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.google-analytics.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://api.mixpanel.com https://sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

## Performance Optimization

### 1. Request Optimization

```javascript
// performance/optimizedClient.js
class OptimizedFinBuddyClient extends FinBuddyClient {
  constructor(config) {
    super(config);
    this.requestCache = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.compressionEnabled = true;
  }

  async sendMessage(message, options = {}) {
    // Check cache first
    if (options.useCache !== false) {
      const cached = this.getCachedResponse(message);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    // Add to queue for batching
    if (options.batch !== false) {
      return this.queueRequest(message, options);
    }

    return this.sendOptimizedRequest(message, options);
  }

  async sendOptimizedRequest(message, options) {
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Accept-Encoding': this.compressionEnabled ? 'gzip, deflate, br' : undefined
      }
    };

    const startTime = performance.now();
    
    try {
      const response = await super.sendMessage(message, requestOptions);
      
      // Cache successful responses
      this.cacheResponse(message, response);
      
      // Track performance
      this.trackPerformance(message, performance.now() - startTime);
      
      return response;
    } catch (error) {
      this.trackError(message, error, performance.now() - startTime);
      throw error;
    }
  }

  getCachedResponse(message) {
    const cacheKey = this.getCacheKey(message);
    const cached = this.requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.response;
    }
    
    return null;
  }

  cacheResponse(message, response) {
    const cacheKey = this.getCacheKey(message);
    this.requestCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.requestCache.size > 100) {
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }
  }

  getCacheKey(message) {
    return btoa(message.toLowerCase().trim()).substring(0, 32);
  }

  async queueRequest(message, options) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ message, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Process requests with delay to respect rate limits
    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, 3); // Process 3 at a time
      
      await Promise.all(
        batch.map(async ({ message, options, resolve, reject }) => {
          try {
            const response = await this.sendOptimizedRequest(message, options);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        })
      );

      // Delay between batches
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;
  }

  trackPerformance(message, responseTime) {
    if (window.analytics) {
      window.analytics.track('finbuddy_request_performance', {
        messageLength: message.length,
        responseTime,
        cached: false
      });
    }
  }

  trackError(message, error, responseTime) {
    if (window.analytics) {
      window.analytics.track('finbuddy_request_error', {
        messageLength: message.length,
        errorType: error.name,
        errorMessage: error.message,
        responseTime
      });
    }
  }
}
```

### 2. Bundle Optimization

```javascript
// webpack.config.js (for custom builds)
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  // ... other config
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        finbuddy: {
          test: /[\\/]src[\\/]finbuddy[\\/]/,
          name: 'finbuddy',
          chunks: 'all',
        }
      }
    }
  },
  plugins: [
    // Analyze bundle size in development
    process.env.ANALYZE && new BundleAnalyzerPlugin()
  ].filter(Boolean)
};
```

## Monitoring and Logging

### 1. Application Monitoring

```javascript
// monitoring/applicationMonitor.js
class ApplicationMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      userSessions: new Set()
    };
    
    this.setupPerformanceObserver();
    this.setupErrorTracking();
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('finbuddy')) {
            this.trackPerformanceEntry(entry);
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  trackRequest(message, responseTime, success) {
    this.metrics.requests++;
    this.metrics.responseTime.push(responseTime);
    
    if (!success) {
      this.metrics.errors++;
    }

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'finbuddy_request', {
        event_category: 'api',
        event_label: success ? 'success' : 'error',
        value: Math.round(responseTime)
      });
    }

    // Send to custom analytics
    this.sendMetrics({
      type: 'request',
      success,
      responseTime,
      messageLength: message.length,
      timestamp: Date.now()
    });
  }

  trackError(errorInfo) {
    this.metrics.errors++;
    
    // Send to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(new Error(errorInfo.message), {
        extra: errorInfo
      });
    }

    this.sendMetrics({
      type: 'error',
      ...errorInfo,
      timestamp: Date.now()
    });
  }

  trackUserSession(userId) {
    this.metrics.userSessions.add(userId);
    
    // Track session start
    this.sendMetrics({
      type: 'session_start',
      userId,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      averageResponseTime: Math.round(avgResponseTime),
      activeSessions: this.metrics.userSessions.size
    };
  }

  async sendMetrics(data) {
    try {
      // Send to your analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Failed to send metrics:', error);
    }
  }
}

export const monitor = new ApplicationMonitor();
```

### 2. Real User Monitoring (RUM)

```javascript
// monitoring/rumCollector.js
class RUMCollector {
  constructor() {
    this.data = {
      pageLoad: null,
      interactions: [],
      errors: [],
      performance: []
    };
    
    this.collectPageLoadMetrics();
    this.collectInteractionMetrics();
  }

  collectPageLoadMetrics() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        this.data.pageLoad = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: this.getFirstPaint(),
          firstContentfulPaint: this.getFirstContentfulPaint(),
          largestContentfulPaint: this.getLargestContentfulPaint()
        };

        this.sendRUMData();
      }, 0);
    });
  }

  collectInteractionMetrics() {
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.data.interactions.push({
          type: eventType,
          target: event.target.tagName,
          timestamp: Date.now()
        });
      }, { passive: true });
    });
  }

  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : null;
  }

  getLargestContentfulPaint() {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Fallback timeout
      setTimeout(() => resolve(null), 5000);
    });
  }

  async sendRUMData() {
    try {
      await fetch('/api/rum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.data,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send RUM data:', error);
    }
  }
}

export const rumCollector = new RUMCollector();
```

## Deployment Strategies

### 1. Blue-Green Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy FinBuddy Integration

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage --watchAll=false
    
    - name: Build application
      run: npm run build
      env:
        REACT_APP_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        REACT_APP_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    
    - name: Deploy to staging
      run: |
        # Deploy to blue environment
        aws s3 sync build/ s3://finbuddy-staging-blue --delete
        aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_STAGING_ID }} --paths "/*"
    
    - name: Run smoke tests
      run: npm run test:e2e:staging
    
    - name: Switch traffic to blue
      if: success()
      run: |
        # Update load balancer to point to blue environment
        aws elbv2 modify-listener --listener-arn ${{ secrets.ALB_LISTENER_ARN }} --default-actions Type=forward,TargetGroupArn=${{ secrets.BLUE_TARGET_GROUP_ARN }}
    
    - name: Deploy to production
      if: success()
      run: |
        aws s3 sync build/ s3://finbuddy-production --delete
        aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_PROD_ID }} --paths "/*"
```

### 2. Canary Deployment

```javascript
// deployment/canaryController.js
class CanaryController {
  constructor() {
    this.canaryPercentage = 0;
    this.metrics = {
      canary: { requests: 0, errors: 0 },
      stable: { requests: 0, errors: 0 }
    };
  }

  shouldUseCanary() {
    return Math.random() * 100 < this.canaryPercentage;
  }

  async deployCanary(percentage = 5) {
    this.canaryPercentage = percentage;
    
    // Monitor for 10 minutes
    setTimeout(() => {
      this.evaluateCanary();
    }, 10 * 60 * 1000);
  }

  evaluateCanary() {
    const canaryErrorRate = this.metrics.canary.requests > 0 
      ? (this.metrics.canary.errors / this.metrics.canary.requests) * 100 
      : 0;
    
    const stableErrorRate = this.metrics.stable.requests > 0 
      ? (this.metrics.stable.errors / this.metrics.stable.requests) * 100 
      : 0;

    // If canary error rate is significantly higher, rollback
    if (canaryErrorRate > stableErrorRate * 1.5 && canaryErrorRate > 5) {
      this.rollback();
    } else if (canaryErrorRate <= stableErrorRate * 1.1) {
      // Gradually increase canary traffic
      this.increaseCanaryTraffic();
    }
  }

  rollback() {
    console.log('Rolling back canary deployment');
    this.canaryPercentage = 0;
    
    // Notify monitoring systems
    if (window.analytics) {
      window.analytics.track('canary_rollback', {
        reason: 'high_error_rate',
        canaryErrorRate: this.getCanaryErrorRate()
      });
    }
  }

  increaseCanaryTraffic() {
    if (this.canaryPercentage < 100) {
      this.canaryPercentage = Math.min(100, this.canaryPercentage * 2);
      console.log(`Increasing canary traffic to ${this.canaryPercentage}%`);
    }
  }

  trackRequest(isCanary, success) {
    const target = isCanary ? this.metrics.canary : this.metrics.stable;
    target.requests++;
    
    if (!success) {
      target.errors++;
    }
  }

  getCanaryErrorRate() {
    return this.metrics.canary.requests > 0 
      ? (this.metrics.canary.errors / this.metrics.canary.requests) * 100 
      : 0;
  }
}

export const canaryController = new CanaryController();
```

## CDN and Caching

### 1. CloudFront Configuration

```json
{
  "Comment": "FinBuddy CDN Distribution",
  "DefaultCacheBehavior": {
    "TargetOriginId": "finbuddy-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    }
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "/static/*",
        "TargetOriginId": "finbuddy-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "TTL": 31536000
      },
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "finbuddy-api",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "TTL": 0
      }
    ]
  }
}
```

### 2. Service Worker for Caching

```javascript
// public/sw.js
const CACHE_NAME = 'finbuddy-v1';
const STATIC_CACHE = 'finbuddy-static-v1';
const API_CACHE = 'finbuddy-api-v1';

const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(API_CACHE)
    ])
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/functions/v1/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
});

async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses for 5 minutes
    if (response.ok && request.method === 'GET') {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/');
  }
}
```

## Error Tracking

### 1. Sentry Integration

```javascript
// monitoring/sentry.js
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

export function initializeSentry() {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        if (event.exception) {
          const error = event.exception.values[0];
          if (error.type === 'ChunkLoadError' || error.type === 'NetworkError') {
            return null; // Don't send these errors
          }
        }
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive data from breadcrumbs
      if (breadcrumb.category === 'xhr' && breadcrumb.data?.url?.includes('/chat')) {
        delete breadcrumb.data.request_body_size;
        delete breadcrumb.data.response_body_size;
      }
      return breadcrumb;
    }
  });

  // Set user context
  Sentry.setUser({
    id: getUserId(),
    email: getUserEmail()
  });

  // Set custom tags
  Sentry.setTag('component', 'finbuddy-integration');
  Sentry.setTag('version', process.env.REACT_APP_VERSION);
}

// Enhanced FinBuddy client with error tracking
export class MonitoredFinBuddyClient extends FinBuddyClient {
  async sendMessage(message, options = {}) {
    const transaction = Sentry.startTransaction({
      name: 'finbuddy_send_message',
      op: 'api.call'
    });

    try {
      Sentry.addBreadcrumb({
        message: 'Sending message to FinBuddy',
        category: 'api',
        level: 'info',
        data: {
          messageLength: message.length,
          hasOptions: Object.keys(options).length > 0
        }
      });

      const response = await super.sendMessage(message, options);
      
      transaction.setStatus('ok');
      return response;
    } catch (error) {
      transaction.setStatus('internal_error');
      
      Sentry.captureException(error, {
        tags: {
          component: 'finbuddy-client',
          operation: 'send_message'
        },
        extra: {
          messageLength: message.length,
          options
        }
      });
      
      throw error;
    } finally {
      transaction.finish();
    }
  }
}
```

This production deployment guide provides comprehensive examples for deploying FinBuddy integrations with proper security, monitoring, and optimization practices.