import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api';

import { 
  PepperLogConfig, 
  PepperLogInstance, 
  DetectedFramework, 
  Framework 
} from './types';
import { FrameworkDetector } from './detector';
import { BackendFactory } from './backends';
import { FrameworkIntegrationFactory } from './frameworks';
import { PepperLogSimple } from './simple';

/**
 * Factory function to create the appropriate PepperLog instance
 * Uses simple version for browser, full version for Node.js
 */
export function createPepperLog(config: PepperLogConfig): PepperLogInstance {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  
  if (isBrowser) {
    console.log('🌶️  PepperLog: Creating browser instance (simplified)');
    return new PepperLogSimple(config);
  } else {
    console.log('🌶️  PepperLog: Creating Node.js instance (full SDK)');
    return new PepperLogNode(config);
  }
}

// Export the factory function as the default class
export class PepperLog implements PepperLogInstance {
  private instance: PepperLogInstance;

  constructor(config: PepperLogConfig) {
    this.instance = createPepperLog(config);
  }

  async initialize(): Promise<void> {
    return this.instance.initialize();
  }

  getConfig(): PepperLogConfig {
    return this.instance.getConfig();
  }

  getDetectedFramework(): DetectedFramework | null {
    return this.instance.getDetectedFramework();
  }

  createSpan(name: string, options?: any): any {
    return this.instance.createSpan(name, options);
  }

  addAttributes(attributes: Record<string, string | number | boolean>): void {
    return this.instance.addAttributes(attributes);
  }

  async shutdown(): Promise<void> {
    return this.instance.shutdown();
  }

  // Additional methods for compatibility
  async traceFunction<T>(name: string, fn: () => Promise<T> | T, attributes?: any): Promise<T> {
    if ('traceFunction' in this.instance) {
      return (this.instance as any).traceFunction(name, fn, attributes);
    }
    // Fallback implementation
    const span = this.createSpan(name, attributes);
    try {
      const result = await fn();
      if (span) span.end();
      return result;
    } catch (error) {
      if (span) {
        span.recordException(error as Error);
        span.end();
      }
      throw error;
    }
  }

  createCounter(name: string, description?: string) {
    if ('createCounter' in this.instance) {
      return (this.instance as any).createCounter(name, description);
    }
    return null;
  }

  createHistogram(name: string, description?: string) {
    if ('createHistogram' in this.instance) {
      return (this.instance as any).createHistogram(name, description);
    }
    return null;
  }
}

// Internal Node.js implementation
class PepperLogNode implements PepperLogInstance {
  private config: PepperLogConfig;
  private sdk: NodeSDK | null = null;
  private detectedFramework: DetectedFramework | null = null;
  private isInitialized = false;

  constructor(config: PepperLogConfig) {
    this.config = {
      features: {
        tracing: true,
        metrics: true,
        logging: true,
        autoInstrumentation: true,
        ...config.features
      },
      environment: config.environment || process?.env?.NODE_ENV || 'development',
      globalAttributes: config.globalAttributes || {},
      ...config
    };

    // Auto-detect framework if not specified
    if (!this.config.framework || this.config.framework === 'auto') {
      this.detectedFramework = FrameworkDetector.getInstance().detectFramework();
      if (this.detectedFramework) {
        this.config.framework = this.detectedFramework.name;
      }
    }
  }

  /**
   * Initialize OpenTelemetry with detected framework and backend (Node.js only)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('PepperLog: Already initialized');
      return;
    }

    try {
      console.log(`🌶️  PepperLog: Initializing Node.js telemetry with backend: ${this.config.backend}`);
      
      if (this.detectedFramework) {
        console.log(`🌶️  PepperLog: Detected framework: ${this.detectedFramework.name} v${this.detectedFramework.version || 'unknown'} (confidence: ${Math.round(this.detectedFramework.confidence * 100)}%)`);
      }

      await this.setupNodeTelemetry();
      await this.setupFrameworkIntegration();
      
      this.isInitialized = true;
      console.log('🌶️  PepperLog: Successfully initialized!');

      // Create a startup span to verify everything is working
      const startupSpan = this.createSpan('pepper-log.startup', {
        'pepper-log.version': '1.0.0',
        'pepper-log.framework': this.config.framework || 'unknown',
        'pepper-log.backend': this.config.backend,
        'pepper-log.environment': this.config.environment,
        'pepper-log.platform': 'node'
      });

      if (startupSpan) {
        setTimeout(() => startupSpan.end(), 100);
      }

    } catch (error) {
      console.error('🌶️  PepperLog: Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Setup Node.js telemetry
   */
  private async setupNodeTelemetry(): Promise<void> {
    const backend = BackendFactory.getBackend(this.config.backend);
    const defaultConfig = backend.getDefaultConfig();
    
    const finalConfig = {
      ...defaultConfig,
      ...this.config.config
    };

    const exporter = backend.createExporter(finalConfig);

    // Initialize Node.js SDK
    this.sdk = new NodeSDK({
      traceExporter: exporter,
      instrumentations: this.config.features?.autoInstrumentation 
        ? [getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false
            }
          })]
        : [],
      serviceName: this.config.serviceName
    });

    // Start the SDK
    this.sdk.start();
    
    console.log('🌶️  PepperLog: Node.js SDK started');
  }

  /**
   * Setup framework-specific integration
   */
  private async setupFrameworkIntegration(): Promise<void> {
    if (!this.config.framework) {
      console.log('🌶️  PepperLog: No framework detected, using basic instrumentation');
      return;
    }

    const integration = FrameworkIntegrationFactory.getIntegration(this.config.framework);
    if (integration) {
      integration.initialize();
    } else {
      console.warn(`🌶️  PepperLog: Framework integration not available for: ${this.config.framework}`);
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
   * Create a custom span
   */
  public createSpan(name: string, options?: any): any {
    const tracer = trace.getTracer('pepper-log');
    return tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      ...options,
      attributes: {
        'pepper-log.custom': true,
        ...options?.attributes
      }
    });
  }

  /**
   * Add custom attributes to current span
   */
  public addAttributes(attributes: Record<string, string | number | boolean>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Create a custom metric
   */
  public createCounter(name: string, description?: string) {
    const meter = metrics.getMeter('pepper-log');
    return meter.createCounter(name, {
      description: description || `Custom counter: ${name}`
    });
  }

  /**
   * Create a histogram metric
   */
  public createHistogram(name: string, description?: string) {
    const meter = metrics.getMeter('pepper-log');
    return meter.createHistogram(name, {
      description: description || `Custom histogram: ${name}`
    });
  }

  /**
   * Manually trace a function
   */
  public async traceFunction<T>(
    name: string, 
    fn: () => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const span = this.createSpan(name, { attributes });
    
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : String(error) 
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Shutdown telemetry
   */
  public async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.isInitialized = false;
      console.log('🌶️  PepperLog: Shutdown complete');
    }
  }
}

// Export the main class and types
export * from './types';
export { FrameworkDetector } from './detector';
export { BackendFactory } from './backends';
export { FrameworkIntegrationFactory } from './frameworks';