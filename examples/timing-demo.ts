// Example demonstrating the new automatic timing/duration logging feature
import { PepperLog } from '../src/browser-enhanced';
import { LogLevel } from '../src/logging/types';

async function demonstrateTimingFeatures() {
  // Initialize PepperLog with logging enabled
  const pepperLog = new PepperLog({
    serviceName: 'timing-demo-app',
    backend: 'signoz', // Required backend config
    logging: {
      enabled: true,
      level: LogLevel.INFO,
      consoleOutput: true,
      enableCorrelation: true
    }
  });

  await pepperLog.initialize();

  console.log('🌶️ PepperLog Timing Features Demo\n');

  // Example 1: Manual Timer Management
  console.log('📋 Example 1: Manual Timer Management');
  const dataProcessingTimer = pepperLog.startTimer('data-processing', {
    'process.type': 'user_data',
    'process.batch_size': 1000
  });

  // Simulate some processing work
  await new Promise(resolve => setTimeout(resolve, 150));

  // Add context during processing
  dataProcessingTimer.addContext({
    'process.records_processed': 750,
    'process.errors': 0
  });

  // Complete the timer
  dataProcessingTimer.end({
    'process.status': 'completed',
    'process.optimization_applied': true
  });

  // Example 2: Async Function Timing
  console.log('\n📋 Example 2: Async Function Timing');
  
  const result = await pepperLog.timeAsync('api-call', async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));
    return { data: 'User profile data', userId: '12345' };
  }, {
    'api.endpoint': '/users/profile',
    'api.method': 'GET',
    'api.timeout': 5000
  });

  console.log('API Result:', result);

  // Example 3: Sync Function Timing
  console.log('\n📋 Example 3: Sync Function Timing');
  
  const calculationResult = pepperLog.timeSync('complex-calculation', () => {
    // Simulate complex calculation
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }, {
    'calculation.type': 'mathematical',
    'calculation.iterations': 1000000
  });

  console.log('Calculation Result:', calculationResult);

  // Example 4: Error Handling in Timed Operations
  console.log('\n📋 Example 4: Error Handling in Timed Operations');
  
  try {
    await pepperLog.timeAsync('failing-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new Error('Simulated API timeout');
    }, {
      'operation.type': 'external_api',
      'operation.retries': 3
    });
  } catch (error) {
    console.log('Caught expected error:', (error as Error).message);
  }

  // Example 5: Nested Timing with Context
  console.log('\n📋 Example 5: Nested Timing with Context');
  
  const contextLogger = pepperLog.withContext({
    'user.id': '12345',
    'session.id': 'sess-abc-789'
  });

  await contextLogger.timeAsync('user-checkout-process', async () => {
    // Step 1: Validation
    const validationTimer = contextLogger.startTimer('checkout-validation', {
      'checkout.step': 'validation'
    });
    await new Promise(resolve => setTimeout(resolve, 80));
    validationTimer.end({ 'validation.items': 3, 'validation.passed': true });

    // Step 2: Payment processing
    await contextLogger.timeAsync('payment-processing', async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { paymentId: 'pay-xyz-456', amount: 99.99 };
    }, {
      'checkout.step': 'payment',
      'payment.method': 'credit_card'
    });

    // Step 3: Order confirmation
    const confirmationTimer = contextLogger.startTimer('order-confirmation');
    await new Promise(resolve => setTimeout(resolve, 50));
    confirmationTimer.end({ 'order.id': 'ord-123', 'email.sent': true });

    return { orderId: 'ord-123', total: 99.99 };
  }, {
    'checkout.type': 'express',
    'checkout.currency': 'USD'
  });

  // Example 6: Multiple Concurrent Timers
  console.log('\n📋 Example 6: Multiple Concurrent Timers');
  
  const timer1 = pepperLog.startTimer('background-task-1', { task: 'data-sync' });
  const timer2 = pepperLog.startTimer('background-task-2', { task: 'cache-cleanup' });
  const timer3 = pepperLog.startTimer('background-task-3', { task: 'log-aggregation' });

  console.log(`Active timers: ${pepperLog.getActiveTimers().length}`);

  // Simulate tasks completing at different times
  setTimeout(() => timer1.end({ records: 150 }), 100);
  setTimeout(() => timer2.end({ cache_size: '50MB' }), 200);
  setTimeout(() => timer3.end({ logs_processed: 2500 }), 150);

  // Wait for all to complete
  await new Promise(resolve => setTimeout(resolve, 250));
  
  console.log(`Active timers after completion: ${pepperLog.getActiveTimers().length}`);

  // Example 7: Timer Cancellation
  console.log('\n📋 Example 7: Timer Cancellation');
  
  const cancelledTimer = pepperLog.startTimer('potentially-long-operation', {
    'operation.timeout': 5000
  });

  // Simulate a condition that requires cancellation
  setTimeout(() => {
    console.log('Cancelling timer due to external condition...');
    cancelledTimer.cancel();
  }, 75);

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n✅ Timing Features Demo Complete!');
  console.log('Check the console logs above to see the automatic duration logging in action.');
  
  // Cleanup
  pepperLog.cleanupTimers();
  await pepperLog.shutdown();
}

// Auto-run demonstration
if (typeof window !== 'undefined') {
  // Browser environment
  demonstrateTimingFeatures().catch(console.error);
} else if (typeof process !== 'undefined') {
  // Node.js environment
  demonstrateTimingFeatures().catch(console.error);
}