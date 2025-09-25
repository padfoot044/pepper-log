#!/usr/bin/env pwsh
# PepperLog Angular Test Setup (Fixed Browser Version)
# This script sets up a quick Angular test for the fixed PepperLog implementation

param(
    [string]$TestName = "angular-pepperlog-fixed",
    [string]$Backend = "grafana"
)

Write-Host "🌶️  Setting up Angular test for PepperLog (Browser Fixed)" -ForegroundColor Green
Write-Host "=================================================="

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
Write-Host "✅ PepperLog built and linked" -ForegroundColor Green

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
  private pepperLog: PepperLog;
  private initialized = false;

  constructor() {
    // PepperLog will automatically use browser-compatible version
    this.pepperLog = new PepperLog({
      serviceName: 'angular-test-fixed',
      backend: '$Backend',
      config: {
        endpoint: 'http://localhost:4318/v1/traces' // Default for SigNoz
      },
      globalAttributes: {
        'app.framework': 'angular',
        'app.version': '1.0.0',
        'test.fixed': true,
        'environment': 'browser'
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
      // Continue without throwing to prevent app breakage
    }
  }

  createSpan(name: string, attributes?: any) {
    try {
      return this.pepperLog.createSpan(name, attributes);
    } catch (error) {
      console.error('❌ Error creating span:', error);
      return null;
    }
  }

  async traceFunction<T>(name: string, fn: () => Promise<T> | T, attributes?: any): Promise<T> {
    try {
      return await this.pepperLog.traceFunction(name, fn, attributes);
    } catch (error) {
      console.error('❌ Error in traceFunction:', error);
      // Execute the function without tracing as fallback
      return await Promise.resolve(fn());
    }
  }

  createCounter(name: string, description?: string) {
    try {
      return this.pepperLog.createCounter(name, description);
    } catch (error) {
      console.error('❌ Error creating counter:', error);
      return null;
    }
  }

  createHistogram(name: string, description?: string) {
    try {
      return this.pepperLog.createHistogram(name, description);
    } catch (error) {
      console.error('❌ Error creating histogram:', error);
      return null;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
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
      <h1>🌶️ Angular + PepperLog (Browser Fixed)</h1>
      
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📊 Status</h3>
        <p><strong>Backend:</strong> $Backend</p>
        <p><strong>Status:</strong> 
          <span [style.color]="telemetryService.isInitialized() ? 'green' : 'red'">
            {{ telemetryService.isInitialized() ? '✅ Working!' : '❌ Not Ready' }}
          </span>
        </p>
      </div>

      <div style="margin: 30px 0;">
        <h2>🧪 Tests</h2>
        
        <button (click)="testTrace()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          🎯 Test Browser Trace
        </button>
        
        <button (click)="testAsync()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          ⏱️ Test Async Function
        </button>
        
        <button (click)="testMetrics()" 
                style="display: block; margin: 10px 0; padding: 15px 25px; background: #6f42c1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 250px;">
          📈 Test Metrics
        </button>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <h3>🔍 Check Browser Console</h3>
        <p>Open DevTools (F12) → Console to see PepperLog traces</p>
      </div>

      <div style="background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 8px; margin-top: 20px; font-family: 'Courier New', monospace;">
        <h4 style="color: #00ff00; margin-top: 0;">📋 Recent Actions:</h4>
        <div *ngFor="let log of logs" style="margin: 5px 0;">
          {{ log }}
        </div>
      </div>
    </div>
  ``
})
export class AppComponent implements OnInit {
  logs: string[] = [];

  constructor(public telemetryService: TelemetryService) {}

  ngOnInit() {
    this.addLog('🅰️ Angular component initialized');
  }

  async testTrace() {
    this.addLog('🎯 Creating browser trace...');
    const span = this.telemetryService.createSpan('test.browser.trace');
    await new Promise(resolve => setTimeout(resolve, 100));
    if (span) span.end();
    this.addLog('✅ Trace completed');
  }

  async testAsync() {
    this.addLog('⏱️ Testing async function...');
    try {
      await this.telemetryService.traceFunction('test.async', async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      });
      this.addLog('✅ Async test completed');
    } catch (error) {
      this.addLog('❌ Async test failed');
    }
  }

  testMetrics() {
    this.addLog('📈 Recording metrics...');
    const counter = this.telemetryService.createCounter('test.clicks');
    if (counter) counter.add(1);
    this.addLog('✅ Metrics recorded');
  }

  private addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[`${time}`] `${message}`);
    if (this.logs.length > 8) {
      this.logs = this.logs.slice(0, 8);
    }
  }
}
"@

Set-Content -Path "src/app/app.component.ts" -Value $componentContent
Write-Host "✅ Test component created" -ForegroundColor Green

# Final instructions
Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=================================================="
Write-Host "📁 Project: $TestName" -ForegroundColor Yellow
Write-Host "🔗 Backend: $Backend" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 To test:" -ForegroundColor Cyan
Write-Host "   ng serve" -ForegroundColor White
Write-Host "   Open: http://localhost:4200" -ForegroundColor White
Write-Host "   Check: Browser DevTools Console for 🌶️ logs" -ForegroundColor White
Write-Host ""
Write-Host "✅ This version should work without util.inherits errors!" -ForegroundColor Green

# Show current directory
Write-Host "`n📍 You are now in: $(Get-Location)" -ForegroundColor Magenta
Write-Host "`n💡 Run 'ng serve' to start the test!" -ForegroundColor Yellow
"@

Set-Content -Path "C:\Step2Gen\Projects\pepper-log\scripts\setup-angular-fixed.ps1" -Value $content