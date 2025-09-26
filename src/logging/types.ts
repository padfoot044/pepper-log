// OpenTelemetry Logs types and interfaces
// Following OTLP specification for logs

export enum LogLevel {
  DEBUG = 5,
  INFO = 9,
  WARN = 13,
  ERROR = 17,
  FATAL = 21
}

export interface LogRecord {
  timestamp: number;
  level: LogLevel;
  message: string;
  attributes: Record<string, any>;
  traceId?: string;
  spanId?: string;
  resource: Record<string, any>;
}

export interface LogBatchConfig {
  maxBatchSize: number;      // Maximum logs per batch (default: 1000)
  batchTimeout: number;      // Time to wait before sending batch (default: 5000ms)
  maxQueueSize: number;      // Maximum logs in memory (default: 10000)
  retryAttempts: number;     // Number of retry attempts (default: 3)
  retryDelay: number;        // Delay between retries (default: 1000ms)
}

export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  endpoint?: string;           // Override logs endpoint
  batchConfig?: Partial<LogBatchConfig>;
  consoleOutput?: boolean;     // Also log to console
  enableCorrelation?: boolean; // Auto-correlate with traces
  localStorageKey?: string;    // Browser: store logs locally when offline
  maxLocalLogs?: number;       // Browser: max logs in local storage
}

export interface OTLPLogRecord {
  timeUnixNano: string;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Array<{ 
    key: string; 
    value: { 
      stringValue?: string; 
      intValue?: number; 
      boolValue?: boolean; 
      doubleValue?: number;
    } 
  }>;
  traceId?: string;
  spanId?: string;
}

export interface OTLPLogsPayload {
  resourceLogs: Array<{
    resource: {
      attributes: Array<{ 
        key: string; 
        value: { stringValue: string } 
      }>;
    };
    scopeLogs: Array<{
      scope: {
        name: string;
        version: string;
      };
      logRecords: OTLPLogRecord[];
    }>;
  }>;
}

export interface Logger {
  debug(message: string, attributes?: Record<string, any>): void;
  info(message: string, attributes?: Record<string, any>): void;
  warn(message: string, attributes?: Record<string, any>): void;
  error(message: string, error?: Error, attributes?: Record<string, any>): void;
  fatal(message: string, error?: Error, attributes?: Record<string, any>): void;
  
  // Advanced methods
  log(level: LogLevel, message: string, attributes?: Record<string, any>): void;
  withContext(attributes: Record<string, any>): Logger;
  logDuration(operation: string, duration: number, attributes?: Record<string, any>): void;
}