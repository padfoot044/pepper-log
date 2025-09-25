import { Injectable } from '@angular/core';
import { PepperLog } from 'pepper-log';

@Injectable({
  providedIn: 'root'
})
export class GrafanaTelemetryService {
  private pepperLog: PepperLog;
  private initialized = false;

  constructor() {
    console.log('🔧 Initializing GrafanaTelemetryService...');
    
    try {
      this.pepperLog = new PepperLog({
        serviceName: 'angular-grafana-app',
        backend: 'grafana',
        config: {
          endpoint: 'http://localhost:4318/v1/traces',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        globalAttributes: {
          'app.framework': 'angular',
          'telemetry.backend': 'grafana',
          'service.version': '1.0.0',
          'deployment.environment': 'development',
          'runtime': 'browser'
        },
        features: {
          tracing: true,
          metrics: true,
          logging: true,
          autoInstrumentation: false
        }
      });
      
      console.log('✅ PepperLog instance created successfully');
    } catch (error) {
      console.error('❌ Error creating PepperLog:', error);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing Grafana telemetry...');
      await this.pepperLog.initialize();
      this.initialized = true;
      console.log('✅ Grafana telemetry initialized successfully');
      
    } catch (error) {
      console.error('❌ Grafana telemetry initialization failed:', error);
      // Continue without breaking the app
    }
  }

  // Safe wrapper for traceFunction with error handling
  async traceFunction<T>(name: string, fn: () => Promise<T> | T, attributes?: any): Promise<T> {
    try {
      if (this.pepperLog && this.pepperLog.traceFunction) {
        return await this.pepperLog.traceFunction(name, fn, attributes);
      } else {
        console.log(`🌶️ Executing ${name} (no tracing available)`);
        return await Promise.resolve(fn());
      }
    } catch (error) {
      console.error(`❌ Error in traced function ${name}:`, error);
      return await Promise.resolve(fn());
    }
  }

  // Trace user interactions
  async traceUserAction(action: string, data?: any) {
    return this.traceFunction(`user-action-${action}`, async () => {
      console.log(`👤 User action: ${action}`, data);
      
      const traceData = {
        action,
        data: data || {},
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      console.log('🌶️ User action traced:', traceData);
      return traceData;
    });
  }

  // Create custom metrics (browser-compatible)
  recordMetric(name: string, value: number, attributes?: any) {
    try {
      console.log(`📈 Metric recorded: ${name} = ${value}`, attributes);
      
      if (this.pepperLog && this.pepperLog.createCounter) {
        const counter = this.pepperLog.createCounter(name, `Custom metric: ${name}`);
        if (counter && counter.add) {
          counter.add(value, attributes);
        }
      }

      const metricData = {
        name,
        value,
        attributes: attributes || {},
        timestamp: Date.now(),
        service: 'angular-grafana-app'
      };

      console.log('🌶️ Metric data:', metricData);
      
    } catch (error) {
      console.error('❌ Error recording metric:', error);
    }
  }

  // Trace Angular component lifecycle
  traceComponentLifecycle(component: string, lifecycle: string) {
    try {
      const spanName = `component-${lifecycle}`;
      const attributes = {
        'component.name': component,
        'component.lifecycle': lifecycle,
        'framework': 'angular',
        'timestamp': Date.now()
      };

      console.log(`🅰️ Component ${component} - ${lifecycle}`);

      if (this.pepperLog && this.pepperLog.createSpan) {
        return this.pepperLog.createSpan(spanName, attributes);
      } else {
        console.log('🌶️ Component lifecycle:', { spanName, attributes });
        return {
          end: () => console.log(`🌶️ Component span ended: ${spanName}`)
        };
      }
    } catch (error) {
      console.error('❌ Error tracing component lifecycle:', error);
      return { end: () => {} };
    }
  }

  // Trace HTTP requests
  async traceHttpRequest(method: string, url: string, duration: number, status: number) {
    return this.traceFunction(`http-${method.toLowerCase()}`, async () => {
      const requestData = {
        method,
        url,
        status,
        duration,
        success: status >= 200 && status < 300,
        timestamp: new Date().toISOString()
      };

      console.log(`🌐 HTTP ${method} ${url} - ${status} (${duration}ms)`, requestData);
      
      return requestData;
    });
  }

  // Error tracking with browser context
  async traceError(error: Error | string, context?: string) {
    return this.traceFunction('error-occurred', async () => {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      const errorData = {
        message: errorMessage,
        stack: errorStack || 'No stack trace available',
        context: context || 'unknown',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      console.error('🚨 Error traced:', errorData);
      
      return errorData;
    });
  }

  // Performance monitoring
  async tracePerformance(metricName: string, value: number, unit: string = 'ms') {
    try {
      const histogram = this.createHistogram(`performance.${metricName}`, `Performance metric: ${metricName} (${unit})`);
      if (histogram) {
        histogram.record(value, {
          'metric.name': metricName,
          'metric.unit': unit,
          'metric.type': 'performance',
          'timestamp': Date.now()
        });
      }

      console.log(`⚡ Performance - ${metricName}: ${value}${unit}`);
      
      return { metric: metricName, value, unit };
    } catch (error) {
      console.error('❌ Error recording performance metric:', error);
    }
  }

  // Utility methods
  createSpan(name: string, attributes?: any) {
    try {
      return this.pepperLog?.createSpan?.(name, attributes);
    } catch (error) {
      console.error('❌ Error creating span:', error);
      return null;
    }
  }

  createCounter(name: string, description?: string) {
    try {
      return this.pepperLog?.createCounter?.(name, description);
    } catch (error) {
      console.error('❌ Error creating counter:', error);
      return null;
    }
  }

  createHistogram(name: string, description?: string) {
    try {
      return this.pepperLog?.createHistogram?.(name, description);
    } catch (error) {
      console.error('❌ Error creating histogram:', error);
      return null;
    }
  }

  // Status methods
  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig() {
    try {
      return this.pepperLog?.getConfig?.() || null;
    } catch (error) {
      console.error('❌ Error getting config:', error);
      return null;
    }
  }

  getDetectedFramework() {
    try {
      return this.pepperLog?.getDetectedFramework?.() || null;
    } catch (error) {
      console.error('❌ Error getting framework:', error);
      return null;
    }
  }
}