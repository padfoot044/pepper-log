import { trace, SpanStatusCode } from '@opentelemetry/api';

import { 
  PepperLogConfig, 
  PepperLogInstance, 
  DetectedFramework, 
  Framework 
} from './types';
import { BrowserFrameworkDetector } from './browser-detector';

/**
 * Simplified PepperLog for browser environments
 * Uses console logging and basic tracing without complex SDK setup
 */
export class PepperLogSimple implements PepperLogInstance {
  private config: PepperLogConfig;
  private detectedFramework: DetectedFramework | null = null;
  private isInitialized = false;
  private tracer: any = null;

  constructor(config: PepperLogConfig) {
    this.config = {
      features: {
        tracing: true,
        metrics: true,
        logging: true,
        autoInstrumentation: false, // Disabled for simplicity
        ...config.features
      },
      environment: config.environment || 'browser',
      globalAttributes: config.globalAttributes || {},
      ...config
    };

    // Auto-detect framework if not specified
    if (!this.config.framework || this.config.framework === 'auto') {
      // Detect framework in browser
      this.detectedFramework = BrowserFrameworkDetector.getInstance().detectFramework();
      if (this.detectedFramework) {
        this.config.framework = this.detectedFramework.name;
      }
    }
  }

  /**
   * Initialize simple telemetry
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('PepperLog: Already initialized');
      return;
    }

    try {
      console.log(`🌶️  PepperLog: Initializing simple telemetry for browser with backend: ${this.config.backend}`);
      
      if (this.detectedFramework) {
        console.log(`🌶️  PepperLog: Detected framework: ${this.detectedFramework.name} v${this.detectedFramework.version || 'unknown'} (confidence: ${Math.round(this.detectedFramework.confidence * 100)}%)`);
      }

      // For now, we'll use console logging and basic tracing
      this.tracer = trace.getTracer('pepper-log-simple', '1.0.0');
      
      this.isInitialized = true;
      console.log('🌶️  PepperLog: Simple telemetry initialized!');

      // Log startup information
      console.log('🌶️  PepperLog Startup:', {
        serviceName: this.config.serviceName,
        backend: this.config.backend,
        framework: this.config.framework || 'unknown',
        environment: this.config.environment,
        platform: 'browser',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('🌶️  PepperLog: Failed to initialize simple telemetry:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): PepperLogConfig {
    return { ...this.config };
  }

  /**
   * Get detected framework information
   */
  public getDetectedFramework(): DetectedFramework | null {
    return this.detectedFramework;
  }

  /**
   * Create a span (simplified - logs to console)
   */
  public createSpan(name: string, attributes?: Record<string, any>): any {
    const spanInfo = {
      name,
      startTime: Date.now(),
      attributes: {
        ...this.config.globalAttributes,
        ...attributes
      },
      serviceName: this.config.serviceName
    };

    console.log('🌶️  PepperLog Span Started:', spanInfo);

    // Return a mock span object
    return {
      setAttributes: (attrs: Record<string, any>) => {
        Object.assign(spanInfo.attributes, attrs);
        console.log('🌶️  PepperLog Span Attributes Updated:', spanInfo);
      },
      recordException: (error: Error) => {
        console.error('🌶️  PepperLog Span Exception:', {
          ...spanInfo,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        });
      },
      setStatus: (status: any) => {
        console.log('🌶️  PepperLog Span Status:', { ...spanInfo, status });
      },
      end: () => {
        const endTime = Date.now();
        const duration = endTime - spanInfo.startTime;
        console.log('🌶️  PepperLog Span Ended:', {
          ...spanInfo,
          endTime,
          duration: `${duration}ms`
        });
      }
    };
  }

  /**
   * Trace a function with automatic span management
   */
  public async traceFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);
    
    try {
      console.log(`🌶️  PepperLog: Executing traced function: ${name}`);
      const result = await fn();
      
      span.setStatus({ code: SpanStatusCode.OK });
      console.log(`🌶️  PepperLog: Function completed successfully: ${name}`);
      
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: (error as Error).message 
      });
      
      console.error(`🌶️  PepperLog: Function failed: ${name}`, error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add custom attributes (logs them)
   */
  public addAttributes(attributes: Record<string, string | number | boolean>): void {
    console.log('🌶️  PepperLog Global Attributes Added:', attributes);
    if (this.config.globalAttributes) {
      Object.assign(this.config.globalAttributes, attributes);
    } else {
      this.config.globalAttributes = { ...attributes };
    }
  }

  /**
   * Create a counter (simplified)
   */
  public createCounter(name: string, description?: string) {
    console.log(`🌶️  PepperLog Counter Created: ${name}`, { description });
    
    return {
      add: (value: number, attributes?: Record<string, any>) => {
        console.log(`🌶️  PepperLog Counter [${name}] += ${value}:`, attributes || {});
      }
    };
  }

  /**
   * Create a histogram (simplified)
   */
  public createHistogram(name: string, description?: string) {
    console.log(`🌶️  PepperLog Histogram Created: ${name}`, { description });
    
    return {
      record: (value: number, attributes?: Record<string, any>) => {
        console.log(`🌶️  PepperLog Histogram [${name}] recorded ${value}:`, attributes || {});
      }
    };
  }

  /**
   * Structured logging methods (v3.0.0+)
   */
  public info(message: string, attributes?: Record<string, any>): void {
    console.info(`[INFO] ${message}`, attributes || {});
  }

  public warn(message: string, attributes?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, attributes || {});
  }

  public error(message: string, error?: Error, attributes?: Record<string, any>): void {
    const allAttributes = {
      ...(error ? {
        'error.type': error.name,
        'error.message': error.message,
        'error.stack': error.stack
      } : {}),
      ...(attributes || {})
    };
    console.error(`[ERROR] ${message}`, allAttributes);
  }

  public debug(message: string, attributes?: Record<string, any>): void {
    console.debug(`[DEBUG] ${message}`, attributes || {});
  }

  public fatal(message: string, error?: Error, attributes?: Record<string, any>): void {
    const allAttributes = {
      ...(error ? {
        'error.type': error.name,
        'error.message': error.message,
        'error.stack': error.stack
      } : {}),
      ...(attributes || {})
    };
    console.error(`[FATAL] ${message}`, allAttributes);
  }

  /**
   * Shutdown telemetry
   */
  public async shutdown(): Promise<void> {
    console.log('🌶️  PepperLog: Simple telemetry shutdown');
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}