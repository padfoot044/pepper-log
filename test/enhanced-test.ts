// Comprehensive test for PepperLog v2.0.0 - Traces AND Logs
import { PepperLog } from '../src/browser-enhanced';
import { LogLevel } from '../src/logging/types';

async function testEnhancedPepperLog() {
  console.log('='.repeat(60));
  console.log('🧪 Testing PepperLog v2.0.0 - Enhanced with Traces AND Logs');
  console.log('='.repeat(60));

  // Configuration with both traces and logs endpoints
  const pepperLog = new PepperLog({
    serviceName: 'test-enhanced-app',
    backend: 'signoz', // or 'grafana'
    config: {
      endpoint: 'http://localhost:4318/v1/traces',        // Traces endpoint
      logsEndpoint: 'http://localhost:4318/v1/logs',      // Logs endpoint
      batchConfig: {
        maxExportBatchSize: 50,  // Smaller for faster testing
        exportTimeoutMillis: 3000,
        scheduledDelayMillis: 500,
      }
    },
    environment: 'test',
    features: {
      tracing: true,
      metrics: true,
      logging: true,
      autoInstrumentation: true
    },
    // Logging configuration
    logging: {
      enabled: true,
      level: LogLevel.DEBUG,
      enableCorrelation: true,
      consoleOutput: true,
      localStorageKey: 'pepper-logs', // Save logs locally in browser
      maxLocalLogs: 1000
    },
    globalAttributes: {
      'app.version': '2.0.0',
      'app.environment': 'test',
      'test.suite': 'comprehensive'
    }
  });

  console.log('\n📋 Step 1: Initialize PepperLog v2.0.0');
  await pepperLog.initialize();

  console.log('\n📋 Step 2: Test framework detection');
  const framework = pepperLog.getDetectedFramework();
  console.log('Detected framework:', framework);

  console.log('\n📋 Step 3: Test configuration');
  const config = pepperLog.getConfig();
  const loggingConfig = pepperLog.getLoggingConfig();
  console.log('Configuration:', {
    serviceName: config.serviceName,
    backend: config.backend,
    tracesEndpoint: config.config?.endpoint,
    logsEndpoint: config.config?.logsEndpoint,
    loggingEnabled: pepperLog.isLoggingEnabled(),
    tracingEnabled: pepperLog.isTracingEnabled()
  });

  console.log('\n📋 Step 4: Test STRUCTURED LOGGING (new in v2.0.0)');
  console.log('These should appear in "Logs" section of your observability backend:');
  
  // Basic logging
  pepperLog.debug('Debug message for testing', { 'log.type': 'debug', 'test.step': 4 });
  pepperLog.info('Application started successfully', { 'startup.phase': 'complete', 'user.count': 150 });
  pepperLog.warn('Memory usage is getting high', { 'memory.usage_mb': 512, 'memory.limit_mb': 1024 });
  
  // Error logging with exception
  try {
    throw new Error('Simulated error for testing');
  } catch (error) {
    pepperLog.error('Application error occurred', error as Error, { 
      'error.category': 'business_logic',
      'error.severity': 'high',
      'user.id': '12345'
    });
  }

  // Fatal error
  pepperLog.fatal('Critical system failure', new Error('Database connection lost'), {
    'system.component': 'database',
    'system.action': 'reconnect'
  });

  console.log('\n📋 Step 5: Test TRACING (existing functionality)');
  console.log('These should appear in "Traces" section of your observability backend:');

  // Simple span
  const span1 = pepperLog.createSpan('manual-operation', {
    'operation.type': 'manual',
    'operation.priority': 'high'
  });
  span1.addEvent('Operation started', { 'event.timestamp': Date.now() });
  await new Promise(resolve => setTimeout(resolve, 100));
  span1.addEvent('Operation progress', { 'progress.percent': 50 });
  span1.setAttributes({ 'operation.result': 'success' });
  span1.end();

  console.log('\n📋 Step 6: Test TRACE-LOG CORRELATION (key new feature!)');
  console.log('Logs inside traced functions should be correlated with trace/span IDs:');

  await pepperLog.traceFunction('user-checkout-process', async () => {
    // These logs should automatically have trace/span IDs for correlation
    pepperLog.info('Checkout process started', { 'checkout.step': 'validation', 'cart.items': 3 });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    pepperLog.info('Payment validation complete', { 'checkout.step': 'payment', 'amount': 99.99 });
    
    await new Promise(resolve => setTimeout(resolve, 30));
    pepperLog.info('Order confirmation sent', { 'checkout.step': 'confirmation', 'order.id': 'ORD-12345' });
    
    return { orderId: 'ORD-12345', total: 99.99 };
  }, { 
    'trace.category': 'business_critical',
    'user.id': '12345',
    'user.session': 'session-abc-123'
  });

  console.log('\n📋 Step 7: Test nested tracing with correlated logging');
  
  await pepperLog.traceFunction('complex-business-operation', async () => {
    pepperLog.info('Starting complex operation', { 'operation.complexity': 'high' });
    
    // Nested span 1
    await pepperLog.traceFunction('database-query', async () => {
      pepperLog.debug('Executing database query', { 'db.table': 'users', 'db.operation': 'SELECT' });
      await new Promise(resolve => setTimeout(resolve, 80));
      pepperLog.info('Database query completed', { 'db.rows_affected': 15 });
      return { users: 15 };
    }, { 'db.type': 'postgresql', 'db.query': 'user_lookup' });

    // Nested span 2 with error
    try {
      await pepperLog.traceFunction('external-api-call', async () => {
        pepperLog.info('Calling external API', { 'api.endpoint': '/users/profile', 'api.timeout': 5000 });
        await new Promise(resolve => setTimeout(resolve, 60));
        throw new Error('API timeout - simulated');
      }, { 'api.service': 'user-service', 'api.version': 'v2' });
    } catch (error) {
      pepperLog.error('External API call failed', error as Error, { 
        'error.recovery': 'retry_scheduled',
        'error.impact': 'user_experience'
      });
    }

    pepperLog.info('Complex operation completed with partial success', { 'operation.status': 'partial_success' });
    return { status: 'partial_success', errors: 1 };
  }, { 'business.priority': 'critical' });

  console.log('\n📋 Step 8: Test contextual logging');
  
  const contextualLogger = pepperLog.withContext({
    'user.id': '67890',
    'user.role': 'admin',
    'session.id': 'sess-xyz-789'
  });

  // These logs will automatically include the context attributes
  contextualLogger.info('Admin action performed', { 'action.type': 'user_promotion' });
  contextualLogger.warn('Admin privilege used', { 'privilege.type': 'delete_user', 'target.user': '12345' });

  console.log('\n📋 Step 9: Test performance logging');
  
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 200));
  const duration = Date.now() - startTime;
  
  pepperLog.logDuration('performance-test-operation', duration, {
    'performance.threshold_ms': 150,
    'performance.status': duration > 150 ? 'slow' : 'fast',
    'performance.category': 'user_interaction'
  });

  console.log('\n📋 Step 10: Test exception logging');
  
  try {
    JSON.parse('invalid json {');
  } catch (error) {
    pepperLog.logException(error as Error, 'JSON parsing failed', {
      includeStackTrace: true,
      customAttributes: {
        'input.source': 'user_upload',
        'input.size': 25,
        'parsing.strategy': 'strict'
      }
    });
  }

  console.log('\n📋 Step 11: Wait for batch exports');
  console.log('Waiting 5 seconds for traces and logs to be sent...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n📋 Step 12: Check correlation info');
  const correlationInfo = pepperLog.getCorrelationInfo();
  console.log('Correlation status:', correlationInfo);

  console.log('\n📋 Step 13: Flush and shutdown');
  await pepperLog.shutdown();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 PepperLog v2.0.0 Test Completed!');
  console.log('='.repeat(60));
  console.log('\n📊 What should have happened:');
  console.log('✅ TRACES: HTTP POST requests to http://localhost:4318/v1/traces');
  console.log('✅ LOGS: HTTP POST requests to http://localhost:4318/v1/logs');
  console.log('✅ CORRELATION: Logs inside traced functions have trace/span IDs');
  console.log('✅ SEPARATE SECTIONS: Traces appear in "Traces", Logs in "Logs"');
  console.log('✅ STRUCTURED DATA: All logs have proper attributes and levels');
  console.log('\n💡 Check your observability backend:');
  console.log('• SigNoz: Go to Services → test-enhanced-app → Traces & Logs tabs');
  console.log('• Grafana: Check both Tempo (traces) and Loki (logs) data sources');
  console.log('• Browser DevTools: Network tab should show POST requests to both endpoints');
  console.log('\n🔗 Click from trace to logs and vice versa to see correlation!');
}

// Auto-run in browser
if (typeof window !== 'undefined') {
  testEnhancedPepperLog().catch(console.error);
} else {
  console.log('This test is designed to run in a browser environment.');
  console.log('Open in browser to see the enhanced traces and logs functionality.');
}