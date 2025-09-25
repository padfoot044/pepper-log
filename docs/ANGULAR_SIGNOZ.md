# 🌶️ Angular + SigNoz Integration Test

This guide shows how to test PepperLog in Angular with SigNoz backend for observability.

## 🚀 Quick Setup

### Step 1: Setup SigNoz (Choose one option)

#### Option A: SigNoz Cloud (Easiest)
1. Sign up at [SigNoz Cloud](https://signoz.io/teams/)
2. Get your ingestion endpoint and token
3. Use in configuration below

#### Option B: Self-Hosted SigNoz
```bash
# Clone SigNoz
git clone -b main https://github.com/SigNoz/signoz.git && cd signoz/deploy/

# Start SigNoz
docker compose -f docker/clickhouse-setup/docker-compose.yaml up -d

# SigNoz will be available at:
# - Frontend: http://localhost:3301
# - OTLP endpoint: http://localhost:4318
```

### Step 2: Prepare PepperLog
```powershell
# In pepper-log directory
npm run build
npm link
```

### Step 3: Create Angular Project
```powershell
cd ..
npx @angular/cli@latest new angular-signoz-test --routing --style=css --skip-git
cd angular-signoz-test
npm link pepper-log
```

## 📝 SigNoz Configuration Files

### 1. Telemetry Service (`src/app/services/telemetry.service.ts`)

```typescript
import { Injectable } from '@angular/core';
import { PepperLog } from 'pepper-log';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private pepperLog: PepperLog;
  private initialized = false;

  constructor() {
    this.pepperLog = new PepperLog({
      serviceName: 'angular-signoz-test',
      backend: 'signoz',
      config: {
        // For SigNoz Cloud (replace with your details)
        endpoint: 'https://ingest.{region}.signoz.cloud:443/v1/traces',
        headers: {
          'signoz-access-token': 'your-signoz-token-here' // Replace with actual token
        },
        
        // For Self-hosted SigNoz (uncomment if using local)
        // endpoint: 'http://localhost:4318/v1/traces',
        // headers: {} // No token needed for local
      },
      globalAttributes: {
        'service.name': 'angular-signoz-test',
        'service.version': '1.0.0',
        'deployment.environment': 'development',
        'app.framework': 'angular',
        'app.framework.version': '17.0.0',
        'telemetry.backend': 'signoz'
      },
      debug: true // Enable debug logs
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing PepperLog with SigNoz...');
      await this.pepperLog.initialize();
      this.initialized = true;
      
      console.log('🌶️ PepperLog initialized with SigNoz!');
      
      // Log framework detection
      const framework = this.pepperLog.getDetectedFramework();
      console.log('🔍 Framework detected:', framework);
      
      // Create initialization span
      const initSpan = this.pepperLog.createSpan('angular.app.init', {
        'init.timestamp': new Date().toISOString(),
        'app.ready': true
      });
      
      setTimeout(() => {
        initSpan.setAttributes({
          'init.duration_ms': 100,
          'init.success': true
        });
        initSpan.end();
      }, 100);
      
    } catch (error) {
      console.error('❌ PepperLog initialization failed:', error);
      throw error;
    }
  }

  // Wrapper methods for easy use
  createSpan(name: string, attributes?: Record<string, any>) {
    if (!this.initialized) {
      console.warn('⚠️ PepperLog not initialized, span not created');
      return null;
    }
    return this.pepperLog.createSpan(name, attributes);
  }

  async traceFunction<T>(
    name: string, 
    fn: () => Promise<T> | T, 
    attributes?: Record<string, any>
  ): Promise<T> {
    if (!this.initialized) {
      console.warn('⚠️ PepperLog not initialized, executing function without tracing');
      return typeof fn === 'function' ? await fn() : fn;
    }
    
    return this.pepperLog.traceFunction(name, fn, attributes);
  }

  // Angular-specific tracing helpers
  traceComponentLifecycle(component: string, lifecycle: string, attributes?: Record<string, any>) {
    return this.createSpan(`angular.component.${lifecycle}`, {
      'component.name': component,
      'lifecycle.event': lifecycle,
      'angular.version': '17.0.0',
      ...attributes
    });
  }

  traceHttpRequest(method: string, url: string, attributes?: Record<string, any>) {
    return this.createSpan('angular.http.request', {
      'http.method': method,
      'http.url': url,
      'http.framework': 'angular-httpclient',
      ...attributes
    });
  }

  traceUserInteraction(action: string, element: string, attributes?: Record<string, any>) {
    return this.createSpan('angular.user.interaction', {
      'user.action': action,
      'ui.element': element,
      'interaction.timestamp': new Date().toISOString(),
      ...attributes
    });
  }

  // Metrics for SigNoz
  recordMetric(name: string, value: number, attributes?: Record<string, any>) {
    if (!this.initialized) return;
    
    const counter = this.pepperLog.createCounter(name, `Angular metric: ${name}`);
    counter.add(value, attributes);
  }

  recordDuration(name: string, duration: number, attributes?: Record<string, any>) {
    if (!this.initialized) return;
    
    const histogram = this.pepperLog.createHistogram(name, `Angular duration: ${name}`);
    histogram.record(duration, attributes);
  }

  // Getters
  isInitialized(): boolean {
    return this.initialized;
  }

  getPepperLog(): PepperLog {
    return this.pepperLog;
  }
}
```

### 2. Main Application Bootstrap (`src/main.ts`)

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './app/services/telemetry.service';

async function initializeApp() {
  console.log('🅰️ Starting Angular application with SigNoz telemetry...');
  
  const telemetryService = new TelemetryService();
  
  try {
    // Initialize telemetry first
    await telemetryService.initialize();
    console.log('✅ SigNoz telemetry ready!');
    
    // Add global error handler with telemetry
    window.addEventListener('error', (event) => {
      const span = telemetryService.createSpan('angular.error.global', {
        'error.message': event.message,
        'error.filename': event.filename,
        'error.line': event.lineno,
        'error.column': event.colno,
        'error.type': 'javascript'
      });
      
      if (span) {
        span.recordException(event.error);
        span.end();
      }
    });

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const span = telemetryService.createSpan('angular.error.promise', {
        'error.type': 'unhandled-promise',
        'error.reason': String(event.reason)
      });
      
      if (span) {
        span.recordException(event.reason);
        span.end();
      }
    });
    
  } catch (error) {
    console.warn('⚠️ SigNoz initialization failed, continuing without telemetry:', error);
  }

  // Bootstrap Angular application
  try {
    const app = await bootstrapApplication(AppComponent, appConfig);
    console.log('🎉 Angular application bootstrapped successfully');
    return app;
  } catch (err) {
    console.error('❌ Angular bootstrap failed:', err);
    throw err;
  }
}

// Start the application
initializeApp().catch(err => {
  console.error('💥 Application startup failed:', err);
});
```

### 3. App Configuration (`src/app/app.config.ts`)

```typescript
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      // Add telemetry interceptor if needed
      // withInterceptors([telemetryInterceptor])
    )
  ]
};
```

### 4. Test Component (`src/app/app.component.ts`)

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TelemetryService } from './services/telemetry.service';

interface ActionLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="container">
      <header>
        <h1>🌶️ Angular + SigNoz Test</h1>
        <div class="status-card" [class]="getStatusClass()">
          <h3>📊 Telemetry Status</h3>
          <p>
            <strong>Backend:</strong> SigNoz<br>
            <strong>Status:</strong> 
            <span class="status-indicator" [class]="getStatusClass()">
              {{ telemetryService.isInitialized() ? '✅ Connected' : '❌ Disconnected' }}
            </span>
          </p>
        </div>
      </header>

      <main>
        <section class="test-actions">
          <h2>🧪 Test Actions</h2>
          
          <div class="button-grid">
            <button (click)="testComponentTrace()" class="btn btn-primary">
              🎯 Component Lifecycle
            </button>
            
            <button (click)="testAsyncOperation()" class="btn btn-secondary">
              ⏱️ Async Operation
            </button>
            
            <button (click)="testHttpRequest()" class="btn btn-info">
              🌐 HTTP Request
            </button>
            
            <button (click)="testUserInteraction()" class="btn btn-success">
              👆 User Interaction
            </button>
            
            <button (click)="testErrorHandling()" class="btn btn-warning">
              🚨 Error Handling
            </button>
            
            <button (click)="testMetrics()" class="btn btn-purple">
              📈 Custom Metrics
            </button>
          </div>
        </section>

        <section class="logs-section">
          <h3>📋 Activity Logs</h3>
          <div class="logs-container">
            <div *ngFor="let log of actionLogs" 
                 class="log-entry" 
                 [class]="'log-' + log.type">
              <span class="log-time">{{ log.timestamp }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </section>

        <section class="signoz-info">
          <h3>🔍 View in SigNoz</h3>
          <div class="info-card">
            <p><strong>Service Name:</strong> angular-signoz-test</p>
            <p><strong>SigNoz Dashboard:</strong> 
              <a href="http://localhost:3301" target="_blank">http://localhost:3301</a>
              (if self-hosted)
            </p>
            <p><strong>Look for spans:</strong> angular.*, http.*, user.*</p>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
    
    header { margin-bottom: 30px; }
    h1 { color: #2c3e50; margin-bottom: 20px; }
    
    .status-card {
      background: #f8f9fa;
      border: 2px solid #dee2e6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .status-card.success { border-color: #28a745; background: #d4edda; }
    .status-card.error { border-color: #dc3545; background: #f8d7da; }
    
    .status-indicator.success { color: #28a745; font-weight: bold; }
    .status-indicator.error { color: #dc3545; font-weight: bold; }
    
    .test-actions { margin-bottom: 30px; }
    
    .button-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-warning { background: #ffc107; color: #212529; }
    .btn-purple { background: #6f42c1; color: white; }
    
    .logs-section { margin-bottom: 30px; }
    
    .logs-container {
      background: #1e1e1e;
      border-radius: 8px;
      padding: 15px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Consolas', monospace;
    }
    
    .log-entry {
      display: flex;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .log-time {
      color: #7c7c7c;
      margin-right: 10px;
      flex-shrink: 0;
    }
    
    .log-message { flex: 1; }
    
    .log-info .log-message { color: #61dafb; }
    .log-success .log-message { color: #98fb98; }
    .log-error .log-message { color: #ff6b6b; }
    
    .signoz-info { }
    
    .info-card {
      background: #e3f2fd;
      border: 1px solid #2196f3;
      padding: 20px;
      border-radius: 8px;
    }
    
    .info-card a {
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
    }
    
    .info-card a:hover {
      text-decoration: underline;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  actionLogs: ActionLog[] = [];
  private componentSpan: any;

  constructor(
    public telemetryService: TelemetryService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.addLog('🚀 Angular component initializing...', 'info');
    
    // Trace component initialization
    this.componentSpan = this.telemetryService.traceComponentLifecycle(
      'AppComponent', 
      'init',
      {
        'route.path': '/',
        'component.standalone': true
      }
    );
    
    // Simulate initialization work
    setTimeout(() => {
      if (this.componentSpan) {
        this.componentSpan.setAttributes({
          'init.completed': true,
          'init.duration_ms': 100
        });
        this.componentSpan.end();
      }
      this.addLog('✅ Component initialization traced', 'success');
    }, 100);
  }

  ngOnDestroy() {
    const destroySpan = this.telemetryService.traceComponentLifecycle(
      'AppComponent', 
      'destroy'
    );
    
    if (destroySpan) {
      destroySpan.end();
    }
  }

  async testComponentTrace() {
    this.addLog('🎯 Testing component lifecycle tracing...', 'info');
    
    const span = this.telemetryService.traceComponentLifecycle(
      'TestComponent',
      'manual-test',
      {
        'test.trigger': 'button-click',
        'test.type': 'lifecycle'
      }
    );

    if (span) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      span.setAttributes({
        'test.result': 'success',
        'test.duration_ms': 200
      });
      
      span.end();
      this.addLog('✅ Component lifecycle traced successfully', 'success');
    } else {
      this.addLog('❌ Failed to create component span', 'error');
    }
  }

  async testAsyncOperation() {
    this.addLog('⏱️ Testing async operation tracing...', 'info');
    
    try {
      const result = await this.telemetryService.traceFunction(
        'angular.async.operation',
        async () => {
          this.addLog('📊 Executing async operation...', 'info');
          
          // Simulate complex async work
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Simulate data processing
          const data = Array.from({length: 10000}, (_, i) => Math.random() * i);
          const processed = data.filter(x => x > 500).sort((a, b) => b - a);
          
          return {
            originalSize: data.length,
            processedSize: processed.length,
            maxValue: processed[0] || 0
          };
        },
        {
          'operation.type': 'data-processing',
          'operation.complexity': 'high',
          'data.initial_size': 10000
        }
      );

      this.addLog(`✅ Async operation completed: ${JSON.stringify(result)}`, 'success');
    } catch (error) {
      this.addLog(`❌ Async operation failed: ${error}`, 'error');
    }
  }

  async testHttpRequest() {
    this.addLog('🌐 Testing HTTP request tracing...', 'info');
    
    const span = this.telemetryService.traceHttpRequest(
      'GET', 
      'https://jsonplaceholder.typicode.com/posts/1'
    );

    try {
      const startTime = performance.now();
      
      const response = await this.http.get('https://jsonplaceholder.typicode.com/posts/1').toPromise();
      
      const duration = performance.now() - startTime;
      
      if (span) {
        span.setAttributes({
          'http.status_code': 200,
          'http.response_size': JSON.stringify(response).length,
          'http.duration_ms': Math.round(duration),
          'http.success': true
        });
        span.end();
      }
      
      this.addLog('✅ HTTP request traced successfully', 'success');
    } catch (error) {
      if (span) {
        span.recordException(error as Error);
        span.setAttributes({
          'http.error': true,
          'http.error_message': (error as Error).message
        });
        span.end();
      }
      
      this.addLog(`❌ HTTP request failed: ${error}`, 'error');
    }
  }

  testUserInteraction() {
    this.addLog('👆 Testing user interaction tracing...', 'info');
    
    const span = this.telemetryService.traceUserInteraction(
      'click',
      'test-button',
      {
        'button.id': 'user-interaction-test',
        'user.session_id': 'test-session-123',
        'page.url': window.location.href
      }
    );

    if (span) {
      // Simulate interaction processing
      setTimeout(() => {
        span.setAttributes({
          'interaction.processed': true,
          'interaction.result': 'success'
        });
        span.end();
        
        this.addLog('✅ User interaction traced successfully', 'success');
      }, 150);
    } else {
      this.addLog('❌ Failed to create interaction span', 'error');
    }
  }

  async testErrorHandling() {
    this.addLog('🚨 Testing error handling and tracing...', 'info');
    
    try {
      await this.telemetryService.traceFunction(
        'angular.error.test',
        async () => {
          this.addLog('💥 Simulating error...', 'info');
          await new Promise(resolve => setTimeout(resolve, 100));
          
          throw new Error('Intentional test error for SigNoz tracing');
        },
        {
          'error.test': true,
          'error.intentional': true,
          'test.scenario': 'error-handling'
        }
      );
    } catch (error) {
      this.addLog(`✅ Error traced successfully: ${(error as Error).message}`, 'success');
    }
  }

  testMetrics() {
    this.addLog('📈 Recording custom metrics...', 'info');
    
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ Telemetry not initialized', 'error');
      return;
    }

    // Record various metrics
    this.telemetryService.recordMetric('angular.button.clicks', 1, {
      'button.type': 'metrics-test',
      'component': 'AppComponent'
    });
    
    this.telemetryService.recordMetric('angular.user.actions', 1, {
      'action.type': 'test',
      'session.id': 'test-session'
    });
    
    this.telemetryService.recordDuration('angular.operation.duration', Math.random() * 1000, {
      'operation.type': 'metrics-test',
      'operation.success': true
    });
    
    // Record page performance metrics
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      this.telemetryService.recordDuration('angular.page.load_time', loadTime, {
        'page.url': window.location.href,
        'page.title': document.title
      });
    }

    this.addLog('✅ Custom metrics recorded successfully', 'success');
  }

  getStatusClass(): string {
    return this.telemetryService.isInitialized() ? 'success' : 'error';
  }

  private addLog(message: string, type: 'info' | 'success' | 'error') {
    const timestamp = new Date().toLocaleTimeString();
    this.actionLogs.unshift({
      timestamp,
      message,
      type
    });
    
    // Keep only last 20 logs
    if (this.actionLogs.length > 20) {
      this.actionLogs = this.actionLogs.slice(0, 20);
    }
  }
}
```

## 🚀 Running the Test

### Step 1: Start SigNoz
```bash
# Self-hosted (recommended for testing)
cd signoz/deploy/
docker compose -f docker/clickhouse-setup/docker-compose.yaml up -d

# Wait for SigNoz to be ready (takes 2-3 minutes)
# Check: http://localhost:3301
```

### Step 2: Update Configuration
Replace in `telemetry.service.ts`:
- For **SigNoz Cloud**: Update `endpoint` and `signoz-access-token`
- For **Self-hosted**: Use `http://localhost:4318/v1/traces`

### Step 3: Run Angular App
```bash
cd angular-signoz-test
ng serve
```

### Step 4: Test and Verify
1. **Open app**: http://localhost:4200
2. **Test buttons**: Click each test button
3. **Check SigNoz**: http://localhost:3301
4. **Look for service**: `angular-signoz-test`

## 🎯 What You'll See in SigNoz

### Services Dashboard:
- Service: `angular-signoz-test`
- Operations: `angular.*`, `http.*`, `user.*`

### Traces:
- Component lifecycle spans
- HTTP request traces
- User interaction events
- Error traces with stack traces

### Metrics:
- Custom Angular metrics
- Performance measurements
- User action counters

This gives you a complete Angular + SigNoz integration for comprehensive observability!