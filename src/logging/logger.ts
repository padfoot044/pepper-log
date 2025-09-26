// Main Logger Implementation - Structured logging with OTLP export
import { Logger, LogLevel, LogRecord, LoggingConfig, LogBatchConfig, Timer } from './types';
import { OTLPLogsExporter } from './otlp-logs-exporter';
import { TraceLogCorrelator } from './correlator';
import { PepperTimerManager } from './timer';

export class PepperLogger implements Logger {
  private config: LoggingConfig;
  private exporter: OTLPLogsExporter | null = null;
  private correlator: TraceLogCorrelator;
  private contextAttributes: Record<string, any> = {};
  private serviceName: string;
  private globalResource: Record<string, any>;
  private timerManager: PepperTimerManager;

  constructor(config: {
    serviceName: string;
    loggingConfig: LoggingConfig;
    globalResource?: Record<string, any>;
    endpoint?: string;
  }) {
    this.serviceName = config.serviceName;
    this.config = {
      enableCorrelation: true,
      consoleOutput: true,
      ...config.loggingConfig
    };
    this.globalResource = config.globalResource || {};
    this.correlator = new TraceLogCorrelator();

    // Initialize timer manager
    this.timerManager = new PepperTimerManager(
      (operation, duration, attributes) => this.logDuration(operation, duration, attributes),
      (message, attributes) => this.warn(message, attributes)
    );

    if (this.config.enabled && (this.config.endpoint || config.endpoint)) {
      this.setupExporter(this.config.endpoint || config.endpoint!);
    }

    console.log('🌶️ PepperLogger initialized:', {
      serviceName: this.serviceName,
      enabled: this.config.enabled,
      level: LogLevel[this.config.level],
      correlation: this.config.enableCorrelation,
      consoleOutput: this.config.consoleOutput
    });
  }

  private setupExporter(endpoint: string): void {
    try {
      this.exporter = new OTLPLogsExporter({
        endpoint,
        serviceName: this.serviceName,
        serviceVersion: '1.0.0',
        batchConfig: this.config.batchConfig
      });
      console.log('🌶️ Logs exporter configured for endpoint:', endpoint);
    } catch (error) {
      console.error('🌶️ Failed to setup logs exporter:', error);
    }
  }

  // Basic logging methods
  debug(message: string, attributes: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, attributes);
  }

  info(message: string, attributes: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, attributes);
  }

  warn(message: string, attributes: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, attributes);
  }

  error(message: string, error?: Error, attributes: Record<string, any> = {}): void {
    const errorAttributes = error ? {
      'error.type': error.name,
      'error.message': error.message,
      'error.stack': error.stack || '',
      ...attributes
    } : attributes;

    this.log(LogLevel.ERROR, message, errorAttributes);
  }

  fatal(message: string, error?: Error, attributes: Record<string, any> = {}): void {
    const errorAttributes = error ? {
      'error.type': error.name,
      'error.message': error.message,
      'error.stack': error.stack || '',
      ...attributes
    } : attributes;

    this.log(LogLevel.FATAL, message, errorAttributes);
  }

  // Core logging method
  log(level: LogLevel, message: string, attributes: Record<string, any> = {}): void {
    // Check if logging is enabled and level meets threshold
    if (!this.config.enabled || level < this.config.level) {
      return;
    }

    // Merge all attributes
    const allAttributes = {
      ...this.contextAttributes,
      ...attributes,
      'log.logger': '@padfoot044/pepper-log',
      'log.timestamp': new Date().toISOString()
    };

    // Create base log record
    const logRecord: LogRecord = {
      timestamp: Date.now(),
      level,
      message,
      attributes: allAttributes,
      resource: {
        'service.name': this.serviceName,
        ...this.globalResource
      }
    };

    // Apply correlation if enabled
    const finalLogRecord = this.config.enableCorrelation 
      ? this.correlator.enrichLogRecord(logRecord)
      : logRecord;

    // Console output
    if (this.config.consoleOutput) {
      this.logToConsole(finalLogRecord);
    }

    // Send to exporter
    if (this.exporter) {
      this.exporter.addLog(finalLogRecord);
    }

    // Browser local storage fallback
    if (typeof window !== 'undefined' && this.config.localStorageKey) {
      this.saveToLocalStorage(finalLogRecord);
    }
  }

  // Contextual logging
  withContext(attributes: Record<string, any>): Logger {
    const childLogger = new PepperLogger({
      serviceName: this.serviceName,
      loggingConfig: this.config,
      globalResource: this.globalResource,
      endpoint: this.exporter ? 'configured' : undefined
    });
    
    childLogger.contextAttributes = {
      ...this.contextAttributes,
      ...attributes
    };
    childLogger.correlator = this.correlator; // Share correlator
    childLogger.exporter = this.exporter; // Share exporter
    childLogger.timerManager = this.timerManager; // Share timer manager

    return childLogger;
  }

  // Performance logging
  logDuration(operation: string, duration: number, attributes: Record<string, any> = {}): void {
    this.info(`Operation completed: ${operation}`, {
      'operation.name': operation,
      'operation.duration_ms': duration,
      'performance.metric': true,
      ...attributes
    });
  }

  // Advanced methods
  logException(error: Error, message?: string, options?: {
    includeStackTrace?: boolean;
    includeSourceContext?: boolean;
    customAttributes?: Record<string, any>;
  }): void {
    const opts = {
      includeStackTrace: true,
      includeSourceContext: false,
      ...options
    };

    const attributes = {
      'exception.type': error.name,
      'exception.message': error.message,
      ...(opts.includeStackTrace && { 'exception.stacktrace': error.stack || '' }),
      ...(opts.customAttributes || {})
    };

    this.error(message || `Exception: ${error.message}`, error, attributes);
  }

  // Trace correlation methods
  setActiveTrace(traceId: string, spanId?: string): void {
    if (this.config.enableCorrelation) {
      this.correlator.setActiveTrace({ traceId, spanId });
    }
  }

  clearTraceContext(): void {
    if (this.config.enableCorrelation) {
      this.correlator.clearTraceContext();
    }
  }

  async withTraceContext<T>(traceId: string, spanId: string, fn: () => Promise<T> | T): Promise<T> {
    if (!this.config.enableCorrelation) {
      return Promise.resolve(fn());
    }

    return this.correlator.withTraceContext({ traceId, spanId }, fn);
  }

  // Timer methods for automatic timing/duration logging
  startTimer(operation: string, attributes: Record<string, any> = {}): Timer {
    return this.timerManager.startTimer(operation, {
      ...this.contextAttributes,
      ...attributes
    });
  }

  endTimer(timerId: string, attributes: Record<string, any> = {}): void {
    this.timerManager.endTimer(timerId, attributes);
  }

  async timeAsync<T>(operation: string, fn: () => Promise<T>, attributes: Record<string, any> = {}): Promise<T> {
    const timer = this.startTimer(operation, {
      ...attributes,
      'timing.type': 'async',
      'timing.pattern': 'function_wrapper'
    });

    try {
      const result = await fn();
      timer.end({
        'timing.status': 'success',
        'timing.result': typeof result === 'object' ? 'object' : typeof result
      });
      return result;
    } catch (error) {
      timer.end({
        'timing.status': 'error',
        'timing.error': error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  timeSync<T>(operation: string, fn: () => T, attributes: Record<string, any> = {}): T {
    const timer = this.startTimer(operation, {
      ...attributes,
      'timing.type': 'sync',
      'timing.pattern': 'function_wrapper'
    });

    try {
      const result = fn();
      timer.end({
        'timing.status': 'success',
        'timing.result': typeof result === 'object' ? 'object' : typeof result
      });
      return result;
    } catch (error) {
      timer.end({
        'timing.status': 'error',
        'timing.error': error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Timer utility methods
  getActiveTimers(): Timer[] {
    return this.timerManager.getActiveTimers();
  }

  cleanupTimers(): void {
    this.timerManager.cleanup();
  }

  // Utility methods
  private logToConsole(logRecord: LogRecord): void {
    const levelName = LogLevel[logRecord.level];
    const timestamp = new Date(logRecord.timestamp).toISOString();
    const correlationInfo = logRecord.traceId ? 
      ` [trace:${logRecord.traceId.substring(0, 8)}${logRecord.spanId ? `,span:${logRecord.spanId.substring(0, 8)}` : ''}]` : 
      '';

    const logMessage = `🌶️ ${timestamp} [${levelName}]${correlationInfo} ${logRecord.message}`;

    switch (logRecord.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, logRecord.attributes);
        break;
      case LogLevel.INFO:
        console.info(logMessage, logRecord.attributes);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, logRecord.attributes);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage, logRecord.attributes);
        break;
    }
  }

  private saveToLocalStorage(logRecord: LogRecord): void {
    if (!this.config.localStorageKey) return;

    try {
      const existingLogs = JSON.parse(
        localStorage.getItem(this.config.localStorageKey) || '[]'
      );
      
      existingLogs.push(logRecord);
      
      // Limit local storage size
      const maxLogs = this.config.maxLocalLogs || 1000;
      if (existingLogs.length > maxLogs) {
        existingLogs.splice(0, existingLogs.length - maxLogs);
      }
      
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('🌶️ Failed to save log to localStorage:', error);
    }
  }

  // Configuration and status
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getCorrelationInfo(): any {
    return this.correlator.getCorrelationInfo();
  }

  // Lifecycle methods
  async flush(): Promise<void> {
    if (this.exporter) {
      await this.exporter.forceFlush();
    }
  }

  shutdown(): void {
    // Cleanup active timers before shutdown
    this.timerManager.cleanup();
    
    if (this.exporter) {
      this.exporter.shutdown();
    }
    this.correlator.clearTraceContext();
  }
}