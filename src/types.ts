export interface PepperLogConfig {
  /** Backend service provider */
  backend: 'signoz' | 'datadog' | 'jaeger' | 'newrelic' | 'grafana' | 'azure' | 'aws-xray' | 'custom';
  
  /** Service name for tracing */
  serviceName: string;
  
  /** Backend-specific configuration */
  config: BackendConfig;
  
  /** Optional framework override (auto-detected if not provided) */
  framework?: Framework;
  
  /** Enable/disable specific instrumentation features */
  features?: {
    tracing?: boolean;
    metrics?: boolean;
    logging?: boolean;
    autoInstrumentation?: boolean;
  };
  
  /** Environment (auto-detected if not provided) */
  environment?: string;
  
  /** Custom attributes to add to all traces */
  globalAttributes?: Record<string, string | number | boolean>;
}

export type Framework = 'react' | 'angular' | 'vue' | 'express' | 'nextjs' | 'fastify' | 'koa' | 'custom' | 'auto';

export interface BackendConfig {
  /** Endpoint URL for the backend service */
  endpoint?: string;
  
  /** API key or token for authentication */
  apiKey?: string;
  
  /** Additional headers for requests */
  headers?: Record<string, string>;
  
  /** Custom exporter configuration */
  exporterConfig?: any;
  
  /** Batch configuration */
  batchConfig?: {
    maxExportBatchSize?: number;
    exportTimeoutMillis?: number;
    scheduledDelayMillis?: number;
  };
}

export interface DetectedFramework {
  name: Framework;
  version?: string;
  confidence: number;
  source: 'package.json' | 'runtime' | 'files' | 'environment';
}

export interface PepperLogInstance {
  /** Initialize OpenTelemetry with detected framework and backend */
  initialize(): Promise<void>;
  
  /** Get current configuration */
  getConfig(): PepperLogConfig;
  
  /** Get detected framework information */
  getDetectedFramework(): DetectedFramework | null;
  
  /** Create a custom span */
  createSpan(name: string, options?: any): any;
  
  /** Add custom attributes to current span */
  addAttributes(attributes: Record<string, string | number | boolean>): void;
  
  /** Shutdown telemetry */
  shutdown(): Promise<void>;
}