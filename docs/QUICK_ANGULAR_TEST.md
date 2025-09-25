# 🚀 Quick Manual Setup - Test PepperLog in Angular

Follow these steps to test PepperLog in a real Angular project locally:

## Step 1: Prepare PepperLog for Local Testing

```powershell
# In your pepper-log directory (C:\Step2Gen\Projects\pepper-log)
npm run build
npm link
```

## Step 2: Create Angular Test Project

```powershell
# Go to parent directory
cd ..

# Create new Angular project
npx @angular/cli@latest new angular-pepperlog-test --routing --style=css --skip-git --package-manager=npm

# Navigate to the project
cd angular-pepperlog-test

# Link PepperLog locally
npm link pepper-log
```

## Step 3: Start Jaeger (Optional but Recommended)

```powershell
# Start Jaeger in Docker for trace visualization
docker run -d --name jaeger-test -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest
```

## Step 4: Create Simple Test Files

### 1. Generate Telemetry Service
```powershell
ng generate service services/telemetry --skip-tests
```

### 2. Update `src/app/services/telemetry.service.ts`:
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
      backend: 'jaeger',
      config: {
        endpoint: 'http://localhost:14268/api/traces'
      },
      globalAttributes: {
        'app.framework': 'angular',
        'app.version': '1.0.0'
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.pepperLog.initialize();
      this.initialized = true;
      console.log('🌶️ PepperLog initialized in Angular!');
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

  isInitialized(): boolean {
    return this.initialized;
  }
}
```

### 3. Update `src/main.ts`:
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './app/services/telemetry.service';

async function initializeApp() {
  const telemetryService = new TelemetryService();
  
  try {
    console.log('🚀 Initializing PepperLog...');
    await telemetryService.initialize();
    console.log('✅ PepperLog ready!');
  } catch (error) {
    console.warn('⚠️ PepperLog failed, continuing without telemetry:', error);
  }

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}

initializeApp();
```

### 4. Update `src/app/app.component.ts`:
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from './services/telemetry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
      <h1>🌶️ Angular PepperLog Test</h1>
      
      <p>Status: 
        <span [style.color]="telemetryService.isInitialized() ? 'green' : 'red'">
          {{ telemetryService.isInitialized() ? '✅ Initialized' : '❌ Not Initialized' }}
        </span>
      </p>

      <button (click)="testTrace()" 
              style="padding: 10px 20px; margin: 10px 0; display: block; background: #007bff; color: white; border: none; border-radius: 5px;">
        🎯 Test Trace
      </button>

      <div style="margin-top: 20px;">
        <h3>Console Logs:</h3>
        <p>Open browser DevTools to see PepperLog initialization logs</p>
        <p>Open Jaeger UI: <a href="http://localhost:16686" target="_blank">http://localhost:16686</a></p>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  constructor(public telemetryService: TelemetryService) {}

  ngOnInit() {
    console.log('🅰️ Angular component initialized');
  }

  async testTrace() {
    if (!this.telemetryService.isInitialized()) {
      console.log('❌ PepperLog not initialized');
      return;
    }

    console.log('🎯 Creating test trace...');
    
    await this.telemetryService.traceFunction(
      'angular.test.action',
      async () => {
        console.log('📊 Executing traced function...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'Test completed!';
      },
      { 'test.type': 'manual', 'component': 'AppComponent' }
    );

    console.log('✅ Test trace completed!');
  }
}
```

## Step 5: Run the Test

```powershell
# Start Angular dev server
ng serve

# Open your browser to:
# - App: http://localhost:4200
# - Jaeger: http://localhost:16686 (if running)
```

## 🔍 What You Should See

### In Browser Console:
```
🚀 Initializing PepperLog...
🌶️ PepperLog initialized in Angular!
✅ PepperLog ready!
🅰️ Angular component initialized
```

### When Clicking "Test Trace":
```
🎯 Creating test trace...
📊 Executing traced function...
✅ Test trace completed!
```

### In Jaeger UI (if running):
- Service: `angular-pepperlog-test`
- Traces with spans: `angular.test.action`
- Attributes showing Angular framework detection

## 🎯 Success Indicators

1. ✅ Console shows PepperLog initialization
2. ✅ No errors in browser console
3. ✅ Status shows "Initialized" 
4. ✅ Test button creates traces without errors
5. ✅ Jaeger shows traces (if running)

## 🔧 Troubleshooting

**If PepperLog doesn't initialize:**
- Check `npm link pepper-log` worked
- Verify PepperLog was built: `npm run build` in pepper-log directory
- Check browser console for errors

**If Jaeger doesn't show traces:**
- Verify Jaeger is running: `docker ps`
- Check endpoint in telemetry service matches Jaeger port

**If Angular compilation fails:**
- Make sure Angular CLI is latest: `npm install -g @angular/cli@latest`
- Try `ng update` in the Angular project

This gives you a working Angular app with PepperLog integration that you can expand and test further!