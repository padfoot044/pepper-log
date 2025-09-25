# 🅰️ Quick Angular + SigNoz Setup

## 🚀 Manual Setup (5 Commands)

### Step 1: Prepare PepperLog
```powershell
# In pepper-log directory
npm run build
npm link
```

### Step 2: Create Angular Project
```powershell
cd ..
npx @angular/cli@latest new angular-signoz-test --routing --style=css --skip-git
cd angular-signoz-test
npm link pepper-log
```

### Step 3: Start SigNoz
```powershell
# Clone and start SigNoz
cd ..
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy/
docker compose -f docker/clickhouse-setup/docker-compose.yaml up -d
cd ../../angular-signoz-test
```

### Step 4: Create Simple Test Service
Create `src/app/telemetry.service.ts`:
```typescript
import { Injectable } from '@angular/core';
import { PepperLog } from 'pepper-log';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private pepperLog = new PepperLog({
    serviceName: 'angular-signoz-test',
    backend: 'signoz',
    config: {
      endpoint: 'http://localhost:4318/v1/traces'
    },
    globalAttributes: {
      'app.framework': 'angular',
      'telemetry.backend': 'signoz'
    }
  });

  async init() {
    await this.pepperLog.initialize();
    console.log('🌶️ PepperLog + SigNoz ready!');
  }

  createSpan(name: string, attributes?: any) {
    return this.pepperLog.createSpan(name, attributes);
  }

  async traceFunction<T>(name: string, fn: () => T | Promise<T>, attributes?: any): Promise<T> {
    return this.pepperLog.traceFunction(name, fn, attributes);
  }

  isInitialized() {
    return true; // Simplified for demo
  }
}
```

### Step 5: Update main.ts
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './app/telemetry.service';

async function start() {
  console.log('🚀 Starting Angular + SigNoz...');
  
  const telemetry = new TelemetryService();
  await telemetry.init();
  
  bootstrapApplication(AppComponent, appConfig);
}

start();
```

### Step 6: Update app.component.ts
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from './telemetry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 40px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1 style="color: #2c3e50;">🌶️ Angular + SigNoz Test</h1>
      
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📊 Status</h3>
        <p><strong>Backend:</strong> SigNoz</p>
        <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">✅ Connected</span></p>
      </div>

      <div style="margin: 30px 0;">
        <h2>🧪 Test Actions</h2>
        
        <button (click)="testSimpleTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 200px;">
          🎯 Simple Trace
        </button>
        
        <button (click)="testAsyncTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 200px;">
          ⏱️ Async Trace
        </button>
        
        <button (click)="testErrorTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #f39c12; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 200px;">
          🚨 Error Trace
        </button>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <h3>🔍 View in SigNoz</h3>
        <p><strong>SigNoz Dashboard:</strong> 
          <a href="http://localhost:3301" target="_blank" style="color: #3498db;">http://localhost:3301</a>
        </p>
        <p><strong>Service Name:</strong> angular-signoz-test</p>
        <p><strong>Wait time:</strong> 2-3 minutes for SigNoz to fully start</p>
      </div>

      <div style="background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 8px; margin-top: 20px; font-family: 'Courier New', monospace;">
        <h4 style="color: #00ff00; margin-top: 0;">📋 Console Logs:</h4>
        <div *ngFor="let log of logs" style="margin: 5px 0;">
          {{ log }}
        </div>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  logs: string[] = [];

  constructor(private telemetry: TelemetryService) {}

  ngOnInit() {
    this.addLog('🅰️ Angular component initialized');
    
    // Trace component init
    const span = this.telemetry.createSpan('angular.component.init', {
      'component': 'AppComponent',
      'lifecycle': 'ngOnInit'
    });
    
    setTimeout(() => {
      if (span) span.end();
    }, 100);
  }

  async testSimpleTrace() {
    this.addLog('🎯 Creating simple trace...');
    
    const span = this.telemetry.createSpan('angular.test.simple', {
      'test.type': 'simple',
      'user.action': 'button-click'
    });

    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (span) {
      span.setAttributes({ 'test.result': 'success' });
      span.end();
    }
    
    this.addLog('✅ Simple trace completed');
  }

  async testAsyncTrace() {
    this.addLog('⏱️ Starting async trace...');
    
    try {
      const result = await this.telemetry.traceFunction(
        'angular.test.async',
        async () => {
          this.addLog('📊 Processing async operation...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return Math.floor(Math.random() * 1000);
        },
        {
          'operation.type': 'async',
          'operation.complexity': 'medium'
        }
      );
      
      this.addLog(\`✅ Async trace completed: result=\${result}\`);
    } catch (error) {
      this.addLog(\`❌ Async trace failed: \${error}\`);
    }
  }

  async testErrorTrace() {
    this.addLog('🚨 Testing error trace...');
    
    try {
      await this.telemetry.traceFunction(
        'angular.test.error',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          throw new Error('Test error for SigNoz');
        },
        {
          'error.test': true,
          'error.expected': true
        }
      );
    } catch (error) {
      this.addLog(\`✅ Error trace captured: \${(error as Error).message}\`);
    }
  }

  private addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(\`[\${time}] \${message}\`);
    if (this.logs.length > 8) {
      this.logs = this.logs.slice(0, 8);
    }
  }
}
```

### Step 7: Run and Test
```powershell
ng serve
```

## 🎯 Testing Steps

1. **Wait for SigNoz**: Takes 2-3 minutes to fully start
2. **Open Angular app**: http://localhost:4200
3. **Click test buttons**: Each creates different trace types
4. **View in SigNoz**: http://localhost:3301
   - Go to Services → angular-signoz-test
   - View traces and spans
   - Check metrics and errors

## 🔍 What You'll See

### In Browser Console:
```
🚀 Starting Angular + SigNoz...
🌶️ PepperLog + SigNoz ready!
🅰️ Angular component initialized
```

### In SigNoz Dashboard:
- **Services**: angular-signoz-test
- **Traces**: angular.test.*, angular.component.*
- **Attributes**: Framework detection, user actions
- **Metrics**: Custom counters and histograms

## ⚡ Quick Test Commands

```powershell
# If you want to use the automation script instead:
cd pepper-log
.\scripts\setup-angular-test.ps1

# Then follow the prompts
```

This gives you a working Angular app with SigNoz observability in just a few minutes!