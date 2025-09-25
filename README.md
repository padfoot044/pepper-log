# 🌶️ PepperLog

Universal OpenTelemetry integration for JavaScript/TypeScript frameworks with auto-detection and multiple backend support. Works seamlessly in both browser and Node.js environments.

[![npm version](https://badge.fury.io/js/pepper-log.svg)](https://badge.fury.io/js/pepper-log)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Universal Compatibility**: Works in both browser and Node.js environments
- 🎯 **Auto-Detection**: Automatically detects frameworks (Angular, React, Vue, Next.js, Express, etc.)
- 🔌 **Multiple Backends**: SigNoz, Grafana, Datadog, Jaeger, New Relic, and more
- 🌐 **Zero Browser Conflicts**: Standalone browser version with no Node.js dependencies
- � **Complete Telemetry**: Tracing, metrics, and logging in one package
- �️ **Error-Safe**: Graceful degradation - your app continues even if telemetry fails
- 📝 **TypeScript Support**: Full TypeScript definitions included

## 🚀 Quick Start

### Installation

```bash
npm install pepper-log
```

### Basic Usage

```typescript
import { PepperLog } from 'pepper-log';

const telemetry = new PepperLog({
  serviceName: 'my-awesome-app',
  backend: 'grafana', // or 'signoz', 'datadog', etc.
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

await telemetry.initialize();

// Trace a function
await telemetry.traceFunction('user-action', async () => {
  console.log('Doing some work...');
  return 'success';
});
```

## 🎯 Framework Integration

### Angular

```typescript
import { Injectable } from '@angular/core';
import { PepperLog } from 'pepper-log';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private pepperLog = new PepperLog({
    serviceName: 'angular-app',
    backend: 'grafana'
  });

  async initialize() {
    await this.pepperLog.initialize();
  }

  async traceUserAction(action: string, data?: any) {
    return this.pepperLog.traceFunction(`user-${action}`, async () => {
      // Your business logic
      return { action, data, timestamp: Date.now() };
    });
  }
}
```

### React

```typescript
import React, { useEffect } from 'react';
import { PepperLog } from 'pepper-log';

const telemetry = new PepperLog({
  serviceName: 'react-app',
  backend: 'signoz'
});

function App() {
  useEffect(() => {
    telemetry.initialize();
  }, []);

  const handleClick = async () => {
    await telemetry.traceFunction('button-click', async () => {
      console.log('Button clicked!');
    });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Installation

```bash
npm install pepper-log
# or
yarn add pepper-log
# or
pnpm add pepper-log
```

### Basic Usage

```typescript
import { PepperLog } from 'pepper-log';

// Initialize with minimal configuration
const logger = new PepperLog({
  serviceName: 'my-awesome-app',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

// Auto-detects framework and initializes everything
await logger.initialize();

// That's it! Your app is now instrumented 🎉
```

### Environment Variables (Alternative)

You can also configure PepperLog using environment variables:

```bash
PEPPER_LOG_SERVICE_NAME=my-app
PEPPER_LOG_BACKEND=signoz
PEPPER_LOG_ENDPOINT=http://localhost:4318/v1/traces
```

```typescript
import { PepperLog } from 'pepper-log';

// Uses environment variables
const logger = new PepperLog({
  serviceName: process.env.PEPPER_LOG_SERVICE_NAME!,
  backend: process.env.PEPPER_LOG_BACKEND as any,
  config: {
    endpoint: process.env.PEPPER_LOG_ENDPOINT
  }
});

await logger.initialize();
```

## 🎯 Supported Frameworks

PepperLog automatically detects and provides optimized instrumentation for:

| Framework | Auto-Detection | Custom Instrumentation |
|-----------|---------------|------------------------|
| **React** | ✅ | Component lifecycle, route changes |
| **Angular** | ✅ | HTTP interceptors, route events |
| **Vue.js** | ✅ | Component lifecycle, Vue Router |
| **Next.js** | ✅ | Page transitions, API routes, SSR |
| **Express** | ✅ | Middleware, route handlers |
| **Fastify** | ✅ | Hooks, request lifecycle |
| **Koa** | ✅ | Middleware, context |

## 🔌 Supported Backends

### SigNoz (Recommended for self-hosting)
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});
```

### Datadog
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'datadog',
  config: {
    apiKey: process.env.DATADOG_API_KEY,
    endpoint: 'https://trace.agent.datadoghq.com/v0.4/traces'
  }
});
```

### Jaeger
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'jaeger',
  config: {
    endpoint: 'http://localhost:14268/api/traces'
  }
});
```

### New Relic
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'newrelic',
  config: {
    apiKey: process.env.NEW_RELIC_LICENSE_KEY,
    endpoint: 'https://otlp.nr-data.net/v1/traces'
  }
});
```

### Grafana Cloud
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'grafana',
  config: {
    apiKey: process.env.GRAFANA_CLOUD_API_KEY,
    endpoint: 'https://tempo.grafana.net:443/v1/traces'
  }
});
```

### Custom Backend
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'custom',
  config: {
    endpoint: 'https://your-custom-otlp-endpoint.com/v1/traces',
    headers: {
      'Authorization': 'Bearer your-token'
    }
  }
});
```

## 📖 Advanced Usage

### Manual Instrumentation

```typescript
// Create custom spans
const span = logger.createSpan('user.login', {
  attributes: {
    'user.id': '12345',
    'user.email': 'user@example.com'
  }
});

// Add attributes to current span
logger.addAttributes({
  'custom.attribute': 'value',
  'request.id': requestId
});

span.end();
```

### Function Tracing

```typescript
// Automatically trace any function
const result = await logger.traceFunction(
  'database.query',
  async () => {
    return await db.query('SELECT * FROM users');
  },
  {
    'db.operation': 'select',
    'db.table': 'users'
  }
);
```

### Custom Metrics

```typescript
// Create counters
const requestCounter = logger.createCounter(
  'http.requests.total',
  'Total number of HTTP requests'
);

// Create histograms
const responseTime = logger.createHistogram(
  'http.request.duration',
  'HTTP request duration in milliseconds'
);

// Use metrics
requestCounter.add(1, { method: 'GET', route: '/api/users' });
responseTime.record(150, { method: 'POST', route: '/api/auth' });
```

### Framework-Specific Features

#### React
```typescript
// Automatically instruments:
// - Component render cycles
// - React Router navigation
// - State changes (with React DevTools)

const logger = new PepperLog({
  serviceName: 'my-react-app',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' }
});
```

#### Angular
```typescript
// Automatically instruments:
// - HTTP client requests
// - Router events
// - Component lifecycle

const logger = new PepperLog({
  serviceName: 'my-angular-app',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' }
});
```

#### Express
```typescript
// Automatically instruments:
// - All middleware
// - Route handlers
// - Database queries
// - HTTP client requests

const logger = new PepperLog({
  serviceName: 'my-express-api',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' }
});
```

## ⚙️ Configuration Options

```typescript
interface PepperLogConfig {
  /** Service name for tracing */
  serviceName: string;
  
  /** Backend service provider */
  backend: 'signoz' | 'datadog' | 'jaeger' | 'newrelic' | 'grafana' | 'azure' | 'aws-xray' | 'custom';
  
  /** Backend-specific configuration */
  config: {
    endpoint?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    batchConfig?: {
      maxExportBatchSize?: number;
      exportTimeoutMillis?: number;
      scheduledDelayMillis?: number;
    };
  };
  
  /** Optional framework override (auto-detected if not provided) */
  framework?: 'react' | 'angular' | 'vue' | 'express' | 'nextjs' | 'fastify' | 'koa' | 'auto';
  
  /** Enable/disable specific features */
  features?: {
    tracing?: boolean;        // Default: true
    metrics?: boolean;        // Default: true
    logging?: boolean;        // Default: true
    autoInstrumentation?: boolean; // Default: true
  };
  
  /** Environment (auto-detected if not provided) */
  environment?: string;
  
  /** Custom attributes added to all traces */
  globalAttributes?: Record<string, string | number | boolean>;
}
```

## 🔍 Auto-Detection

PepperLog uses multiple strategies to auto-detect your framework:

1. **Package.json Analysis**: Scans dependencies for framework packages
2. **Runtime Detection**: Checks for framework-specific global objects
3. **File Structure**: Looks for framework-specific config files and folders
4. **Environment Variables**: Checks for framework-specific environment variables

### Detection Priority

1. **Next.js** (highest priority - extends React)
2. **Angular** 
3. **React**
4. **Vue.js**
5. **Express/Fastify/Koa** (Node.js frameworks)

## 📊 What Gets Instrumented

### Automatic Instrumentation

- ✅ **HTTP Requests**: Incoming and outgoing HTTP calls
- ✅ **Database Queries**: PostgreSQL, MySQL, MongoDB, Redis
- ✅ **File System**: File read/write operations (configurable)
- ✅ **DNS Lookups**: DNS resolution timing
- ✅ **Process Metrics**: CPU, memory usage

### Framework-Specific

#### React
- Component render cycles
- Route changes (React Router)
- State management operations
- Error boundaries

#### Angular
- HTTP interceptor traces
- Router navigation events
- Component lifecycle
- Service injections

#### Vue.js
- Component lifecycle hooks
- Vue Router navigation
- Vuex state changes
- Computed property evaluation

#### Express/Node.js
- Middleware execution
- Route handler performance
- Database connection pooling
- External API calls

## 🐛 Debugging

Enable debug mode to see what's happening:

```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'signoz',
  config: { 
    endpoint: 'http://localhost:4318/v1/traces'
  },
  environment: 'development' // Enables debug logging
});

// Check what was detected
const framework = logger.getDetectedFramework();
console.log('Detected framework:', framework);

const config = logger.getConfig();
console.log('Final config:', config);
```

## 🔧 Troubleshooting

### Common Issues

**Q: Framework not detected correctly**
```typescript
// Override auto-detection
const logger = new PepperLog({
  framework: 'react', // Force specific framework
  serviceName: 'my-app',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' }
});
```

**Q: Too much or too little instrumentation**
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' },
  features: {
    autoInstrumentation: false, // Disable auto-instrumentation
    tracing: true,              // Keep manual tracing
    metrics: false              // Disable metrics
  }
});
```

**Q: Backend connection issues**
```typescript
// Test with a simple backend first
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'jaeger',
  config: { 
    endpoint: 'http://localhost:14268/api/traces'
  }
});
```

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on top of [OpenTelemetry](https://opentelemetry.io/)
- Inspired by the need for easier observability in JavaScript applications
- Special thanks to the SigNoz, Jaeger, and OpenTelemetry communities

---

**Made with ❤️ and 🌶️ by the PepperLog team**