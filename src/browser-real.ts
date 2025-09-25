// Real browser PepperLog implementation with actual OTLP network requests
// Zero Node.js dependencies, uses native browser APIs for HTTP requests

import { BrowserOTLPExporter, OTLPSpanData, generateTraceId, generateSpanId, toUnixNano, convertAttributes } from './browser-otlp';

export interface PepperLogConfig {
  backend: 'signoz' | 'datadog' | 'jaeger' | 'newrelic' | 'grafana' | 'azure' | 'aws-xray' | 'custom';
  serviceName: string;
  config?: {
    endpoint?: string;
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
 * Real browser PepperLog implementation with actual network requests
 * Sends traces via HTTP to OTLP endpoints using native browser APIs
 */
export class PepperLog {
  private config: PepperLogConfig;
  private detectedFramework: DetectedFramework | null = null;
  private isInitialized = false;
  private sessionId: string;
  private exporter: BrowserOTLPExporter | null = null;
  private activeSpans: Map<string, ActiveSpan> = new Map();

  constructor(config: PepperLogConfig) {
    console.log('🌶️ PepperLog: Creating real browser instance with network capability');
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
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    console.log('🌶️ PepperLog configuration:', {
      serviceName: this.config.serviceName,
      backend: this.config.backend,
      endpoint: this.config.config?.endpoint,
      features: this.config.features
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

    console.log('🌶️ PepperLog: Initializing real browser telemetry...');
    
    // Detect framework
    this.detectedFramework = this.detectFramework();
    console.log('🌶️ Detected framework:', this.detectedFramework);

    // Setup OTLP exporter if endpoint is configured
    if (this.config.config?.endpoint && this.config.features?.tracing) {
      this.setupOTLPExporter();
    } else {
      console.warn('🌶️ No OTLP endpoint configured - traces will only be logged to console');
    }

    this.isInitialized = true;
    console.log('🌶️ PepperLog initialized successfully with real network capability');
  }

  private setupOTLPExporter(): void {
    const endpoint = this.config.config?.endpoint;
    if (!endpoint) return;

    let finalEndpoint = endpoint;
    
    // Auto-configure endpoint based on backend
    if (this.config.backend === 'grafana' && !endpoint.includes('/v1/traces')) {
      finalEndpoint = endpoint.endsWith('/') ? endpoint + 'v1/traces' : endpoint + '/v1/traces';
    }

    this.exporter = new BrowserOTLPExporter({
      endpoint: finalEndpoint,
      serviceName: this.config.serviceName,
      headers: this.config.config?.headers,
      batchTimeout: this.config.config?.batchConfig?.exportTimeoutMillis || 5000,
      maxBatchSize: this.config.config?.batchConfig?.maxExportBatchSize || 100
    });

    console.log('🌶️ OTLP Exporter configured for endpoint:', finalEndpoint);
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

    console.log('🌶️ PepperLog Span Started:', {
      name: spanInfo.name,
      traceId: spanInfo.traceId,
      spanId: spanInfo.spanId,
      attributes: spanInfo.attributes
    });

    return {
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

          // Send to OTLP exporter if available
          if (this.exporter) {
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

            this.exporter.addSpan(otlpSpan);
          } else {
            console.log('🌶️ No exporter configured - span logged to console only');
          }

          this.activeSpans.delete(spanId);
        }
      }
    };
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

  info(message: string, attributes?: Record<string, any>): void {
    if (!this.config.features?.logging) return;
    
    console.log('🌶️ PepperLog INFO:', message, attributes);
    
    if (this.config.features?.tracing) {
      const span = this.createSpan(`log.info`, { 
        'log.message': message, 
        'log.level': 'info',
        ...attributes 
      });
      span.end();
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, any>): void {
    if (!this.config.features?.logging) return;
    
    console.error('🌶️ PepperLog ERROR:', message, error, attributes);
    
    if (this.config.features?.tracing) {
      const span = this.createSpan(`log.error`, { 
        'log.message': message, 
        'log.level': 'error',
        ...attributes 
      });
      if (error) {
        span.recordException(error);
      }
      span.end();
    }
  }

  warn(message: string, attributes?: Record<string, any>): void {
    if (!this.config.features?.logging) return;
    
    console.warn('🌶️ PepperLog WARN:', message, attributes);
    
    if (this.config.features?.tracing) {
      const span = this.createSpan(`log.warn`, { 
        'log.message': message, 
        'log.level': 'warn',
        ...attributes 
      });
      span.end();
    }
  }

  debug(message: string, attributes?: Record<string, any>): void {
    if (!this.config.features?.logging) return;
    
    console.debug('🌶️ PepperLog DEBUG:', message, attributes);
  }

  getDetectedFramework(): DetectedFramework | null {
    return this.detectedFramework;
  }

  getConfig(): PepperLogConfig {
    return { ...this.config };
  }

  async shutdown(): Promise<void> {
    console.log('🌶️ PepperLog: Shutting down...');
    
    if (this.exporter) {
      await this.exporter.forceFlush();
      this.exporter.shutdown();
    }
    
    this.activeSpans.clear();
    this.isInitialized = false;
    console.log('🌶️ PepperLog: Shutdown complete');
  }
}