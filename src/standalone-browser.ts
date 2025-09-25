// Completely self-contained browser-only PepperLog
// No external imports that could lead to Node.js modules

export interface PepperLogConfig {
  backend: 'signoz' | 'datadog' | 'jaeger' | 'newrelic' | 'grafana' | 'azure' | 'aws-xray' | 'custom';
  serviceName: string;
  config: any;
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

/**
 * Ultra-lightweight browser-only PepperLog
 * Zero external dependencies to avoid Node.js compatibility issues
 */
export class PepperLog {
  private config: PepperLogConfig;
  private detectedFramework: DetectedFramework | null = null;
  private isInitialized = false;
  private sessionId: string;

  constructor(config: PepperLogConfig) {
    console.log('🌶️  PepperLog: Creating ultra-lightweight browser instance');
    this.config = {
      features: {
        tracing: true,
        metrics: true,
        logging: true,
        autoInstrumentation: false,
        ...config.features
      },
      environment: config.environment || 'browser',
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.detectFramework();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🌶️  PepperLog: Initializing browser telemetry...');
      console.log(`📊 Service: ${this.config.serviceName}`);
      console.log(`🔗 Backend: ${this.config.backend}`);
      
      if (this.detectedFramework) {
        console.log(`🅰️  Framework: ${this.detectedFramework.name} v${this.detectedFramework.version} (${Math.round(this.detectedFramework.confidence * 100)}% confidence)`);
      }
      
      this.isInitialized = true;
      console.log('✅ PepperLog: Browser telemetry initialized successfully!');
      
      // Send initialization trace
      await this.traceFunction('app.initialization', async () => {
        console.log('🚀 Application started with PepperLog browser telemetry');
        return { 
          status: 'initialized',
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId
        };
      });
      
    } catch (error) {
      console.error('❌ PepperLog initialization failed:', error);
      // Don't throw - continue without telemetry
    }
  }

  createSpan(name: string, attributes?: Record<string, any>): any {
    const spanInfo = {
      name,
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      startTime: Date.now(),
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': '1.0.0',
        'telemetry.backend': this.config.backend,
        'session.id': this.sessionId,
        ...this.config.globalAttributes,
        ...attributes
      }
    };

    console.log('🌶️  PepperLog Span Started:', {
      name: spanInfo.name,
      traceId: spanInfo.traceId,
      spanId: spanInfo.spanId,
      attributes: spanInfo.attributes
    });

    return {
      setAttributes: (attrs: Record<string, any>) => {
        Object.assign(spanInfo.attributes, attrs);
        console.log('🌶️  PepperLog Span Attributes Updated:', attrs);
      },
      recordException: (error: Error) => {
        console.error('🌶️  PepperLog Span Exception:', {
          name: spanInfo.name,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        });
      },
      setStatus: (status: any) => {
        console.log('🌶️  PepperLog Span Status:', status);
      },
      end: () => {
        const endTime = Date.now();
        const duration = endTime - spanInfo.startTime;
        console.log('🌶️  PepperLog Span Ended:', {
          name: spanInfo.name,
          traceId: spanInfo.traceId,
          spanId: spanInfo.spanId,
          duration: `${duration}ms`
        });
      }
    };
  }

  async traceFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);
    
    try {
      console.log(`🌶️  PepperLog: Executing traced function: ${name}`);
      const result = await Promise.resolve(fn());
      
      span.setStatus({ code: 1 }); // OK
      console.log(`✅ PepperLog: Function completed successfully: ${name}`);
      
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      
      console.error(`❌ PepperLog: Function failed: ${name}`, error);
      throw error;
    } finally {
      span.end();
    }
  }

  createCounter(name: string, description?: string) {
    console.log(`📊 PepperLog Counter Created: ${name}`, { description });
    
    return {
      add: (value: number, attributes?: Record<string, any>) => {
        const counterData = {
          name,
          value,
          attributes: {
            'service.name': this.config.serviceName,
            'session.id': this.sessionId,
            ...attributes
          },
          timestamp: Date.now()
        };
        console.log(`📊 PepperLog Counter [${name}] += ${value}:`, counterData);
      }
    };
  }

  createHistogram(name: string, description?: string) {
    console.log(`📈 PepperLog Histogram Created: ${name}`, { description });
    
    return {
      record: (value: number, attributes?: Record<string, any>) => {
        const histogramData = {
          name,
          value,
          attributes: {
            'service.name': this.config.serviceName,
            'session.id': this.sessionId,
            ...attributes
          },
          timestamp: Date.now()
        };
        console.log(`📈 PepperLog Histogram [${name}] recorded ${value}:`, histogramData);
      }
    };
  }

  addAttributes(attributes: Record<string, string | number | boolean>): void {
    console.log('🌶️  PepperLog Global Attributes Added:', attributes);
    if (this.config.globalAttributes) {
      Object.assign(this.config.globalAttributes, attributes);
    } else {
      this.config.globalAttributes = { ...attributes };
    }
  }

  getConfig(): PepperLogConfig {
    return { ...this.config };
  }

  getDetectedFramework(): DetectedFramework | null {
    return this.detectedFramework;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async shutdown(): Promise<void> {
    console.log('🌶️  PepperLog: Browser telemetry shutdown');
    this.isInitialized = false;
  }

  // Private methods
  private detectFramework(): void {
    try {
      const win = window as any;
      
      // Angular detection
      if (win.ng) {
        this.detectedFramework = {
          name: 'angular',
          version: win.ng.version?.full || 'unknown',
          confidence: 0.95,
          source: 'global'
        };
        return;
      }

      // Check for Angular elements
      const angularElements = document.querySelectorAll('[ng-version], app-root, [_nghost], [_ngcontent]');
      if (angularElements.length > 0) {
        const versionAttr = document.querySelector('[ng-version]')?.getAttribute('ng-version');
        this.detectedFramework = {
          name: 'angular',
          version: versionAttr || 'unknown',
          confidence: 0.9,
          source: 'dom'
        };
        return;
      }

      // React detection
      if (win.React) {
        this.detectedFramework = {
          name: 'react',
          version: win.React.version || 'unknown',
          confidence: 0.95,
          source: 'global'
        };
        return;
      }

      // Vue detection
      if (win.Vue) {
        this.detectedFramework = {
          name: 'vue',
          version: win.Vue.version || 'unknown',
          confidence: 0.95,
          source: 'global'
        };
        return;
      }

      // Next.js detection
      if (win.__NEXT_DATA__ || win.__NEXT_ROUTER__) {
        this.detectedFramework = {
          name: 'nextjs',
          version: 'unknown',
          confidence: 0.9,
          source: 'global'
        };
        return;
      }

      console.log('🌶️  PepperLog: No framework detected, using vanilla JavaScript');
    } catch (error) {
      console.log('🌶️  PepperLog: Framework detection failed, continuing without framework info');
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateSpanId(): string {
    return `span-${Math.random().toString(36).substr(2, 8)}`;
  }
}

// Factory function
export function createPepperLog(config: PepperLogConfig): PepperLog {
  return new PepperLog(config);
}

// Default export for easier imports
export default PepperLog;