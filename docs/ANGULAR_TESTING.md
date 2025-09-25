# 🅰️ Testing PepperLog with Real Angular Project

This guide shows how to test PepperLog in a real Angular application locally.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Test Angular Project

```bash
# Install Angular CLI if you don't have it
npm install -g @angular/cli

# Create new Angular project
ng new angular-pepperlog-test --routing --style=css
cd angular-pepperlog-test
```

### Step 2: Install PepperLog Locally

Since PepperLog isn't published yet, we'll use npm link:

```bash
# In your PepperLog directory (C:\Step2Gen\Projects\pepper-log)
npm run build
npm link

# In your Angular project directory
npm link pepper-log

# Install additional dependencies for observability backend
npm install --save-dev concurrently wait-on
```

### Step 3: Start Observability Backend

Choose one option:

#### Option A: SigNoz (Recommended)
```bash
# Create docker-compose.yml in your Angular project root
```

#### Option B: Jaeger (Simpler)
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

### Step 4: Configure Angular Project

1. **Create telemetry service:**
   ```bash
   ng generate service services/telemetry
   ```

2. **Update the service** (see code below)

3. **Import in main.ts** (see code below)

4. **Add to components** (see code below)

## 📁 Implementation Files

### 1. Angular Telemetry Service

Create `src/app/services/telemetry.service.ts`:

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
      serviceName: 'angular-pepperlog-test',
      backend: 'jaeger', // or 'signoz'
      config: {
        endpoint: 'http://localhost:14268/api/traces' // Jaeger
        // endpoint: 'http://localhost:4318/v1/traces' // SigNoz
      },
      globalAttributes: {
        'app.framework': 'angular',
        'app.version': '1.0.0',
        'deployment.environment': 'local-test'
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.pepperLog.initialize();
      this.initialized = true;
      console.log('🌶️ PepperLog initialized in Angular!');
      
      // Log detection results
      const framework = this.pepperLog.getDetectedFramework();
      console.log('🔍 Framework detected:', framework);
      
    } catch (error) {
      console.error('❌ PepperLog initialization failed:', error);
    }
  }

  // Expose PepperLog methods for components
  createSpan(name: string, attributes?: any) {
    return this.pepperLog.createSpan(name, attributes);
  }

  async traceFunction<T>(name: string, fn: () => Promise<T> | T, attributes?: any): Promise<T> {
    return this.pepperLog.traceFunction(name, fn, attributes);
  }

  addAttributes(attributes: Record<string, string | number | boolean>) {
    this.pepperLog.addAttributes(attributes);
  }

  createCounter(name: string, description?: string) {
    return this.pepperLog.createCounter(name, description);
  }

  createHistogram(name: string, description?: string) {
    return this.pepperLog.createHistogram(name, description);
  }

  getPepperLog(): PepperLog {
    return this.pepperLog;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
```

### 2. Update main.ts

Update `src/main.ts`:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './app/services/telemetry.service';

// Initialize telemetry before bootstrapping
async function initializeApp() {
  // Create telemetry service instance
  const telemetryService = new TelemetryService();
  
  try {
    console.log('🚀 Initializing PepperLog...');
    await telemetryService.initialize();
    console.log('✅ PepperLog ready!');
  } catch (error) {
    console.warn('⚠️ PepperLog initialization failed, continuing without telemetry:', error);
  }

  // Bootstrap Angular app
  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}

// Start the app
initializeApp();
```

### 3. Update App Component

Update `src/app/app.component.ts`:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TelemetryService } from './services/telemetry.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: \`
    <div class="container">
      <h1>🌶️ Angular PepperLog Test</h1>
      
      <div class="status">
        <p>PepperLog Status: 
          <span [class]="telemetryService.isInitialized() ? 'success' : 'warning'">
            {{ telemetryService.isInitialized() ? '✅ Initialized' : '⚠️ Not Initialized' }}
          </span>
        </p>
      </div>

      <div class="actions">
        <h2>Test Actions</h2>
        
        <button (click)="testManualSpan()" class="btn">
          🎯 Create Manual Span
        </button>
        
        <button (click)="testFunctionTracing()" class="btn">
          📊 Test Function Tracing
        </button>
        
        <button (click)="testHttpRequest()" class="btn">
          🌐 Test HTTP Request
        </button>
        
        <button (click)="testErrorTracing()" class="btn">
          🚨 Test Error Tracing
        </button>
        
        <button (click)="testMetrics()" class="btn">
          📈 Record Metrics
        </button>
      </div>

      <div class="logs">
        <h3>Recent Actions:</h3>
        <ul>
          <li *ngFor="let log of actionLogs">{{ log }}</li>
        </ul>
      </div>
    </div>
  \`,
  styles: [\`
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .status { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .success { color: green; font-weight: bold; }
    .warning { color: orange; font-weight: bold; }
    .actions { margin: 20px 0; }
    .btn { 
      display: block; 
      margin: 10px 0; 
      padding: 10px 15px; 
      background: #007bff; 
      color: white; 
      border: none; 
      border-radius: 5px; 
      cursor: pointer; 
      width: 200px;
    }
    .btn:hover { background: #0056b3; }
    .logs { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .logs ul { list-style-type: none; padding: 0; }
    .logs li { padding: 5px 0; border-bottom: 1px solid #ddd; }
  \`]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'angular-pepperlog-test';
  actionLogs: string[] = [];

  constructor(
    public telemetryService: TelemetryService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.addLog('🚀 Angular app started');
    
    // Test component lifecycle tracing
    if (this.telemetryService.isInitialized()) {
      const span = this.telemetryService.createSpan('angular.component.init', {
        'component.name': 'AppComponent',
        'lifecycle.event': 'ngOnInit'
      });
      
      setTimeout(() => span.end(), 100);
    }
  }

  ngOnDestroy() {
    if (this.telemetryService.isInitialized()) {
      const span = this.telemetryService.createSpan('angular.component.destroy', {
        'component.name': 'AppComponent',
        'lifecycle.event': 'ngOnDestroy'
      });
      span.end();
    }
  }

  async testManualSpan() {
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ PepperLog not initialized');
      return;
    }

    const span = this.telemetryService.createSpan('angular.manual.test', {
      'test.type': 'manual-span',
      'user.action': 'button-click'
    });

    this.addLog('🎯 Created manual span');
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 200));
    
    span.setAttributes({
      'operation.duration': 200,
      'operation.result': 'success'
    });
    
    span.end();
    this.addLog('✅ Manual span completed');
  }

  async testFunctionTracing() {
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ PepperLog not initialized');
      return;
    }

    try {
      const result = await this.telemetryService.traceFunction(
        'angular.function.test',
        async () => {
          this.addLog('📊 Executing traced function...');
          
          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Some computation
          const data = Array.from({length: 1000}, (_, i) => i * 2);
          return data.reduce((sum, val) => sum + val, 0);
        },
        {
          'function.type': 'computation',
          'data.size': 1000
        }
      );

      this.addLog(\`✅ Function tracing completed. Result: \${result}\`);
    } catch (error) {
      this.addLog(\`❌ Function tracing failed: \${error}\`);
    }
  }

  async testHttpRequest() {
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ PepperLog not initialized');
      return;
    }

    try {
      await this.telemetryService.traceFunction(
        'angular.http.request',
        async () => {
          this.addLog('🌐 Making HTTP request...');
          
          // Use JSONPlaceholder for testing
          const response = await this.http.get('https://jsonplaceholder.typicode.com/posts/1').toPromise();
          return response;
        },
        {
          'http.method': 'GET',
          'http.url': 'https://jsonplaceholder.typicode.com/posts/1',
          'request.type': 'test'
        }
      );

      this.addLog('✅ HTTP request traced successfully');
    } catch (error) {
      this.addLog(\`❌ HTTP request failed: \${error}\`);
    }
  }

  async testErrorTracing() {
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ PepperLog not initialized');
      return;
    }

    try {
      await this.telemetryService.traceFunction(
        'angular.error.test',
        async () => {
          this.addLog('🚨 Triggering test error...');
          await new Promise(resolve => setTimeout(resolve, 100));
          throw new Error('Test error for Angular PepperLog tracing');
        },
        {
          'error.test': true,
          'error.expected': true
        }
      );
    } catch (error) {
      this.addLog(\`✅ Error traced successfully: \${(error as Error).message}\`);
    }
  }

  testMetrics() {
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ PepperLog not initialized');
      return;
    }

    // Create metrics
    const clickCounter = this.telemetryService.createCounter(
      'angular.button.clicks', 
      'Number of button clicks'
    );
    
    const actionDuration = this.telemetryService.createHistogram(
      'angular.action.duration',
      'Duration of user actions'
    );

    // Record metrics
    clickCounter.add(1, { 
      'button.type': 'metrics-test',
      'component': 'AppComponent'
    });

    actionDuration.record(Math.random() * 1000, {
      'action.type': 'metrics-test'
    });

    this.addLog('📈 Metrics recorded successfully');
  }

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.actionLogs.unshift(\`[\${timestamp}] \${message}\`);
    
    // Keep only last 10 logs
    if (this.actionLogs.length > 10) {
      this.actionLogs = this.actionLogs.slice(0, 10);
    }
  }
}
```

### 4. Update app.config.ts

Update `src/app/app.config.ts` to include HTTP client:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
};
```

## 🚀 Running the Test

### Step 1: Start Backend

```bash
# Option A: Jaeger (simpler)
docker run -d --name jaeger -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest

# Option B: SigNoz (more features)
# Follow SigNoz installation instructions
```

### Step 2: Start Angular App

```bash
# In your Angular project directory
ng serve
```

### Step 3: Test the Integration

1. **Open the app**: http://localhost:4200
2. **Check console**: Should see PepperLog initialization logs
3. **Click test buttons**: Each creates different types of traces
4. **View traces**: 
   - Jaeger: http://localhost:16686
   - SigNoz: http://localhost:3301

## 🔍 What to Expect

### In the Browser Console:
```
🚀 Initializing PepperLog...
🌶️ PepperLog initialized in Angular!
🔍 Framework detected: { name: 'angular', confidence: 0.95, source: 'package.json' }
✅ PepperLog ready!
```

### In the Angular App:
- ✅ Status showing "Initialized"
- Buttons for testing different trace types
- Real-time log of actions

### In Jaeger/SigNoz:
- Service: `angular-pepperlog-test`
- Spans: `angular.manual.test`, `angular.function.test`, etc.
- Attributes: Component names, user actions, HTTP details

## 🎯 Advanced Testing

### Test Different Scenarios:

1. **Route Changes**: Add routing and test navigation tracing
2. **HTTP Interceptors**: Test automatic HTTP request tracing
3. **Service Calls**: Test service method tracing
4. **Error Handling**: Test error boundary tracing
5. **Performance**: Test large data operations

### Custom Interceptor (Optional):

Create `src/app/interceptors/telemetry.interceptor.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { TelemetryService } from '../services/telemetry.service';

@Injectable()
export class TelemetryInterceptor implements HttpInterceptor {
  constructor(private telemetry: TelemetryService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    if (!this.telemetry.isInitialized()) {
      return next.handle(req);
    }

    const span = this.telemetry.createSpan('angular.http.request', {
      'http.method': req.method,
      'http.url': req.url,
      'http.intercepted': true
    });

    return next.handle(req).pipe(
      finalize(() => span.end())
    );
  }
}
```

## 🏆 Success Criteria

You'll know PepperLog is working in Angular when you see:

1. ✅ Console logs showing initialization
2. ✅ Framework detected as "angular"
3. ✅ Traces appearing in your backend UI
4. ✅ Spans with Angular-specific attributes
5. ✅ HTTP requests automatically traced
6. ✅ Component lifecycle events traced

This gives you a complete real-world test of PepperLog in an Angular application!