import { BackendConfig } from '../types';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
// Note: Using legacy OTLP exporter for compatibility, update as needed
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';

export interface BackendProvider {
  name: string;
  createExporter(config: BackendConfig): any;
  getDefaultConfig(): Partial<BackendConfig>;
}

export class SignozBackend implements BackendProvider {
  name = 'signoz';

  createExporter(config: BackendConfig) {
    return new OTLPTraceExporter({
      url: config.endpoint || 'http://localhost:4318/v1/traces',
      headers: {
        ...config.headers,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'http://localhost:4318/v1/traces',
      batchConfig: {
        maxExportBatchSize: 512,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 1000
      }
    };
  }
}

export class DatadogBackend implements BackendProvider {
  name = 'datadog';

  createExporter(config: BackendConfig) {
    if (!config.apiKey) {
      throw new Error('Datadog backend requires an API key');
    }

    return new OTLPTraceExporter({
      url: config.endpoint || 'https://trace.agent.datadoghq.com/v0.4/traces',
      headers: {
        'DD-API-KEY': config.apiKey,
        ...config.headers
      }
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'https://trace.agent.datadoghq.com/v0.4/traces',
      batchConfig: {
        maxExportBatchSize: 100,
        exportTimeoutMillis: 10000,
        scheduledDelayMillis: 500
      }
    };
  }
}

export class JaegerBackend implements BackendProvider {
  name = 'jaeger';

  createExporter(config: BackendConfig) {
    return new JaegerExporter({
      endpoint: config.endpoint || 'http://localhost:14268/api/traces',
      ...config.exporterConfig
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'http://localhost:14268/api/traces',
      batchConfig: {
        maxExportBatchSize: 512,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 2000
      }
    };
  }
}

export class NewRelicBackend implements BackendProvider {
  name = 'newrelic';

  createExporter(config: BackendConfig) {
    if (!config.apiKey) {
      throw new Error('New Relic backend requires an API key (license key)');
    }

    return new OTLPTraceExporter({
      url: config.endpoint || 'https://otlp.nr-data.net/v1/traces',
      headers: {
        'Api-Key': config.apiKey,
        ...config.headers
      }
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'https://otlp.nr-data.net/v1/traces',
      batchConfig: {
        maxExportBatchSize: 256,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 1000
      }
    };
  }
}

export class GrafanaBackend implements BackendProvider {
  name = 'grafana';

  createExporter(config: BackendConfig) {
    return new OTLPTraceExporter({
      url: config.endpoint || 'https://tempo.grafana.net:443/v1/traces',
      headers: {
        ...config.headers,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'https://tempo.grafana.net:443/v1/traces',
      batchConfig: {
        maxExportBatchSize: 512,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 1000
      }
    };
  }
}

export class AzureBackend implements BackendProvider {
  name = 'azure';

  createExporter(config: BackendConfig) {
    return new OTLPTraceExporter({
      url: config.endpoint || 'https://your-app.applicationinsights.azure.com/v2.1/traces',
      headers: {
        ...config.headers,
        ...(config.apiKey && { 'InstrumentationKey': config.apiKey })
      }
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'https://your-app.applicationinsights.azure.com/v2.1/traces',
      batchConfig: {
        maxExportBatchSize: 256,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 1000
      }
    };
  }
}

export class AwsXRayBackend implements BackendProvider {
  name = 'aws-xray';

  createExporter(config: BackendConfig) {
    // For AWS X-Ray, you would typically use the AWS X-Ray SDK
    // This is a simplified OTLP version
    return new OTLPTraceExporter({
      url: config.endpoint || 'https://xray.us-east-1.amazonaws.com/traces',
      headers: {
        ...config.headers
      }
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      endpoint: 'https://xray.us-east-1.amazonaws.com/traces',
      batchConfig: {
        maxExportBatchSize: 50,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 1000
      }
    };
  }
}

export class CustomBackend implements BackendProvider {
  name = 'custom';

  createExporter(config: BackendConfig) {
    if (!config.endpoint) {
      throw new Error('Custom backend requires an endpoint URL');
    }

    return new OTLPTraceExporter({
      url: config.endpoint,
      headers: config.headers || {}
    });
  }

  getDefaultConfig(): Partial<BackendConfig> {
    return {
      batchConfig: {
        maxExportBatchSize: 512,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 1000
      }
    };
  }
}

export class BackendFactory {
  private static backends: Map<string, BackendProvider> = new Map();

  static {
    BackendFactory.backends.set('signoz', new SignozBackend());
    BackendFactory.backends.set('datadog', new DatadogBackend());
    BackendFactory.backends.set('jaeger', new JaegerBackend());
    BackendFactory.backends.set('newrelic', new NewRelicBackend());
    BackendFactory.backends.set('grafana', new GrafanaBackend());
    BackendFactory.backends.set('azure', new AzureBackend());
    BackendFactory.backends.set('aws-xray', new AwsXRayBackend());
    BackendFactory.backends.set('custom', new CustomBackend());
  }

  public static getBackend(name: string): BackendProvider {
    const backend = this.backends.get(name);
    if (!backend) {
      throw new Error(`Unsupported backend: ${name}. Supported backends: ${Array.from(this.backends.keys()).join(', ')}`);
    }
    return backend;
  }

  public static getSupportedBackends(): string[] {
    return Array.from(this.backends.keys());
  }
}