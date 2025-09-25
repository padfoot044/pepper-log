// Browser-only entry point for PepperLog
// This avoids loading any Node.js dependencies

import { PepperLogSimple } from './simple';
import { 
  PepperLogConfig, 
  PepperLogInstance, 
  DetectedFramework, 
  Framework 
} from './types';

/**
 * Browser-compatible PepperLog implementation
 * Uses simplified telemetry without Node.js dependencies
 */
export class PepperLog implements PepperLogInstance {
  private instance: PepperLogSimple;

  constructor(config: PepperLogConfig) {
    console.log('🌶️  PepperLog: Creating browser-only instance');
    this.instance = new PepperLogSimple(config);
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
    return this.instance.traceFunction(name, fn, attributes);
  }

  createCounter(name: string, description?: string) {
    return this.instance.createCounter(name, description);
  }

  createHistogram(name: string, description?: string) {
    return this.instance.createHistogram(name, description);
  }
}

// Factory function for browser
export function createPepperLog(config: PepperLogConfig): PepperLog {
  return new PepperLog(config);
}

// Export types
export * from './types';
export { BrowserFrameworkDetector } from './browser-detector';