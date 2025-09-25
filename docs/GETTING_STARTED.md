# Getting Started with PepperLog

This guide will help you integrate PepperLog into your application step by step.

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- npm, yarn, or pnpm
- A backend service (SigNoz, Jaeger, etc.) running locally or in the cloud

## 🏃‍♂️ Quick Setup (5 minutes)

### Step 1: Install PepperLog

```bash
npm install pepper-log
```

### Step 2: Basic Integration

Create a `telemetry.ts` (or `.js`) file in your project root:

```typescript
import { PepperLog } from 'pepper-log';

const logger = new PepperLog({
  serviceName: 'my-application',
  backend: 'signoz', // or 'jaeger', 'datadog', etc.
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

// Initialize once at application startup
logger.initialize().catch(console.error);

export default logger;
```

### Step 3: Import in Your Main File

**For React (index.tsx or App.tsx):**
```typescript
import './telemetry'; // Import first
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
```

**For Express (server.js or app.js):**
```typescript
import './telemetry'; // Import first
import express from 'express';

const app = express();
// Your Express app code...
```

**For Next.js (pages/_app.tsx):**
```typescript
import './telemetry'; // Import first
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

## 🎯 Framework-Specific Setup

### React Application

1. **Create telemetry setup:**
```typescript
// src/telemetry.ts
import { PepperLog } from 'pepper-log';

const logger = new PepperLog({
  serviceName: 'my-react-app',
  backend: 'signoz',
  config: {
    endpoint: process.env.REACT_APP_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  }
});

logger.initialize();
export default logger;
```

2. **Add to environment variables (.env):**
```bash
REACT_APP_OTLP_ENDPOINT=http://localhost:4318/v1/traces
REACT_APP_SERVICE_NAME=my-react-app
```

3. **Import in src/index.tsx:**
```typescript
import './telemetry';
// ... rest of your imports
```

### Angular Application

1. **Create telemetry service:**
```typescript
// src/app/services/telemetry.service.ts
import { Injectable } from '@angular/core';
import { PepperLog } from 'pepper-log';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private logger: PepperLog;

  constructor() {
    this.logger = new PepperLog({
      serviceName: 'my-angular-app',
      backend: 'signoz',
      config: {
        endpoint: 'http://localhost:4318/v1/traces'
      }
    });

    this.logger.initialize();
  }

  getLogger(): PepperLog {
    return this.logger;
  }
}
```

2. **Initialize in main.ts:**
```typescript
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Initialize telemetry before bootstrapping
import { TelemetryService } from './app/services/telemetry.service';

platformBrowserDynamic().bootstrapModule(AppModule);
```

### Express/Node.js Application

1. **Create telemetry setup:**
```typescript
// src/telemetry.ts
import { PepperLog } from 'pepper-log';

const logger = new PepperLog({
  serviceName: process.env.SERVICE_NAME || 'my-express-api',
  backend: 'signoz',
  config: {
    endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  }
});

logger.initialize();
export default logger;
```

2. **Import in your server file (FIRST import):**
```typescript
import './telemetry'; // Must be first!
import express from 'express';
import cors from 'cors';

const app = express();
// ... rest of your server setup
```

### Next.js Application

1. **Create telemetry setup:**
```typescript
// lib/telemetry.ts
import { PepperLog } from 'pepper-log';

const logger = new PepperLog({
  serviceName: 'my-nextjs-app',
  backend: 'signoz',
  config: {
    endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  }
});

logger.initialize();
export default logger;
```

2. **Add to next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OTLP_ENDPOINT: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  },
}

module.exports = nextConfig
```

3. **Import in pages/_app.tsx:**
```typescript
import '../lib/telemetry'; // Import first
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

## 🔧 Backend Setup

### SigNoz (Recommended for self-hosting)

1. **Start SigNoz with Docker:**
```bash
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy/
docker compose -f docker/clickhouse-setup/docker-compose.yaml up -d
```

2. **Access SigNoz UI:** http://localhost:3301

3. **Configure PepperLog:**
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});
```

### Jaeger (Local Development)

1. **Start Jaeger with Docker:**
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

2. **Access Jaeger UI:** http://localhost:16686

3. **Configure PepperLog:**
```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'jaeger',
  config: {
    endpoint: 'http://localhost:14268/api/traces'
  }
});
```

### Datadog (Cloud)

1. **Get your Datadog API key** from https://app.datadoghq.com/

2. **Configure PepperLog:**
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

## ✅ Verify It's Working

1. **Start your application**
2. **Make some requests/interactions**
3. **Check your backend UI:**
   - SigNoz: http://localhost:3301
   - Jaeger: http://localhost:16686
   - Datadog: https://app.datadoghq.com/apm/traces

4. **Look for traces with your service name**

## 🎨 Customize Your Setup

### Environment-Based Configuration

```typescript
const logger = new PepperLog({
  serviceName: process.env.SERVICE_NAME || 'my-app',
  backend: process.env.OTLP_BACKEND || 'signoz',
  config: {
    endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    apiKey: process.env.OTLP_API_KEY
  },
  environment: process.env.NODE_ENV || 'development'
});
```

### Disable Features

```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' },
  features: {
    tracing: true,
    metrics: false,           // Disable metrics
    logging: true,
    autoInstrumentation: false // Disable auto-instrumentation
  }
});
```

### Add Global Attributes

```typescript
const logger = new PepperLog({
  serviceName: 'my-app',
  backend: 'signoz',
  config: { endpoint: 'http://localhost:4318/v1/traces' },
  globalAttributes: {
    'deployment.environment': 'production',
    'service.version': '1.0.0',
    'team': 'backend'
  }
});
```

## 🐛 Troubleshooting

### Framework Not Detected
```bash
# Check what was detected
console.log('Detected framework:', logger.getDetectedFramework());

# Or override detection
const logger = new PepperLog({
  framework: 'react', // Force specific framework
  // ... other config
});
```

### Connection Issues
```bash
# Test with curl
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"traces":[]}'

# Check if backend is running
docker ps | grep signoz
# or
docker ps | grep jaeger
```

### No Traces Appearing
1. **Check console for errors**
2. **Verify endpoint URL**
3. **Ensure telemetry is imported first**
4. **Check backend is running and accessible**

## 📚 Next Steps

- [Advanced Configuration](./ADVANCED.md)
- [Custom Instrumentation](./CUSTOM_INSTRUMENTATION.md)
- [Backend Integrations](./BACKENDS.md)
- [Framework-Specific Features](./FRAMEWORKS.md)

## 🆘 Need Help?

- [GitHub Issues](https://github.com/yourusername/pepper-log/issues)
- [Documentation](../README.md)
- [Examples](../examples/)