// Trace-Log Correlation - Automatically correlates logs with active traces
import { LogRecord, LogLevel } from './types';

export interface TraceContext {
  traceId?: string;
  spanId?: string;
}

export class TraceLogCorrelator {
  private activeTrace: TraceContext | null = null;
  private contextStack: TraceContext[] = [];

  /**
   * Set the current active trace context
   */
  setActiveTrace(context: TraceContext): void {
    this.activeTrace = context;
    console.log('🌶️ Active trace context set:', context);
  }

  /**
   * Push a new trace context onto the stack (for nested spans)
   */
  pushTraceContext(context: TraceContext): void {
    if (this.activeTrace) {
      this.contextStack.push(this.activeTrace);
    }
    this.activeTrace = context;
    console.log('🌶️ Trace context pushed:', context);
  }

  /**
   * Pop the previous trace context from the stack
   */
  popTraceContext(): void {
    this.activeTrace = this.contextStack.pop() || null;
    console.log('🌶️ Trace context popped, current:', this.activeTrace);
  }

  /**
   * Clear all trace context
   */
  clearTraceContext(): void {
    this.activeTrace = null;
    this.contextStack = [];
    console.log('🌶️ Trace context cleared');
  }

  /**
   * Get the current trace context
   */
  getCurrentTraceContext(): TraceContext {
    return this.activeTrace || {};
  }

  /**
   * Enrich a log record with current trace context
   */
  enrichLogRecord(logRecord: LogRecord): LogRecord {
    const traceContext = this.getCurrentTraceContext();
    
    return {
      ...logRecord,
      traceId: logRecord.traceId || traceContext.traceId,
      spanId: logRecord.spanId || traceContext.spanId,
      attributes: {
        ...logRecord.attributes,
        // Add correlation metadata
        ...(traceContext.traceId && { 'trace.correlated': true })
      }
    };
  }

  /**
   * Create a correlated log record from basic parameters
   */
  createCorrelatedLogRecord(
    level: LogLevel,
    message: string,
    attributes: Record<string, any> = {},
    resource: Record<string, any> = {}
  ): LogRecord {
    const baseRecord: LogRecord = {
      timestamp: Date.now(),
      level,
      message,
      attributes,
      resource
    };

    return this.enrichLogRecord(baseRecord);
  }

  /**
   * Execute a function with a specific trace context
   */
  async withTraceContext<T>(
    context: TraceContext, 
    fn: () => Promise<T> | T
  ): Promise<T> {
    this.pushTraceContext(context);
    
    try {
      return await Promise.resolve(fn());
    } finally {
      this.popTraceContext();
    }
  }

  /**
   * Check if logs should be correlated with traces
   */
  hasActiveTrace(): boolean {
    return !!(this.activeTrace?.traceId || this.activeTrace?.spanId);
  }

  /**
   * Get correlation metadata for debugging
   */
  getCorrelationInfo(): {
    activeTrace: TraceContext | null;
    stackDepth: number;
    hasCorrelation: boolean;
  } {
    return {
      activeTrace: this.activeTrace,
      stackDepth: this.contextStack.length,
      hasCorrelation: this.hasActiveTrace()
    };
  }
}