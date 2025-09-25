#!/usr/bin/env pwsh
# PepperLog Angular Test Setup (Standalone Browser Version)
# This script sets up Angular test with the completely standalone browser implementation

param(
    [string]$TestName = "angular-pepperlog-standalone",
    [string]$Backend = "grafana"
)

Write-Host "🌶️  Setting up Angular test for PepperLog (Standalone Browser)" -ForegroundColor Green
Write-Host "============================================================="

# Step 1: Build and link PepperLog
Write-Host "`n📦 Step 1: Building PepperLog..." -ForegroundColor Cyan
if (!(Test-Path "package.json")) {
    Write-Host "❌ Must be run from pepper-log directory!" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

npm link
Write-Host "✅ PepperLog built and linked (using standalone browser version)" -ForegroundColor Green

# Step 2: Create Angular project
Write-Host "`n🅰️  Step 2: Creating Angular project..." -ForegroundColor Cyan
cd ..
npx @angular/cli@latest new $TestName --routing --style=css --skip-git --package-manager=npm
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Angular project creation failed!" -ForegroundColor Red
    exit 1
}

cd $TestName
npm link pepper-log
Write-Host "✅ Angular project created and PepperLog linked" -ForegroundColor Green

# Step 3: Create telemetry service
Write-Host "`n🔧 Step 3: Creating telemetry service..." -ForegroundColor Cyan
$serviceDir = "src/app/services"
New-Item -ItemType Directory -Path $serviceDir -Force | Out-Null

$serviceContent = @"
import { Injectable } from '@angular/core';
import { PepperLog } from 'pepper-log';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private pepperLog: PepperLog | null = null;
  private initialized = false;

  constructor() {
    this.initializePepperLog();
  }

  private async initializePepperLog() {
    try {
      console.log('🔧 Creating PepperLog instance...');
      
      // PepperLog will automatically use standalone browser version
      this.pepperLog = new PepperLog({
        serviceName: 'angular-test-standalone',
        backend: '$Backend',
        config: {
          endpoint: 'http://localhost:4318/v1/traces'
        },
        globalAttributes: {
          'app.framework': 'angular',
          'app.version': '1.0.0',
          'test.type': 'standalone',
          'environment': 'browser'
        },
        features: {
          tracing: true,
          metrics: true,
          logging: true,
          autoInstrumentation: false
        }
      });
      
      console.log('✅ PepperLog instance created successfully');
    } catch (error) {
      console.error('❌ Error creating PepperLog:', error);
      // Continue without throwing - app should still work
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized || !this.pepperLog) return;
    
    try {
      console.log('🚀 Initializing PepperLog...');
      await this.pepperLog.initialize();
      this.initialized = true;
      console.log('✅ PepperLog initialized successfully!');
    } catch (error) {
      console.error('❌ PepperLog initialization failed:', error);
      // Continue without throwing - app should still work
    }
  }

  async traceFunction<T>(name: string, fn: () => Promise<T> | T, attributes?: any): Promise<T> {
    if (!this.pepperLog || !this.pepperLog.traceFunction) {
      console.log(`🌶️ Executing \${name} (no tracing available)`);
      return await Promise.resolve(fn());
    }

    try {
      return await this.pepperLog.traceFunction(name, fn, attributes);
    } catch (error) {
      console.error(`❌ Error in traced function \${name}:`, error);
      return await Promise.resolve(fn());
    }
  }

  createSpan(name: string, attributes?: any) {
    if (!this.pepperLog || !this.pepperLog.createSpan) {
      console.log(`🌶️ Would create span: \${name}`);
      return {
        end: () => console.log(`🌶️ Would end span: \${name}`)
      };
    }

    try {
      return this.pepperLog.createSpan(name, attributes);
    } catch (error) {
      console.error('❌ Error creating span:', error);
      return {
        end: () => {}
      };
    }
  }

  recordMetric(name: string, value: number, attributes?: any) {
    if (!this.pepperLog || !this.pepperLog.createCounter) {
      console.log(`📊 Would record metric: \${name} = \${value}`);
      return;
    }

    try {
      const counter = this.pepperLog.createCounter(name);
      if (counter && counter.add) {
        counter.add(value, attributes);
      }
    } catch (error) {
      console.error('❌ Error recording metric:', error);
    }
  }

  async traceUserAction(action: string, data?: any) {
    return this.traceFunction(`user-\${action}`, async () => {
      console.log(`👤 User action: \${action}`, data);
      await new Promise(resolve => setTimeout(resolve, 50));
      return { action, data, timestamp: Date.now() };
    });
  }

  async traceError(error: Error | string, context?: string) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return this.traceFunction('error-occurred', async () => {
      console.error(`🚨 Error: \${errorMessage}`, { context });
      return { error: errorMessage, context };
    });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      hasInstance: !!this.pepperLog,
      backend: '$Backend'
    };
  }
}
"@

Set-Content -Path "$serviceDir/telemetry.service.ts" -Value $serviceContent
Write-Host "✅ Telemetry service created" -ForegroundColor Green

# Step 4: Update main.ts
Write-Host "`n🔧 Step 4: Updating main.ts..." -ForegroundColor Cyan
$mainContent = @"
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TelemetryService } from './app/services/telemetry.service';

async function initializeApp() {
  console.log('🚀 Starting Angular app with PepperLog standalone...');
  
  // Create telemetry service and initialize
  const telemetryService = new TelemetryService();
  
  try {
    await telemetryService.initialize();
    console.log('✅ PepperLog ready for Angular!');
  } catch (error) {
    console.warn('⚠️ PepperLog initialization failed, continuing without telemetry:', error);
  }

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error('❌ Angular bootstrap failed:', err));
}

initializeApp();
"@

Set-Content -Path "src/main.ts" -Value $mainContent
Write-Host "✅ main.ts updated" -ForegroundColor Green

# Step 5: Update app.component.ts
Write-Host "`n🔧 Step 5: Creating test component..." -ForegroundColor Cyan
$componentContent = @"
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from './services/telemetry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: ``
    <div style="padding: 30px; max-width: 900px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1>🌶️ Angular + PepperLog (Standalone Browser)</h1>
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📊 Status</h3>
        <p><strong>Backend:</strong> $Backend</p>
        <p><strong>Version:</strong> Standalone (Zero Dependencies)</p>
        <p><strong>Status:</strong> 
          <span [style.color]="getStatusColor()">
            {{ getStatusText() }}
          </span>
        </p>
        <p><strong>Details:</strong> {{ getStatusDetails() }}</p>
      </div>

      <div style="margin: 30px 0;">
        <h2>🧪 Standalone Tests</h2>
        
        <button (click)="testSpan()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 280px;">
          🎯 Test Standalone Span
        </button>
        
        <button (click)="testFunction()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #388e3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 280px;">
          ⚡ Test Traced Function
        </button>
        
        <button (click)="testMetrics()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #f57c00; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 280px;">
          📊 Test Metrics
        </button>
        
        <button (click)="testUserAction()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #7b1fa2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 280px;">
          👤 Test User Action
        </button>
        
        <button (click)="testError()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #d32f2f; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 280px;">
          🚨 Test Error Handling
        </button>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <h3>🔍 Check Browser Console</h3>
        <p>Open DevTools (F12) → Console to see PepperLog traces</p>
        <p><strong>Look for:</strong> 🌶️ PepperLog messages showing successful standalone operation</p>
      </div>

      <div style="background: #263238; color: #4caf50; padding: 15px; border-radius: 8px; margin-top: 20px; font-family: 'Courier New', monospace;">
        <h4 style="color: #4caf50; margin-top: 0;">📋 Recent Actions:</h4>
        <div *ngFor="let log of logs" style="margin: 5px 0; line-height: 1.4;">
          {{ log }}
        </div>
      </div>
    </div>
  ``
})
export class AppComponent implements OnInit {
  logs: string[] = [];

  constructor(public telemetryService: TelemetryService) {}

  async ngOnInit() {
    this.addLog('🅰️ Angular component initialized');
    
    // Test component initialization trace
    const span = this.telemetryService.createSpan('component.init', {
      'component': 'AppComponent',
      'lifecycle': 'ngOnInit',
      'test.type': 'standalone'
    });
    
    setTimeout(() => {
      if (span?.end) span.end();
    }, 100);
  }

  async testSpan() {
    this.addLog('🎯 Creating standalone span...');
    
    const span = this.telemetryService.createSpan('test.standalone.span', {
      'action': 'button_click',
      'test.type': 'standalone_span',
      'timestamp': Date.now()
    });

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (span?.end) {
      span.end();
    }
    
    this.addLog('✅ Standalone span test completed');
  }

  async testFunction() {
    this.addLog('⚡ Testing traced function...');
    
    try {
      const result = await this.telemetryService.traceFunction('test.traced.function', async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return 'Function execution successful';
      }, {
        'test.type': 'traced_function',
        'duration.expected': '300ms'
      });
      
      this.addLog(`✅ Traced function completed: \${result}`);
    } catch (error) {
      this.addLog(`❌ Traced function failed: \${error}`);
    }
  }

  testMetrics() {
    this.addLog('📊 Recording metrics...');
    
    this.telemetryService.recordMetric('test.button.clicks', 1, {
      'button': 'metrics_test',
      'component': 'AppComponent'
    });
    
    this.telemetryService.recordMetric('test.page.views', 1, {
      'page': 'home',
      'framework': 'angular'
    });
    
    this.addLog('✅ Metrics recorded successfully');
  }

  async testUserAction() {
    this.addLog('👤 Testing user action...');
    
    try {
      const result = await this.telemetryService.traceUserAction('button_click', {
        'button': 'user_action_test',
        'component': 'AppComponent',
        'timestamp': Date.now()
      });
      
      this.addLog(`✅ User action traced: \${result.action}`);
    } catch (error) {
      this.addLog(`❌ User action failed: \${error}`);
    }
  }

  async testError() {
    this.addLog('🚨 Testing error handling...');
    
    try {
      await this.telemetryService.traceError(
        new Error('This is a test error for standalone demo'),
        'Angular component test'
      );
      
      this.addLog('✅ Error handling test completed');
    } catch (error) {
      this.addLog(`❌ Error handling failed: \${error}`);
    }
  }

  getStatusColor(): string {
    const status = this.telemetryService.getStatus();
    if (status.initialized && status.hasInstance) return 'green';
    if (status.hasInstance) return 'orange';
    return 'red';
  }

  getStatusText(): string {
    const status = this.telemetryService.getStatus();
    if (status.initialized && status.hasInstance) return '✅ Fully Operational';
    if (status.hasInstance) return '🟡 Instance Created';
    return '❌ Not Available';
  }

  getStatusDetails(): string {
    const status = this.telemetryService.getStatus();
    return `Initialized: \${status.initialized}, Instance: \${status.hasInstance}, Backend: \${status.backend}`;
  }

  private addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[\${time}] \${message}`);
    if (this.logs.length > 10) {
      this.logs = this.logs.slice(0, 10);
    }
  }
}
"@

Set-Content -Path "src/app/app.component.ts" -Value $componentContent
Write-Host "✅ Test component created" -ForegroundColor Green

# Final instructions
Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "============================================================="
Write-Host "📁 Project: $TestName" -ForegroundColor Yellow
Write-Host "🔗 Backend: $Backend" -ForegroundColor Yellow
Write-Host "🌟 Version: Standalone Browser (Zero Dependencies)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 To test:" -ForegroundColor Cyan
Write-Host "   ng serve" -ForegroundColor White
Write-Host "   Open: http://localhost:4200" -ForegroundColor White
Write-Host "   Check: Browser DevTools Console for 🌶️ logs" -ForegroundColor White
Write-Host ""
Write-Host "✅ This version uses ZERO external dependencies!" -ForegroundColor Green
Write-Host "✅ No more util.inherits or Node.js compatibility errors!" -ForegroundColor Green
Write-Host "✅ Pure browser-compatible telemetry!" -ForegroundColor Green

# Show current directory
Write-Host "`n📍 You are now in: $(Get-Location)" -ForegroundColor Magenta
Write-Host "`n💡 Run 'ng serve' to start the standalone test!" -ForegroundColor Yellow
Write-Host "💡 This should work without ANY compatibility errors!" -ForegroundColor Yellow