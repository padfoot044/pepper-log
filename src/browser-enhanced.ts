// Enhanced PepperLog with comprehensive logging support
// Real browser implementation with OTLP Traces AND Logs

import { BrowserOTLPExporter, OTLPSpanData, generateTraceId, generateSpanId, toUnixNano, convertAttributes } from './browser-otlp';
import { PepperLogger } from './logging/logger';
import { LogLevel, LoggingConfig } from './logging/types';

export interface PepperLogConfig {
  backend: 'signoz' | 'datadog' | 'jaeger' | 'newrelic' | 'grafana' | 'azure' | 'aws-xray' | 'custom';
  serviceName: string;
  config?: {
    endpoint?: string;              // Traces endpoint
    logsEndpoint?: string;          // Logs endpoint (if different)
    headers?: Record<string, string>;
    batchConfig?: {
      maxExportBatchSize?: number;
      exportTimeoutMillis?: number;
      scheduledDelayMillis?: number;
    };
  };
  framework?: string;
  features?: {
    tracing?: boolean;
    metrics?: boolean;
    logging?: boolean;
    autoInstrumentation?: boolean;
  };
  environment?: string;
  globalAttributes?: Record<string, string | number | boolean>;
  
  // New logging configuration
  logging?: LoggingConfig;
}

export interface DetectedFramework {
  name: string;
  version?: string;
  confidence: number;
  source: string;
}

interface ActiveSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  attributes: Record<string, any>;
  events: Array<{
    timestamp: number;
    name: string;
    attributes: Record<string, any>;
  }>;
  status: { code: number; message?: string };
}

/**
 * Enhanced PepperLog with comprehensive tracing AND logging
 * Sends traces to /v1/traces and logs to /v1/logs endpoints
 */
export class PepperLog {
  private config: PepperLogConfig;
  private detectedFramework: DetectedFramework | null = null;
  private isInitialized = false;
  private sessionId: string;
  private tracesExporter: BrowserOTLPExporter | null = null;
  private logger: PepperLogger | null = null;
  private activeSpans: Map<string, ActiveSpan> = new Map();

  constructor(config: PepperLogConfig) {
    console.log('🌶️ PepperLog: Creating enhanced instance with traces AND logs');
    this.config = {
      features: {
        tracing: true,
        metrics: true,
        logging: true,
        autoInstrumentation: false,
        ...config.features
      },
      environment: config.environment || 'browser',
      config: {
        batchConfig: {
          maxExportBatchSize: 100,
          exportTimeoutMillis: 5000,
          scheduledDelayMillis: 1000,
          ...config.config?.batchConfig
        },
        ...config.config
      },
      logging: {
        enabled: true,
        level: LogLevel.INFO,
        enableCorrelation: true,
        consoleOutput: true,
        ...config.logging
      },
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    console.log('🌶️ PepperLog configuration:', {
      serviceName: this.config.serviceName,
      backend: this.config.backend,
      tracesEndpoint: this.config.config?.endpoint,
      logsEndpoint: this.config.config?.logsEndpoint,
      features: this.config.features,
      logging: this.config.logging
    });
  }

  private generateSessionId(): string {
    return generateTraceId().substring(0, 16);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🌶️ PepperLog already initialized');
      return;
    }

    console.log('🌶️ PepperLog: Initializing enhanced telemetry (traces + logs)...');
    
    // Detect framework
    this.detectedFramework = this.detectFramework();
    console.log('🌶️ Detected framework:', this.detectedFramework);

    // Setup traces exporter
    if (this.config.config?.endpoint && this.config.features?.tracing) {
      this.setupTracesExporter();
    }

    // Setup logging system
    if (this.config.features?.logging) {
      this.setupLogging();
    }

    this.isInitialized = true;
    console.log('🌶️ PepperLog initialized successfully with enhanced telemetry');
  }

  private setupTracesExporter(): void {
    const endpoint = this.config.config?.endpoint;
    if (!endpoint) return;

    let finalEndpoint = endpoint;
    
    // Auto-configure endpoint based on backend
    if (this.config.backend === 'grafana' && !endpoint.includes('/v1/traces')) {
      finalEndpoint = endpoint.endsWith('/') ? endpoint + 'v1/traces' : endpoint + '/v1/traces';
    }

    this.tracesExporter = new BrowserOTLPExporter({
      endpoint: finalEndpoint,
      serviceName: this.config.serviceName,
      headers: this.config.config?.headers,
      batchTimeout: this.config.config?.batchConfig?.exportTimeoutMillis || 5000,
      maxBatchSize: this.config.config?.batchConfig?.maxExportBatchSize || 100
    });

    console.log('🌶️ Traces Exporter configured for endpoint:', finalEndpoint);
  }

  private setupLogging(): void {
    if (!this.config.logging?.enabled) return;

    // Determine logs endpoint
    let logsEndpoint: string | undefined;
    
    if (this.config.config?.logsEndpoint) {
      logsEndpoint = this.config.config.logsEndpoint;
    } else if (this.config.config?.endpoint) {
      // Auto-configure logs endpoint based on traces endpoint
      const tracesEndpoint = this.config.config.endpoint;
      if (tracesEndpoint.includes('/v1/traces')) {
        logsEndpoint = tracesEndpoint.replace('/v1/traces', '/v1/logs');
      } else if (tracesEndpoint.includes('4318')) {
        // OTLP standard ports: 4318 for HTTP, same endpoint with different path
        logsEndpoint = tracesEndpoint.replace(/\/[^\/]*$/, '') + '/v1/logs';
      }
    }

    if (logsEndpoint) {
      this.logger = new PepperLogger({
        serviceName: this.config.serviceName,
        loggingConfig: {
          endpoint: logsEndpoint,
          ...this.config.logging
        },
        globalResource: {
          'service.name': this.config.serviceName,
          'service.version': '1.0.0',
          'telemetry.sdk.name': '@padfoot044/pepper-log',
          'telemetry.sdk.version': '2.0.0',
          'session.id': this.sessionId,
          'framework.name': this.detectedFramework?.name || 'unknown',
          'framework.version': this.detectedFramework?.version || 'unknown',
          ...this.config.globalAttributes
        }
      });

      console.log('🌶️ Logger configured for endpoint:', logsEndpoint);
    } else {
      console.warn('🌶️ No logs endpoint configured - logs will only appear in console');
      
      // Create console-only logger
      this.logger = new PepperLogger({
        serviceName: this.config.serviceName,
        loggingConfig: {
          enabled: true,
          level: this.config.logging.level || LogLevel.INFO,
          consoleOutput: true,
          enableCorrelation: this.config.logging.enableCorrelation
        }
      });
    }
  }

  private detectFramework(): DetectedFramework {
    // Angular detection
    if (typeof window !== 'undefined') {
      // Check for Angular in window
      const ng = (window as any).ng;
      if (ng && ng.version) {
        return { name: 'angular', version: ng.version.full, confidence: 0.9, source: 'window.ng' };
      }
      
      // Check for Angular in DOM
      const ngElements = document.querySelectorAll('[ng-version]');
      if (ngElements.length > 0) {
        const version = ngElements[0].getAttribute('ng-version');
        return { name: 'angular', version: version || undefined, confidence: 0.8, source: 'dom-ng-version' };
      }

      // Check for React
      const reactRoot = document.querySelector('[data-reactroot]') || document.getElementById('root');
      if (reactRoot || (window as any).React) {
        const reactVersion = (window as any).React?.version;
        return { name: 'react', version: reactVersion, confidence: 0.8, source: 'react-detection' };
      }

      // Check for Vue
      if ((window as any).Vue) {
        const vueVersion = (window as any).Vue.version;
        return { name: 'vue', version: vueVersion, confidence: 0.9, source: 'window.Vue' };
      }
    }
    
    return { name: 'unknown', confidence: 0, source: 'browser' };
  }

  // ========================================
  // TRACING METHODS (existing functionality)
  // ========================================

  createSpan(name: string, attributes?: Record<string, any>): any {
    if (!this.isInitialized) {
      console.warn('🌶️ PepperLog not initialized, span creation skipped');
      return this.createNoOpSpan();
    }

    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const startTime = Date.now();

    const spanInfo: ActiveSpan = {
      traceId,
      spanId,
      name,
      startTime,
      attributes: {
        'service.name': this.config.serviceName,
        'session.id': this.sessionId,
        'framework.name': this.detectedFramework?.name || 'unknown',
        'framework.version': this.detectedFramework?.version || 'unknown',
        ...this.config.globalAttributes,
        ...attributes
      },
      events: [],
      status: { code: 1 } // OK by default
    };

    this.activeSpans.set(spanId, spanInfo);

    // Set trace context for log correlation
    if (this.logger) {
      this.logger.setActiveTrace(traceId, spanId);
    }

    console.log('🌶️ PepperLog Span Started:', {
      name: spanInfo.name,
      traceId: spanInfo.traceId,
      spanId: spanInfo.spanId,
      attributes: spanInfo.attributes
    });

    const spanAPI = {
      setAttributes: (attrs: Record<string, any>) => {
        const span = this.activeSpans.get(spanId);
        if (span) {
          Object.assign(span.attributes, attrs);
          console.log('🌶️ PepperLog Span Attributes Updated:', attrs);
        }
      },
      addEvent: (name: string, attributes?: Record<string, any>) => {
        const span = this.activeSpans.get(spanId);
        if (span) {
          span.events.push({
            timestamp: Date.now(),
            name,
            attributes: attributes || {}
          });
          console.log('🌶️ PepperLog Span Event Added:', { name, attributes });
        }
      },
      recordException: (error: Error) => {
        const span = this.activeSpans.get(spanId);
        if (span) {
          span.events.push({
            timestamp: Date.now(),
            name: 'exception',
            attributes: {
              'exception.type': error.name,
              'exception.message': error.message,
              'exception.stacktrace': error.stack || ''
            }
          });
          span.status = { code: 2, message: error.message }; // ERROR
          console.error('🌶️ PepperLog Span Exception:', {
            name: spanInfo.name,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          });
        }
      },
      setStatus: (status: { code: number; message?: string }) => {
        const span = this.activeSpans.get(spanId);
        if (span) {
          span.status = status;
          console.log('🌶️ PepperLog Span Status:', status);
        }
      },
      end: () => {
        const span = this.activeSpans.get(spanId);
        if (span) {
          const endTime = Date.now();
          const duration = endTime - span.startTime;
          
          console.log('🌶️ PepperLog Span Ended:', {
            name: span.name,
            traceId: span.traceId,
            spanId: span.spanId,
            duration: `${duration}ms`
          });

          // Send to traces exporter if available
          if (this.tracesExporter) {
            const otlpSpan: OTLPSpanData = {
              traceId: span.traceId,
              spanId: span.spanId,
              parentSpanId: span.parentSpanId,
              name: span.name,
              startTimeUnixNano: toUnixNano(span.startTime),
              endTimeUnixNano: toUnixNano(endTime),
              attributes: convertAttributes(span.attributes),
              status: span.status,
              events: span.events.map(event => ({
                timeUnixNano: toUnixNano(event.timestamp),
                name: event.name,
                attributes: convertAttributes(event.attributes)
              }))
            };

            this.tracesExporter.addSpan(otlpSpan);
          }

          // Clear trace context
          if (this.logger) {
            this.logger.clearTraceContext();
          }

          this.activeSpans.delete(spanId);
        }
      }
    };

    return spanAPI;
  }

  private createNoOpSpan() {
    return {
      setAttributes: () => {},
      addEvent: () => {},
      recordException: () => {},
      setStatus: () => {},
      end: () => {}
    };
  }

  async traceFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);
    
    try {
      console.log(`🌶️ PepperLog: Executing traced function: ${name}`);
      const result = await Promise.resolve(fn());
      
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  }

  // ========================================
  // LOGGING METHODS (new functionality)
  // ========================================

  debug(message: string, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.debug(message, attributes);
    } else if (this.config.logging?.consoleOutput !== false) {
      console.debug('🌶️ PepperLog DEBUG:', message, attributes);
    }
  }

  info(message: string, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.info(message, attributes);
    } else if (this.config.logging?.consoleOutput !== false) {
      console.info('🌶️ PepperLog INFO:', message, attributes);
    }
  }

  warn(message: string, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.warn(message, attributes);
    } else if (this.config.logging?.consoleOutput !== false) {
      console.warn('🌶️ PepperLog WARN:', message, attributes);
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.error(message, error, attributes);
    } else if (this.config.logging?.consoleOutput !== false) {
      console.error('🌶️ PepperLog ERROR:', message, error, attributes);
    }
  }

  fatal(message: string, error?: Error, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.fatal(message, error, attributes);
    } else if (this.config.logging?.consoleOutput !== false) {
      console.error('🌶️ PepperLog FATAL:', message, error, attributes);
    }
  }

  // Advanced logging methods
  logException(error: Error, message?: string, options?: any): void {
    if (this.logger) {
      this.logger.logException(error, message, options);
    } else {
      this.error(message || `Exception: ${error.message}`, error);
    }
  }

  withContext(attributes: Record<string, any>): PepperLog {
    if (this.logger) {
      // Create a shallow clone and update the logger with context
      const contextualPepperLog = Object.create(Object.getPrototypeOf(this));
      Object.assign(contextualPepperLog, this);
      contextualPepperLog.logger = this.logger.withContext(attributes);
      return contextualPepperLog;
    }
    return this;
  }

  logDuration(operation: string, duration: number, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.logDuration(operation, duration, attributes);
    } else {
      this.info(`Operation completed: ${operation}`, {
        'operation.name': operation,
        'operation.duration_ms': duration,
        ...attributes
      });
    }
  }

  // Timer methods for automatic timing/duration logging
  startTimer(operation: string, attributes?: Record<string, any>): any {
    if (this.logger) {
      return this.logger.startTimer(operation, attributes);
    }
    
    // Fallback implementation for when no logger is available
    const startTime = Date.now();
    const timerId = `timer-${startTime}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: timerId,
      operation,
      startTime,
      startAttributes: attributes || {},
      end: (endAttributes?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        this.logDuration(operation, duration, { ...attributes, ...endAttributes });
      },
      cancel: () => {
        console.warn('🌶️ PepperLog Timer cancelled:', operation);
      },
      addContext: (contextAttributes: Record<string, any>) => {
        // No-op for fallback implementation
      }
    };
  }

  endTimer(timerId: string, attributes?: Record<string, any>): void {
    if (this.logger) {
      this.logger.endTimer(timerId, attributes);
    } else {
      console.warn('🌶️ PepperLog: Cannot end timer, logger not available');
    }
  }

  async timeAsync<T>(operation: string, fn: () => Promise<T>, attributes?: Record<string, any>): Promise<T> {
    if (this.logger) {
      return this.logger.timeAsync(operation, fn, attributes);
    }
    
    // Fallback implementation
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.logDuration(operation, duration, { 
        ...attributes, 
        'timing.status': 'success',
        'timing.type': 'async'
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logDuration(operation, duration, { 
        ...attributes, 
        'timing.status': 'error',
        'timing.error': error instanceof Error ? error.message : String(error),
        'timing.type': 'async'
      });
      throw error;
    }
  }

  timeSync<T>(operation: string, fn: () => T, attributes?: Record<string, any>): T {
    if (this.logger) {
      return this.logger.timeSync(operation, fn, attributes);
    }
    
    // Fallback implementation
    const startTime = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      this.logDuration(operation, duration, { 
        ...attributes, 
        'timing.status': 'success',
        'timing.type': 'sync'
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logDuration(operation, duration, { 
        ...attributes, 
        'timing.status': 'error',
        'timing.error': error instanceof Error ? error.message : String(error),
        'timing.type': 'sync'
      });
      throw error;
    }
  }

  // Timer utility methods
  getActiveTimers(): any[] {
    if (this.logger && 'getActiveTimers' in this.logger && typeof this.logger.getActiveTimers === 'function') {
      return this.logger.getActiveTimers();
    }
    return [];
  }

  cleanupTimers(): void {
    if (this.logger && 'cleanupTimers' in this.logger && typeof this.logger.cleanupTimers === 'function') {
      this.logger.cleanupTimers();
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  getDetectedFramework(): DetectedFramework | null {
    return this.detectedFramework;
  }

  getConfig(): PepperLogConfig {
    return { ...this.config };
  }

  getLoggingConfig(): LoggingConfig | undefined {
    return this.config.logging;
  }

  getCorrelationInfo(): any {
    return this.logger?.getCorrelationInfo() || null;
  }

  isLoggingEnabled(): boolean {
    return this.config.logging?.enabled || false;
  }

  isTracingEnabled(): boolean {
    return this.config.features?.tracing || false;
  }

  async shutdown(): Promise<void> {
    console.log('🌶️ PepperLog: Shutting down...');
    
    if (this.tracesExporter) {
      await this.tracesExporter.forceFlush();
      this.tracesExporter.shutdown();
    }
    
    if (this.logger) {
      await this.logger.flush();
      this.logger.shutdown();
    }
    
    this.activeSpans.clear();
    this.isInitialized = false;
    console.log('🌶️ PepperLog: Shutdown complete');
  }
}