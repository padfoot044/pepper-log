// Test the real browser OTLP implementation
import { PepperLog } from '../src/browser-real';

// Mock Grafana Tempo endpoint for testing
const GRAFANA_ENDPOINT = 'http://localhost:4318/v1/traces';

async function testBrowserOTLP() {
  console.log('='.repeat(50));
  console.log('🧪 Testing Browser OTLP Implementation');
  console.log('='.repeat(50));

  // Test configuration matching the user's setup
  const pepperLog = new PepperLog({
    serviceName: 'test-logger-angular-app',
    backend: 'grafana',
    config: {
      endpoint: 'http://localhost:4318/v1/traces',
      batchConfig: {
        maxExportBatchSize: 100,
        exportTimeoutMillis: 5000,
        scheduledDelayMillis: 1000,
      }
    },
    environment: 'development',
    features: {
      tracing: true,
      metrics: true,
      logging: true,
      autoInstrumentation: true
    },
    globalAttributes: {
      'app.version': '1.0.0',
      'app.environment': 'development'
    }
  });

  console.log('\n📋 Step 1: Initialize PepperLog');
  await pepperLog.initialize();

  console.log('\n📋 Step 2: Test framework detection');
  const framework = pepperLog.getDetectedFramework();
  console.log('Detected framework:', framework);

  console.log('\n📋 Step 3: Test configuration');
  const config = pepperLog.getConfig();
  console.log('Configuration:', {
    serviceName: config.serviceName,
    backend: config.backend,
    endpoint: config.config?.endpoint
  });

  console.log('\n📋 Step 4: Test manual span creation');
  const span1 = pepperLog.createSpan('test-manual-span', {
    'test.type': 'manual',
    'test.number': 42
  });
  span1.addEvent('Test event', { 'event.data': 'test-data' });
  span1.setAttributes({ 'additional.attr': 'added-later' });
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));
  span1.end();

  console.log('\n📋 Step 5: Test traceFunction method');
  const result = await pepperLog.traceFunction('user-app-startup', async () => {
    console.log('Simulating app startup work...');
    await new Promise(resolve => setTimeout(resolve, 150));
    return { action: 'app-startup', timestamp: Date.now() };
  }, { 'startup.phase': 'initial' });

  console.log('Function result:', result);

  console.log('\n📋 Step 6: Test traceFunction with user action');
  await pepperLog.traceFunction('user-button-click', async () => {
    console.log('Simulating button click handling...');
    await new Promise(resolve => setTimeout(resolve, 50));
    return { action: 'button-click', data: { buttonId: 'test-btn' }, timestamp: Date.now() };
  }, { 'ui.component': 'button', 'ui.action': 'click' });

  console.log('\n📋 Step 7: Test error handling');
  try {
    await pepperLog.traceFunction('user-error-action', async () => {
      throw new Error('Simulated error for testing');
    });
  } catch (error) {
    console.log('Expected error caught:', (error as Error).message);
  }

  console.log('\n📋 Step 8: Test logging methods');
  pepperLog.info('Test info log message', { 'log.context': 'test' });
  pepperLog.warn('Test warning message', { 'warning.type': 'test' });
  pepperLog.error('Test error message', new Error('Test error'), { 'error.context': 'test' });

  console.log('\n📋 Step 9: Wait for batch export');
  console.log('Waiting 6 seconds for spans to be sent...');
  await new Promise(resolve => setTimeout(resolve, 6000));

  console.log('\n📋 Step 10: Shutdown');
  await pepperLog.shutdown();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Test completed!');
  console.log('='.repeat(50));
  console.log('\n📊 What should have happened:');
  console.log('1. ✅ PepperLog initialized successfully');
  console.log('2. ✅ Framework detected (or unknown in Node.js)');
  console.log('3. ✅ Several spans created and logged to console');
  console.log('4. 🌐 HTTP POST requests sent to http://localhost:4318/v1/traces');
  console.log('5. 📊 Traces should appear in Grafana Tempo');
  console.log('\n💡 Check browser DevTools Network tab for HTTP requests!');
  console.log('💡 Check Grafana Tempo for traces with service name: test-logger-angular-app');
}

// Run the test
if (typeof window !== 'undefined') {
  // Browser environment
  testBrowserOTLP().catch(console.error);
} else {
  // Node.js environment - just log
  console.log('This test is designed to run in a browser environment.');
  console.log('Please run this in a browser to see the network requests.');
}