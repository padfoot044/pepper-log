// CORS-friendly browser implementation with multiple fallback strategies
// Handles CORS issues gracefully while still providing telemetry

import { BrowserOTLPExporter, OTLPSpanData, generateTraceId, generateSpanId, toUnixNano, convertAttributes } from './browser-otlp';

export interface CORSConfig {
  // Fallback strategies when CORS fails
  fallbackToConsole?: boolean;      // Log to console if network fails
  fallbackToLocalStorage?: boolean; // Store traces in localStorage
  fallbackToBeacon?: boolean;       // Use navigator.sendBeacon API
  corsMode?: 'cors' | 'no-cors' | 'same-origin';
  retryAttempts?: number;
  retryDelay?: number;
}

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
    corsConfig?: CORSConfig;
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

export class CORSFriendlyOTLPExporter {
  private endpoint: string;
  private headers: Record<string, string>;
  private pendingSpans: OTLPSpanData[] = [];
  private batchTimeout: number = 5000;
  private maxBatchSize: number = 100;
  private batchTimer: NodeJS.Timeout | null = null;
  private serviceName: string;
  private corsConfig: CORSConfig;
  private corsFailureCount: number = 0;

  constructor(config: {
    endpoint: string;
    serviceName: string;
    headers?: Record<string, string>;
    batchTimeout?: number;
    maxBatchSize?: number;
    corsConfig?: CORSConfig;
  }) {
    this.endpoint = config.endpoint;
    this.serviceName = config.serviceName;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    this.batchTimeout = config.batchTimeout || 5000;
    this.maxBatchSize = config.maxBatchSize || 100;
    this.corsConfig = {
      fallbackToConsole: true,
      fallbackToLocalStorage: true,
      fallbackToBeacon: false,
      corsMode: 'cors',
      retryAttempts: 2,
      retryDelay: 1000,
      ...config.corsConfig
    };

    console.log('🌶️ CORS-Friendly OTLP Exporter initialized:', {
      endpoint: this.endpoint,
      serviceName: this.serviceName,
      corsConfig: this.corsConfig
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

    const otlpTrace = this.createOTLPPayload(spans);

    // Try multiple strategies to send the data
    const success = await this.tryMultipleSendStrategies(otlpTrace, spans.length);
    
    if (!success && this.corsConfig.fallbackToConsole) {
      console.warn('🌶️ All network attempts failed, falling back to console logging');
      this.logSpansToConsole(spans);
    }
  }

  private async tryMultipleSendStrategies(payload: any, spanCount: number): Promise<boolean> {
    const strategies = [
      () => this.tryFetchWithCORS(payload, spanCount),
      () => this.tryFetchNoCORS(payload, spanCount),
      () => this.tryBeaconAPI(payload, spanCount),
      () => this.tryLocalStorageFallback(payload, spanCount)
    ];

    for (const strategy of strategies) {
      try {
        const success = await strategy();
        if (success) return true;
      } catch (error) {
        console.debug('🌶️ Strategy failed, trying next...', error);
      }
    }

    return false;
  }

  private async tryFetchWithCORS(payload: any, spanCount: number): Promise<boolean> {
    try {
      console.log(`🌶️ Attempting CORS request to: ${this.endpoint}`);
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        mode: 'cors'
      });

      if (response.ok) {
        console.log(`🌶️ Successfully sent ${spanCount} spans via CORS`);
        this.corsFailureCount = 0; // Reset failure count on success
        return true;
      } else {
        console.error('🌶️ CORS request failed with status:', response.status);
        return false;
      }
    } catch (error) {
      this.corsFailureCount++;
      console.error('🌶️ CORS request failed:', (error as Error).message);
      return false;
    }
  }

  private async tryFetchNoCORS(payload: any, spanCount: number): Promise<boolean> {
    if (!this.corsConfig.corsMode || this.corsConfig.corsMode === 'cors') {
      try {
        console.log(`🌶️ Attempting no-CORS request to: ${this.endpoint}`);
        
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // Simplified headers for no-CORS
          body: JSON.stringify(payload),
          mode: 'no-cors'
        });

        // no-cors mode doesn't allow reading response status
        console.log(`🌶️ Sent ${spanCount} spans via no-CORS (status unknown)`);
        return true;
      } catch (error) {
        console.error('🌶️ No-CORS request failed:', (error as Error).message);
        return false;
      }
    }
    return false;
  }

  private async tryBeaconAPI(payload: any, spanCount: number): Promise<boolean> {
    if (!this.corsConfig.fallbackToBeacon || !navigator.sendBeacon) {
      return false;
    }

    try {
      console.log(`🌶️ Attempting Beacon API to: ${this.endpoint}`);
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const success = navigator.sendBeacon(this.endpoint, blob);
      
      if (success) {
        console.log(`🌶️ Sent ${spanCount} spans via Beacon API`);
        return true;
      } else {
        console.error('🌶️ Beacon API failed');
        return false;
      }
    } catch (error) {
      console.error('🌶️ Beacon API error:', (error as Error).message);
      return false;
    }
  }

  private async tryLocalStorageFallback(payload: any, spanCount: number): Promise<boolean> {
    if (!this.corsConfig.fallbackToLocalStorage) {
      return false;
    }

    try {
      const key = `pepperlog_traces_${Date.now()}`;
      const traceData = {
        timestamp: new Date().toISOString(),
        endpoint: this.endpoint,
        spanCount,
        payload
      };
      
      localStorage.setItem(key, JSON.stringify(traceData));
      console.log(`🌶️ Stored ${spanCount} spans in localStorage with key: ${key}`);
      
      // Clean up old entries (keep last 50)
      this.cleanupLocalStorage();
      
      return true;
    } catch (error) {
      console.error('🌶️ localStorage fallback failed:', (error as Error).message);
      return false;
    }
  }

  private logSpansToConsole(spans: OTLPSpanData[]): void {
    console.group(`🌶️ Fallback: Console logging ${spans.length} spans`);
    spans.forEach(span => {
      console.log(`📊 Span: ${span.name}`, {
        traceId: span.traceId,
        spanId: span.spanId,
        duration: `${(parseInt(span.endTimeUnixNano) - parseInt(span.startTimeUnixNano)) / 1_000_000}ms`,
        attributes: span.attributes,
        status: span.status
      });
    });
    console.groupEnd();
  }

  private cleanupLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('pepperlog_traces_'));
      if (keys.length > 50) {
        // Sort by timestamp and remove oldest
        keys.sort().slice(0, keys.length - 50).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.warn('🌶️ Failed to cleanup localStorage:', (error as Error).message);
    }
  }

  private createOTLPPayload(spans: OTLPSpanData[]) {
    return {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } },
            { key: 'service.version', value: { stringValue: '1.0.2' } }
          ]
        },
        scopeSpans: [{
          scope: {
            name: '@padfoot044/pepper-log',
            version: '1.0.2'
          },
          spans
        }]
      }]
    };
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

  // Utility method to retrieve stored traces from localStorage
  getStoredTraces(): Array<{ key: string; data: any }> {
    const traces = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pepperlog_traces_')) {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          traces.push({ key, data });
        }
      }
    } catch (error) {
      console.error('🌶️ Failed to retrieve stored traces:', (error as Error).message);
    }
    return traces.sort((a, b) => a.data.timestamp.localeCompare(b.data.timestamp));
  }
}