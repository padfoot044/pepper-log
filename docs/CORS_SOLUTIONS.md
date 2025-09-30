# Jaeger CORS Configuration Solutions

## Option 1: Docker with CORS enabled
```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -e COLLECTOR_HTTP_HOST_PORT=:14268 \
  -e QUERY_HTTP_HOST_PORT=:16686 \
  -e COLLECTOR_OTLP_HTTP_HOST_PORT=:4318 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest \
  --collector.otlp.enabled=true \
  --collector.http-server.host-port=:14268 \
  --collector.http-server.cors.allowed-origins="http://localhost:4200,http://localhost:3000,*"
```

## Option 2: Use OTLP endpoint instead of Jaeger-specific endpoint
Change your PepperLog config to use OTLP format:

```typescript
const pepperLog = new PepperLog({
  serviceName: 'test-logger-angular-app',
  backend: 'jaeger', // Keep as jaeger
  config: {
    endpoint: 'http://localhost:4318/v1/traces', // Use OTLP endpoint instead
    batchConfig: {
      maxExportBatchSize: 100,
      exportTimeoutMillis: 5000,
      scheduledDelayMillis: 1000,
    }
  },
  // ... rest of config
});
```

## Option 3: Nginx Proxy (Production recommended)
```nginx
server {
    listen 8080;
    location /jaeger/ {
        proxy_pass http://localhost:14268/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        add_header Access-Control-Allow-Origin "http://localhost:4200" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

Then use endpoint: 'http://localhost:8080/jaeger/api/traces'

## Option 4: Angular Proxy (Development)
In angular.json, add proxy configuration:

```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

proxy.conf.json:
```json
{
  "/jaeger/*": {
    "target": "http://localhost:14268",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/jaeger": ""
    }
  }
}
```

Then use endpoint: '/jaeger/api/traces' (relative URL)