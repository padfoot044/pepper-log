# 🔧 Angular CORS Solutions for PepperLog

## 🎯 The Issue
CORS (Cross-Origin Resource Sharing) blocks your Angular app from sending traces to your backend because:
- Angular runs on `localhost:4200` (or another port)
- Your backend runs on `localhost:4318` (different port = different origin)
- Browsers block cross-origin requests by default

## ✅ Solution 1: Updated PepperLog v1.0.3 (Recommended)

Update to the latest version that handles CORS gracefully:

```bash
npm update @padfoot044/pepper-log
```

The new version:
- ✅ **Automatically retries** with different strategies when CORS fails
- ✅ **Falls back to console logging** so you still see traces
- ✅ **Stores traces in localStorage** when network fails
- ✅ **Uses multiple sending methods** (fetch, no-cors, beacon API)

### Your Code (No Changes Needed):
```typescript
// This will work with CORS issues - graceful fallback
const pepperLog = new PepperLog({
  serviceName: 'test-logger-angular-app',
  backend: 'grafana',
  config: {
    endpoint: 'http://localhost:4318/v1/traces',
    corsConfig: {
      fallbackToConsole: true,        // Show traces in console if network fails
      fallbackToLocalStorage: true,   // Store traces locally if network fails
      fallbackToBeacon: true,         // Try beacon API as fallback
      retryAttempts: 2,               // Retry failed requests
      retryDelay: 1000                // Wait 1s between retries
    }
  }
});

// Test CORS status
await pepperLog.initialize();
const corsStatus = pepperLog.getCORSStatus();
console.log('CORS Status:', corsStatus);

// Check if endpoint supports CORS
const corsTest = await pepperLog.testEndpointCORS();
console.log('CORS Test:', corsTest);
```

## ✅ Solution 2: Angular Proxy (Development)

### Step 1: Create proxy configuration
Create `proxy.conf.json` in your Angular project root:

```json
{
  "/api/traces/*": {
    "target": "http://localhost:4318",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/api/traces": "/v1/traces"
    }
  }
}
```

### Step 2: Update angular.json
```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

### Step 3: Update PepperLog config
```typescript
const pepperLog = new PepperLog({
  serviceName: 'test-logger-angular-app',
  backend: 'grafana',
  config: {
    endpoint: '/api/traces',  // Use proxy path instead of full URL
  }
});
```

### Step 4: Start Angular with proxy
```bash
ng serve
# Proxy automatically handles CORS
```

## ✅ Solution 3: Backend CORS Configuration

### For SigNoz (Docker):
```bash
docker run -d --name signoz \
  -p 3301:3301 \
  -p 4318:4318 \
  signoz/signoz:latest \
  --cors-allowed-origins="http://localhost:4200"
```

### For Grafana + Tempo:
```yaml
# docker-compose.yml
version: '3.8'
services:
  tempo:
    image: grafana/tempo:latest
    command: [ "-config.file=/etc/tempo.yaml" ]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
    ports:
      - "4318:4318"

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

```yaml
# tempo.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: 0.0.0.0:4318
          cors:
            allowed_origins: ["http://localhost:4200"]
```

### For Jaeger:
```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest \
  --collector.otlp.http.cors.allowed-origins="http://localhost:4200"
```

## ✅ Solution 4: Nginx Reverse Proxy (Production)

### nginx.conf:
```nginx
server {
    listen 8080;
    
    location /telemetry/ {
        # Remove CORS restrictions
        add_header Access-Control-Allow-Origin "http://localhost:4200" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }
        
        # Proxy to your backend
        proxy_pass http://localhost:4318/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then use endpoint: `http://localhost:8080/telemetry/v1/traces`

## 🧪 Debugging CORS Issues

### Check if PepperLog is working:
```typescript
// Add this to your component
async ngOnInit() {
  await this.pepperLogService.initialize();
  
  // Test CORS
  const corsTest = await this.pepperLogService.pepperLog.testEndpointCORS();
  console.log('🔍 CORS Test Result:', corsTest);
  
  // Check for stored traces (indicates CORS failures)
  const storedTraces = this.pepperLogService.pepperLog.getStoredTraces();
  console.log('📊 Stored Traces (CORS failures):', storedTraces.length);
  
  // Get recommendations
  const corsStatus = this.pepperLogService.pepperLog.getCORSStatus();
  console.log('💡 CORS Recommendations:', corsStatus.recommendations);
}
```

### Verify traces are being created:
```typescript
async onButtonClick() {
  console.log('🔄 Before trace call');
  
  const result = await this.pepperLogService.traceUserAction('button-click', {
    buttonId: 'test-button'
  });
  
  console.log('✅ Trace result:', result);
  console.log('📊 Check console logs above for network attempts');
}
```

## 🎯 Expected Behavior with v1.0.3+

### ✅ Success (CORS working):
- Console: "Successfully sent X spans via CORS"
- Network tab: POST requests to your endpoint
- No traces in localStorage

### ⚠️ CORS Issues (Graceful fallback):
- Console: "CORS request failed, trying fallback strategies"
- Console: Detailed span information logged
- Network tab: Failed requests, but functionality continues
- localStorage contains failed traces for later analysis

### ❌ Complete failure:
- Console: "All network attempts failed, falling back to console logging"
- All telemetry still logged to console
- Your app continues working normally

## 📊 Summary

**The new PepperLog v1.0.3+ handles CORS issues gracefully** - your telemetry will work even when network requests fail. Choose the solution that fits your setup:

1. **Quick Fix**: Update PepperLog (handles CORS automatically)
2. **Development**: Use Angular proxy 
3. **Production**: Configure backend CORS or use nginx proxy

**Your code doesn't need to change** - PepperLog now handles CORS issues intelligently! 🌶️