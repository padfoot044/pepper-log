// Real browser OTLP implementation with actual network requests
// Zero Node.js dependencies, uses native browser APIs

export interface OTLPSpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: number; boolValue?: boolean } }>;
  status: { code: number; message?: string };
  events: Array<{
    timeUnixNano: string;
    name: string;
    attributes: Array<{ key: string; value: any }>;
  }>;
}

export interface OTLPTrace {
  resourceSpans: Array<{
    resource: {
      attributes: Array<{ key: string; value: { stringValue: string } }>;
    };
    scopeSpans: Array<{
      scope: {
        name: string;
        version: string;
      };
      spans: OTLPSpanData[];
    }>;
  }>;
}

export class BrowserOTLPExporter {
  private endpoint: string;
  private headers: Record<string, string>;
  private pendingSpans: OTLPSpanData[] = [];
  private batchTimeout: number = 5000;
  private maxBatchSize: number = 100;
  private batchTimer: NodeJS.Timeout | null = null;
  private serviceName: string;

  constructor(config: {
    endpoint: string;
    serviceName: string;
    headers?: Record<string, string>;
    batchTimeout?: number;
    maxBatchSize?: number;
  }) {
    this.endpoint = config.endpoint;
    this.serviceName = config.serviceName;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    this.batchTimeout = config.batchTimeout || 5000;
    this.maxBatchSize = config.maxBatchSize || 100;

    console.log('🌶️ BrowserOTLPExporter initialized:', {
      endpoint: this.endpoint,
      serviceName: this.serviceName,
      batchTimeout: this.batchTimeout,
      maxBatchSize: this.maxBatchSize
    });
  }

  addSpan(span: OTLPSpanData): void {
    this.pendingSpans.push(span);
    console.log(`🌶️ Added span to batch (${this.pendingSpans.length}/${this.maxBatchSize}):`, span.name);

    if (this.pendingSpans.length >= this.maxBatchSize) {
      this.flushSpans();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushSpans();
      }, this.batchTimeout);
    }
  }

  private async flushSpans(): Promise<void> {
    if (this.pendingSpans.length === 0) return;

    const spans = [...this.pendingSpans];
    this.pendingSpans = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const otlpTrace: OTLPTrace = {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } },
            { key: 'service.version', value: { stringValue: '1.0.0' } }
          ]
        },
        scopeSpans: [{
          scope: {
            name: '@padfoot044/pepper-log',
            version: '1.0.0'
          },
          spans
        }]
      }]
    };

    try {
      console.log(`🌶️ Sending ${spans.length} spans to OTLP endpoint:`, this.endpoint);
      console.log('🌶️ OTLP Payload:', JSON.stringify(otlpTrace, null, 2));

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(otlpTrace),
        mode: 'cors'
      });

      if (response.ok) {
        console.log(`🌶️ Successfully sent ${spans.length} spans to OTLP endpoint`);
      } else {
        console.error('🌶️ Failed to send spans:', {
          status: response.status,
          statusText: response.statusText,
          endpoint: this.endpoint,
          spanCount: spans.length
        });
        
        const responseText = await response.text().catch(() => 'Unable to read response');
        console.error('🌶️ Response body:', responseText);
      }
    } catch (error) {
      console.error('🌶️ Network error sending spans:', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: this.endpoint,
        spanCount: spans.length
      });
    }
  }

  async forceFlush(): Promise<void> {
    await this.flushSpans();
  }

  shutdown(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushSpans();
  }
}

export function generateTraceId(): string {
  // Generate a 32-character hex string (128 bits)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSpanId(): string {
  // Generate a 16-character hex string (64 bits)
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function toUnixNano(timestamp: number = Date.now()): string {
  // Convert milliseconds to nanoseconds
  return (timestamp * 1_000_000).toString();
}

export function convertAttributes(attrs: Record<string, any>): Array<{ key: string; value: any }> {
  return Object.entries(attrs).map(([key, value]) => ({
    key,
    value: typeof value === 'string' 
      ? { stringValue: value }
      : typeof value === 'number'
        ? Number.isInteger(value) 
          ? { intValue: value }
          : { doubleValue: value }
        : typeof value === 'boolean'
          ? { boolValue: value }
          : { stringValue: String(value) }
  }));
}