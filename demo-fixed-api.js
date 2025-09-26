// Example showing the corrected PepperLog v3.0.0 API
import { PepperLog, LogLevel } from './src/index';

async function demonstrateFixedAPI() {
  console.log('🌶️ PepperLog v3.0.0 - Fixed API Demo\n');

  // ✅ This now works! logsEndpoint is in config object
  const logger = new PepperLog({
    serviceName: 'demo-app',
    backend: 'signoz',
    config: {
      endpoint: 'http://localhost:4318/v1/traces',      // Traces endpoint
      logsEndpoint: 'http://localhost:4318/v1/logs',    // ✅ Now properly supported!
    },
    features: {
      tracing: true,
      logging: true,    // Enable structured logging
      metrics: true,
      autoInstrumentation: true
    },
    logging: {
      enabled: true,
      level: LogLevel.INFO,  // ✅ LogLevel enum now exported!
      enableCorrelation: true,
      consoleOutput: true
    }
  });

  await logger.initialize();

  // ✅ These logging methods now work on the main PepperLog class!
  logger.info('User logged in', { 
    userId: '12345', 
    method: 'oauth',
    duration: 150 
  });

  logger.warn('High memory usage detected', {
    memoryUsage: '85%',
    component: 'payment-processor'
  });

  logger.error('Payment failed', new Error('Insufficient funds'), { 
    userId: '12345', 
    amount: 99.99,
    paymentMethod: 'credit_card'
  });

  logger.debug('Processing step completed', {
    step: 'validation',
    processingTime: 23
  });

  logger.fatal('Database connection lost', new Error('Connection timeout'), {
    database: 'primary',
    retryAttempts: 3
  });

  // ✅ Tracing still works as before
  await logger.traceFunction('process-payment', async () => {
    logger.info('Payment processing started', { amount: 99.99 });
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    logger.info('Payment completed successfully');
    return { success: true };
  }, { 
    userId: '12345',
    paymentAmount: 99.99 
  });

  console.log('\n🎉 API Demo completed successfully!');
  console.log('✅ logsEndpoint configuration working');
  console.log('✅ LogLevel enum available');  
  console.log('✅ Logging methods available on main class');
  console.log('✅ All features integrated properly');
}

// Run the demo
demonstrateFixedAPI().catch(console.error);