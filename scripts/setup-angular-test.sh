#!/bin/bash
# Quick setup script for testing PepperLog with Angular

echo "🅰️ Setting up Angular PepperLog Test Environment"
echo "================================================"

# Check if we're in the PepperLog directory
if [ ! -f "package.json" ] || [ ! -f "src/index.ts" ]; then
    echo "❌ Please run this script from the pepper-log project directory"
    exit 1
fi

# Step 1: Build and link PepperLog
echo "📦 Building PepperLog..."
npm run build

echo "🔗 Linking PepperLog for local testing..."
npm link

# Step 2: Create Angular test project
echo "🅰️ Creating Angular test project..."
cd ..
npx @angular/cli@latest new angular-pepperlog-test --routing --style=css --skip-git --package-manager=npm

cd angular-pepperlog-test

# Step 3: Link PepperLog and install dependencies
echo "🔗 Linking pepper-log to Angular project..."
npm link pepper-log

echo "📦 Installing additional dependencies..."
npm install --save-dev concurrently wait-on
npm install @angular/common @angular/platform-browser

# Step 4: Start SigNoz for testing
echo "🐳 Starting SigNoz for observability..."
echo "📥 Cloning SigNoz..."
cd ..
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy/
echo "🚀 Starting SigNoz containers..."
docker compose -f docker/clickhouse-setup/docker-compose.yaml up -d
echo "⏳ SigNoz starting up... (takes 2-3 minutes)"
echo "📊 SigNoz will be available at: http://localhost:3301"
echo "📡 OTLP endpoint: http://localhost:4318"
cd ../../angular-pepperlog-test

# Step 5: Create project files
echo "📝 Creating telemetry service..."
ng generate service services/telemetry --skip-tests

# Copy our pre-made files
echo "📋 Setting up test files..."

# Create the telemetry service
cat > src/app/services/telemetry.service.ts << 'EOF'
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
      backend: 'signoz',
      config: {
        endpoint: 'http://localhost:4318/v1/traces',
        // For SigNoz Cloud, use:
        // endpoint: 'https://ingest.{region}.signoz.cloud:443/v1/traces',
        // headers: {
        //   'signoz-access-token': 'your-token-here'
        // }
      },
      globalAttributes: {
        'app.framework': 'angular',
        'app.version': '1.0.0',
        'deployment.environment': 'local-test',
        'telemetry.backend': 'signoz'
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.pepperLog.initialize();
      this.initialized = true;
      console.log('🌶️ PepperLog initialized in Angular!');
      
      const framework = this.pepperLog.getDetectedFramework();
      console.log('🔍 Framework detected:', framework);
      
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

  addAttributes(attributes: Record<string, string | number | boolean>) {
    this.pepperLog.addAttributes(attributes);
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
EOF

# Update main.ts
cat > src/main.ts << 'EOF'
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
    console.warn('⚠️ PepperLog initialization failed, continuing without telemetry:', error);
  }

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}

initializeApp();
EOF

# Update app.config.ts
cat > src/app/app.config.ts << 'EOF'
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
EOF

# Create a simple test component
cat > src/app/app.component.ts << 'EOF'
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TelemetryService } from './services/telemetry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1>🌶️ Angular PepperLog Test</h1>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p>PepperLog Status: 
          <span [style.color]="telemetryService.isInitialized() ? 'green' : 'orange'"
                [style.font-weight]="'bold'">
            {{ telemetryService.isInitialized() ? '✅ Initialized' : '⚠️ Not Initialized' }}
          </span>
        </p>
      </div>

      <div style="margin: 20px 0;">
        <h2>Test Actions</h2>
        
        <button (click)="testManualSpan()" 
                style="display: block; margin: 10px 0; padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; width: 200px;">
          🎯 Create Manual Span
        </button>
        
        <button (click)="testFunctionTracing()" 
                style="display: block; margin: 10px 0; padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; width: 200px;">
          📊 Test Function Tracing
        </button>
        
        <button (click)="testMetrics()" 
                style="display: block; margin: 10px 0; padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; width: 200px;">
          📈 Record Metrics
        </button>
      </div>

      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <h3>Recent Actions:</h3>
        <ul style="list-style-type: none; padding: 0;">
          <li *ngFor="let log of actionLogs" 
              style="padding: 5px 0; border-bottom: 1px solid #ddd;">
            {{ log }}
          </li>
        </ul>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px;">
        <h3>🔍 View Traces</h3>
        <p>Open SigNoz UI: <a href="http://localhost:3301" target="_blank">http://localhost:3301</a></p>
        <p>Look for service: <strong>angular-pepperlog-test</strong></p>
        <p>Note: SigNoz takes 2-3 minutes to fully start up</p>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  actionLogs: string[] = [];

  constructor(public telemetryService: TelemetryService) {}

  ngOnInit() {
    this.addLog('🚀 Angular app started');
    
    if (this.telemetryService.isInitialized()) {
      const span = this.telemetryService.createSpan('angular.component.init', {
        'component.name': 'AppComponent',
        'lifecycle.event': 'ngOnInit'
      });
      setTimeout(() => span.end(), 100);
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
          await new Promise(resolve => setTimeout(resolve, 300));
          const data = Array.from({length: 1000}, (_, i) => i * 2);
          return data.reduce((sum, val) => sum + val, 0);
        },
        {
          'function.type': 'computation',
          'data.size': 1000
        }
      );

      this.addLog(`✅ Function tracing completed. Result: ${result}`);
    } catch (error) {
      this.addLog(`❌ Function tracing failed: ${error}`);
    }
  }

  testMetrics() {
    if (!this.telemetryService.isInitialized()) {
      this.addLog('❌ PepperLog not initialized');
      return;
    }

    const clickCounter = this.telemetryService.createCounter(
      'angular.button.clicks', 
      'Number of button clicks'
    );
    
    const actionDuration = this.telemetryService.createHistogram(
      'angular.action.duration',
      'Duration of user actions'
    );

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
    this.actionLogs.unshift(`[${timestamp}] ${message}`);
    if (this.actionLogs.length > 10) {
      this.actionLogs = this.actionLogs.slice(0, 10);
    }
  }
}
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. cd angular-pepperlog-test"
echo "2. ng serve"
echo "3. Open http://localhost:4200"
echo "4. Open http://localhost:3301 (SigNoz UI)"
echo "5. Wait 2-3 minutes for SigNoz to be ready"
echo ""
echo "Test the buttons in the Angular app and watch traces in SigNoz!"