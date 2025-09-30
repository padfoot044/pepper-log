# 🛠️ Global CORS Fix for PepperLog

## 🎯 The Problem
When integrating PepperLog with any frontend framework (Angular, React, Vue, etc.) and trying to send telemetry data to a local backend, you'll encounter CORS (Cross-Origin Resource Sharing) errors because:

- Your app runs on `localhost:3000`, `localhost:4200`, etc.
- Your backend runs on `localhost:4318`, `localhost:3000/api`, etc.
- Browsers block cross-origin requests by default

## ✅ **Global Solution: Built-in CORS Handling**

**PepperLog v3.0.2+ includes automatic CORS handling that requires NO framework-side changes!**

### 🚀 **Zero-Configuration Setup**

Simply install and use PepperLog - CORS fallbacks are enabled by default:

```bash
npm install @padfoot044/pepper-log@latest
```

```typescript
// ✅ This works out of the box - no additional CORS configuration needed!
const pepperLog = new PepperLog({
  serviceName: 'my-frontend-app',
  backend: 'grafana', // or 'signoz', 'jaeger', etc.
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

await pepperLog.initialize();

// Your traces will be sent with automatic CORS fallbacks
pepperLog.createSpan('user-action').end();
```

### 🔧 **How It Works Automatically**

PepperLog tries multiple strategies in order:

1. **CORS Request** - Normal HTTP request with CORS headers
2. **No-CORS Request** - Simplified request that bypasses CORS
3. **Beacon API** - Browser's sendBeacon for reliability
4. **localStorage Fallback** - Stores traces locally if network fails
5. **Console Logging** - Always shows traces in developer console

### 📊 **Built-in CORS Diagnostics**

Check CORS status and get recommendations:

```typescript
// Test if your endpoint supports CORS
const corsTest = await pepperLog.testEndpointCORS();
console.log('CORS Test Result:', corsTest);
// Output: { endpoint: "http://localhost:4318/v1/traces", corsSupported: false, error: "CORS error" }

// Get overall CORS status and recommendations
const status = pepperLog.getCORSStatus();
console.log('CORS Status:', status);
// Output: {
//   corsFailures: true,
//   fallbacksEnabled: { fallbackToConsole: true, fallbackToLocalStorage: true },
//   storedTraceCount: 5,
//   recommendations: [
//     "CORS issues detected - traces stored in localStorage",
//     "Consider configuring your backend to allow CORS from your origin"
//   ]
// }

// View traces stored locally due to CORS issues
const storedTraces = pepperLog.getStoredTraces();
console.log('Stored Traces:', storedTraces);

// Clear stored traces if needed
pepperLog.clearStoredTraces();
```

### ⚙️ **Custom CORS Configuration** (Optional)

Override default CORS behavior if needed:

```typescript
const pepperLog = new PepperLog({
  serviceName: 'my-app',
  backend: 'custom',
  config: {
    endpoint: 'http://localhost:4318/v1/traces',
    corsConfig: {
      fallbackToConsole: true,       // Show traces in console (default: true)
      fallbackToLocalStorage: true,  // Store in localStorage (default: true)  
      fallbackToBeacon: true,        // Try beacon API (default: true)
      corsMode: 'cors',              // 'cors' | 'no-cors' | 'same-origin' (default: 'cors')
      retryAttempts: 3,              // Number of retries (default: 2)
      retryDelay: 1500               // Delay between retries in ms (default: 1000)
    }
  }
});
```

## 🎯 **Framework-Specific Examples**

### Angular

```typescript
import { Injectable } from '@angular/core';
import { PepperLog } from '@padfoot044/pepper-log';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private pepperLog: PepperLog;

  constructor() {
    this.pepperLog = new PepperLog({
      serviceName: 'angular-app',
      backend: 'grafana',
      config: {
        endpoint: 'http://localhost:4318/v1/traces'
        // CORS handling is automatic!
      }
    });
    
    this.pepperLog.initialize();
  }

  trackUserAction(action: string) {
    // This will work even with CORS issues
    const span = this.pepperLog.createSpan(`user-${action}`);
    span.end();
  }
}
```

### React

```tsx
import React, { useEffect } from 'react';
import { PepperLog } from '@padfoot044/pepper-log';

const telemetry = new PepperLog({
  serviceName: 'react-app',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
    // CORS handling is automatic!
  }
});

function App() {
  useEffect(() => {
    telemetry.initialize();
  }, []);

  const handleClick = () => {
    // This will work even with CORS issues
    const span = telemetry.createSpan('button-click');
    span.end();
  };

  return <button onClick={handleClick}>Track Click</button>;
}
```

### Vue.js

```vue
<template>
  <button @click="trackEvent">Track Event</button>
</template>

<script>
import { PepperLog } from '@padfoot044/pepper-log';

const telemetry = new PepperLog({
  serviceName: 'vue-app',
  backend: 'jaeger',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
    // CORS handling is automatic!
  }
});

export default {
  async mounted() {
    await telemetry.initialize();
  },
  
  methods: {
    trackEvent() {
      // This will work even with CORS issues
      const span = telemetry.createSpan('vue-event');
      span.end();
    }
  }
}
</script>
```

## 🐛 **Troubleshooting**

### Check Browser Console
Always check the browser console - PepperLog will show you exactly what's happening:

```
🌶️ CORS-Friendly OTLP Exporter initialized
🌶️ Attempting CORS request to: http://localhost:4318/v1/traces
🌶️ CORS request failed: TypeError: Failed to fetch
🌶️ Attempting no-CORS request to: http://localhost:4318/v1/traces
🌶️ Sent 1 spans via no-CORS (status unknown)
```

### Test CORS Support
```typescript
// Quick test to see if your backend supports CORS
const result = await pepperLog.testEndpointCORS();
if (!result.corsSupported) {
  console.warn('Backend does not support CORS:', result.error);
  console.log('PepperLog will use fallback methods automatically');
}
```

### View Stored Traces
```typescript
// If CORS fails, traces are stored locally
const stored = pepperLog.getStoredTraces();
console.log(`Found ${stored.length} traces stored due to CORS issues`);

// You can send these to your backend later or examine them
stored.forEach(trace => {
  console.log('Stored trace:', trace.data.payload);
});
```

## 🏥 **Backend Configuration** (Optional)

While PepperLog handles CORS issues automatically, you can optionally configure your backend to support CORS:

### Docker (OTLP Collector)
```bash
docker run -p 4318:4318 otel/opentelemetry-collector-contrib:latest \
  --config=otel-collector-config.yaml
```

With `otel-collector-config.yaml`:
```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins: ["http://localhost:3000", "http://localhost:4200"]
```

### Grafana/Tempo
```yaml
server:
  http_listen_address: 0.0.0.0
  http_listen_port: 4318
  http_server_read_timeout: 30s
  http_server_write_timeout: 30s
  grpc_server_max_recv_msg_size: 4194304
  grpc_server_max_send_msg_size: 4194304
  cors_allow_origin: "*"  # For development only
```

### Express.js Proxy (Development)
```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/api/traces', createProxyMiddleware({
  target: 'http://localhost:4318',
  changeOrigin: true,
  pathRewrite: { '^/api/traces': '/v1/traces' }
}));

app.listen(3001);
```

Then use endpoint: `http://localhost:3001/api/traces`

## 📈 **Benefits of the Global CORS Fix**

✅ **No framework configuration needed** - Works in any JavaScript/TypeScript framework
✅ **Automatic fallbacks** - Never lose telemetry data due to CORS
✅ **Built-in diagnostics** - Easy troubleshooting and monitoring
✅ **Graceful degradation** - Apps never break due to telemetry issues
✅ **Development friendly** - See traces in console even when network fails
✅ **Multiple transport methods** - Fetch, no-CORS, beacon API, localStorage
✅ **Production ready** - Handles network failures and retries automatically

## 📝 **Summary**

**You don't need to change anything in your framework code!** PepperLog v3.0.2+ automatically handles CORS issues using multiple fallback strategies. Just install and use it normally - the CORS handling is built-in and transparent.

```bash
# Update to latest version for automatic CORS handling
npm update @padfoot044/pepper-log

# That's it! No additional configuration needed
```