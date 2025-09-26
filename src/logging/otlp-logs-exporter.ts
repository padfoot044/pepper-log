// OTLP Logs Exporter - Sends logs via HTTP to OpenTelemetry-compatible backends
import { LogRecord, LogBatchConfig, OTLPLogsPayload, OTLPLogRecord, LogLevel } from './types';

export class OTLPLogsExporter {
  private endpoint: string;
  private headers: Record<string, string>;
  private pendingLogs: LogRecord[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private batchConfig: LogBatchConfig;
  private serviceName: string;
  private serviceVersion: string;
  private retryQueue: LogRecord[] = [];

  constructor(config: {
    endpoint: string;
    serviceName: string;
    serviceVersion?: string;
    headers?: Record<string, string>;
    batchConfig?: Partial<LogBatchConfig>;
  }) {
    this.endpoint = config.endpoint;
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion || '1.0.0';
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    
    this.batchConfig = {
      maxBatchSize: 1000,
      batchTimeout: 5000,
      maxQueueSize: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config.batchConfig
    };

    console.log('🌶️ OTLPLogsExporter initialized:', {
      endpoint: this.endpoint,
      serviceName: this.serviceName,
      batchConfig: this.batchConfig
    });
  }

  addLog(logRecord: LogRecord): void {
    // Check queue size limit
    if (this.pendingLogs.length >= this.batchConfig.maxQueueSize) {
      console.warn('🌶️ Log queue full, dropping oldest logs');
      this.pendingLogs.shift(); // Remove oldest log
    }

    this.pendingLogs.push(logRecord);
    console.log(`🌶️ Added log to batch (${this.pendingLogs.length}/${this.batchConfig.maxBatchSize}):`, {
      level: LogLevel[logRecord.level],
      message: logRecord.message.substring(0, 100) + (logRecord.message.length > 100 ? '...' : ''),
      traceId: logRecord.traceId,
      spanId: logRecord.spanId
    });

    // Send immediately if batch is full
    if (this.pendingLogs.length >= this.batchConfig.maxBatchSize) {
      this.flush();
    } else if (!this.batchTimer) {
      // Schedule batch send
      this.batchTimer = setTimeout(() => {
        this.flush();
      }, this.batchConfig.batchTimeout);

      // Ensure this timer won't keep the Node.js event loop alive in tests
      try {
        // Some timer implementations (Node) expose unref()
        if (typeof (this.batchTimer as any)?.unref === 'function') {
          (this.batchTimer as any).unref();
        }
      } catch (_err) {
        // ignore - unref is best-effort
      }
    }
  }

  async flush(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      console.log(`🌶️ Sending ${logsToSend.length} logs to OTLP endpoint:`, this.endpoint);
      await this.sendLogs(logsToSend);
      console.log(`🌶️ Successfully sent ${logsToSend.length} logs to OTLP endpoint`);
      
      // Process any queued retries
      if (this.retryQueue.length > 0) {
        const retryLogs = [...this.retryQueue];
        this.retryQueue = [];
        await this.sendLogs(retryLogs);
      }
      
    } catch (error) {
      console.error('🌶️ Failed to send logs:', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: this.endpoint,
        logCount: logsToSend.length
      });
      
      // Add to retry queue if we have retry attempts left
      if (this.retryQueue.length < this.batchConfig.maxQueueSize) {
        this.retryQueue.push(...logsToSend);
        const retryTimer = setTimeout(() => this.retryFailedLogs(), this.batchConfig.retryDelay);
        try {
          if (typeof (retryTimer as any)?.unref === 'function') {
            (retryTimer as any).unref();
          }
        } catch (_err) {
          // ignore - unref is best-effort
        }
      }
    }
  }

  private async retryFailedLogs(): Promise<void> {
    if (this.retryQueue.length === 0) return;
    
    const logsToRetry = [...this.retryQueue];
    this.retryQueue = [];
    
    try {
      console.log(`🌶️ Retrying ${logsToRetry.length} failed logs...`);
      await this.sendLogs(logsToRetry);
      console.log(`🌶️ Successfully retried ${logsToRetry.length} logs`);
    } catch (error) {
      console.error('🌶️ Retry failed, logs will be dropped:', error);
    }
  }

  private async sendLogs(logs: LogRecord[]): Promise<void> {
    const payload = this.formatOTLPLogs(logs);
    
    console.log('🌶️ OTLP Logs Payload Sample:', {
      resourceLogs: payload.resourceLogs.length,
      totalLogs: payload.resourceLogs[0]?.scopeLogs[0]?.logRecords.length,
      sampleLog: payload.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]
    });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
      mode: 'cors'
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'Unable to read response');
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${responseText}`);
    }
  }

  private formatOTLPLogs(logs: LogRecord[]): OTLPLogsPayload {
    return {
      resourceLogs: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } },
            { key: 'service.version', value: { stringValue: this.serviceVersion } },
            { key: 'telemetry.sdk.name', value: { stringValue: '@padfoot044/pepper-log' } },
            { key: 'telemetry.sdk.version', value: { stringValue: '2.0.0' } }
          ]
        },
        scopeLogs: [{
          scope: {
            name: '@padfoot044/pepper-log',
            version: '2.0.0'
          },
          logRecords: logs.map(log => this.formatLogRecord(log))
        }]
      }]
    };
  }

  private formatLogRecord(log: LogRecord): OTLPLogRecord {
    return {
      timeUnixNano: String(log.timestamp * 1000000), // Convert milliseconds to nanoseconds
      severityNumber: log.level,
      severityText: LogLevel[log.level],
      body: { stringValue: log.message },
      attributes: this.convertAttributes(log.attributes),
      ...(log.traceId && { traceId: log.traceId }),
      ...(log.spanId && { spanId: log.spanId })
    };
  }

  private convertAttributes(attrs: Record<string, any>): Array<{ key: string; value: any }> {
    return Object.entries(attrs).map(([key, value]) => ({
      key,
      value: this.convertAttributeValue(value)
    }));
  }

  private convertAttributeValue(value: any): any {
    if (typeof value === 'string') {
      return { stringValue: value };
    } else if (typeof value === 'number') {
      return Number.isInteger(value) 
        ? { intValue: value }
        : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      return { boolValue: value };
    } else {
      return { stringValue: String(value) };
    }
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  shutdown(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Send remaining logs synchronously if possible
    if (this.pendingLogs.length > 0) {
      this.flush().catch(console.error);
    }
  }
}