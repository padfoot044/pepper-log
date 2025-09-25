# 🌶️ Angular + SigNoz Test (Fixed for Browser)

This guide shows how to test PepperLog in Angular with the fixed browser support.

## 🚀 Quick Setup (Works in Browser!)

### Step 1: Prepare PepperLog
```powershell
# In pepper-log directory  
npm run build
npm link
```

### Step 2: Create Angular Test Project
```powershell
cd ..
npx @angular/cli@latest new angular-pepperlog-fixed --routing --style=css --skip-git
cd angular-pepperlog-fixed
npm link pepper-log
```

### Step 3: Create Simple Test Service
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
      serviceName: 'angular-test-fixed',
      backend: 'grafana', // or 'signoz'
      config: {
        endpoint: 'http://localhost:4318/v1/traces' // SigNoz
        // endpoint: 'http://localhost:3200/v1/traces' // Grafana Tempo
      },
      globalAttributes: {
        'app.framework': 'angular',
        'app.version': '1.0.0',
        'test.fixed': true
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.pepperLog.initialize();
      this.initialized = true;
      console.log('🌶️ PepperLog initialized in browser!');
    } catch (error) {
      console.error('❌ PepperLog initialization failed:', error);
    }
  }

  createSpan(name: string, attributes?: any) {
    return this.pepperLog.createSpan(name, attributes);
  }

  async traceFunction<T>(name: string, fn: () => Promise<T> | T, attributes?: any): Promise<T> {
    return this.pepperLog.traceFunction(name, fn, attributes);
  }

  createCounter(name: string, description?: string) {
    return this.pepperLog.createCounter(name, description);
  }

  createHistogram(name: string, description?: string) {
    return this.pepperLog.createHistogram(name, description);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
```

### Step 4: Update main.ts
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './app/services/telemetry.service';

async function initializeApp() {
  console.log('🚀 Starting Angular app with PepperLog...');
  
  const telemetryService = new TelemetryService();
  
  try {
    await telemetryService.initialize();
    console.log('✅ PepperLog ready for browser!');
  } catch (error) {
    console.warn('⚠️ PepperLog initialization failed, continuing without telemetry:', error);
  }

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}

initializeApp();
```

### Step 5: Create Test Component
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from './services/telemetry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 30px; max-width: 900px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1>🌶️ Angular + PepperLog (Browser Fixed)</h1>
      
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📊 Browser Status</h3>
        <p><strong>Platform:</strong> Browser (Fixed)</p>
        <p><strong>Backend:</strong> Grafana/SigNoz</p>
        <p><strong>Status:</strong> 
          <span [style.color]="telemetryService.isInitialized() ? 'green' : 'red'">
            {{ telemetryService.isInitialized() ? '✅ Working!' : '❌ Not Working' }}
          </span>
        </p>
      </div>

      <div style="margin: 30px 0;">
        <h2>🧪 Browser Tests</h2>
        
        <button (click)="testSimpleTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          🎯 Simple Browser Trace
        </button>
        
        <button (click)="testAsyncTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          ⏱️ Async Function Trace
        </button>
        
        <button (click)="testAngularTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          🅰️ Angular Component Trace
        </button>
        
        <button (click)="testMetrics()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #6f42c1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          📈 Browser Metrics
        </button>
        
        <button (click)="testError()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #fd7e14; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          🚨 Error Handling
        </button>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <h3>🔍 Check Browser Console</h3>
        <p>All traces are logged to the browser console since this is the simplified browser version.</p>
        <p><strong>Look for:</strong> 🌶️ PepperLog messages in DevTools</p>
      </div>

      <div style="background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 8px; margin-top: 20px; font-family: 'Courier New', monospace;">
        <h4 style="color: #00ff00; margin-top: 0;">📋 Recent Actions:</h4>
        <div *ngFor="let log of logs" style="margin: 5px 0;">
          {{ log }}
        </div>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  logs: string[] = [];

  constructor(public telemetryService: TelemetryService) {}

  ngOnInit() {
    this.addLog('🅰️ Angular component initialized');
    
    // Test component initialization trace
    const span = this.telemetryService.createSpan('angular.component.init', {
      'component': 'AppComponent',
      'lifecycle': 'ngOnInit',
      'browser': true
    });
    
    if (span) {
      setTimeout(() => span.end(), 100);
    }
  }

  async testSimpleTrace() {
    this.addLog('🎯 Creating simple browser trace...');
    
    const span = this.telemetryService.createSpan('browser.simple.test', {
      'test.type': 'simple',
      'user.action': 'button-click',
      'timestamp': Date.now()
    });

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (span) {
      span.setAttributes({ 'test.result': 'success' });
      span.end();
    }
    
    this.addLog('✅ Simple trace completed');
  }

  async testAsyncTrace() {
    this.addLog('⏱️ Testing async function tracing...');
    
    try {
      const result = await this.telemetryService.traceFunction(
        'browser.async.test',
        async () => {
          this.addLog('📊 Executing async work...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Simulate some computation
          const numbers = Array.from({length: 1000}, (_, i) => i);
          return numbers.reduce((sum, n) => sum + n, 0);
        },
        {
          'operation.type': 'computation',
          'data.size': 1000,
          'browser.test': true
        }
      );
      
      this.addLog(\`✅ Async trace completed: result=\${result}\`);
    } catch (error) {
      this.addLog(\`❌ Async trace failed: \${error}\`);
    }
  }

  async testAngularTrace() {
    this.addLog('🅰️ Testing Angular-specific tracing...');
    
    await this.telemetryService.traceFunction(
      'angular.user.interaction',
      async () => {
        this.addLog('🖱️ Simulating user interaction...');
        
        // Simulate Angular change detection
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simulate data binding update
        this.logs = [...this.logs]; // Trigger change detection
        
        return 'Angular interaction complete';
      },
      {
        'framework': 'angular',
        'interaction.type': 'click',
        'component': 'AppComponent',
        'change.detection': true
      }
    );
    
    this.addLog('✅ Angular trace completed');
  }

  testMetrics() {
    this.addLog('📈 Recording browser metrics...');
    
    // Create and use metrics
    const clickCounter = this.telemetryService.createCounter(
      'browser.button.clicks', 
      'Button clicks in browser'
    );
    
    const actionDuration = this.telemetryService.createHistogram(
      'browser.action.duration',
      'Duration of user actions in browser'
    );

    if (clickCounter) {
      clickCounter.add(1, { 
        'button.type': 'metrics-test',
        'platform': 'browser' 
      });
    }

    if (actionDuration) {
      actionDuration.record(Math.random() * 1000, {
        'action.type': 'metrics-test',
        'browser': true
      });
    }

    // Record page performance
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      this.addLog(\`📊 Page load time: \${loadTime}ms\`);
    }

    this.addLog('✅ Browser metrics recorded');
  }

  async testError() {
    this.addLog('🚨 Testing error handling...');
    
    try {
      await this.telemetryService.traceFunction(
        'browser.error.test',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          throw new Error('Test error from Angular browser app');
        },
        {
          'error.test': true,
          'error.expected': true,
          'platform': 'browser'
        }
      );
    } catch (error) {
      this.addLog(\`✅ Error traced: \${(error as Error).message}\`);
    }
  }

  private addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(\`[\${time}] \${message}\`);
    if (this.logs.length > 10) {
      this.logs = this.logs.slice(0, 10);
    }
  }
}
```

### Step 6: Update app.config.ts (if needed)
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes)
  ]
};
```

## 🎯 Testing Steps

1. **Start Angular**: `ng serve`
2. **Open app**: http://localhost:4200
3. **Open DevTools**: F12 → Console tab
4. **Click test buttons**: Watch console for PepperLog messages
5. **Look for**: 🌶️ PepperLog logs showing traces and spans

## ✅ Expected Results

### In Browser Console:
```
🌶️  PepperLog: Creating browser instance (simplified)
🌶️  PepperLog: Initializing simple telemetry for browser with backend: grafana
🌶️  PepperLog: Detected framework: angular v17.0.0 (confidence: 95%)
🌶️  PepperLog: Simple telemetry initialized!
🌶️  PepperLog Span Started: { name: "angular.component.init", ... }
🌶️  PepperLog Span Ended: { duration: "102ms", ... }
```

### When Clicking Buttons:
- ✅ Spans created and logged
- ✅ Function tracing working
- ✅ Metrics recorded
- ✅ Error handling working
- ✅ No util.inherits errors!

The fixed version uses console logging for browser environments, making it perfect for development and testing while avoiding Node.js compatibility issues.

## 🚀 Run the Full Test

```powershell
# Quick setup
cd pepper-log && npm run build && npm link
cd .. && npx @angular/cli@latest new angular-test --skip-git
cd angular-test && npm link pepper-log
# Copy the code above, then: ng serve
```

This should work without any `util.inherits` errors! 🎉