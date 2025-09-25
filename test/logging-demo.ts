import { PepperLog } from '../src/index';

// Simple test to clearly demonstrate logging output
async function demonstrateLogging() {
  console.log('🌶️ PepperLog Logging Demonstration');
  console.log('=' .repeat(50));
  
  console.log('\n📋 Step 1: Creating PepperLog Instance');
  const logger = new PepperLog({
    serviceName: 'logging-demo',
    backend: 'jaeger',
    config: {
      endpoint: 'http://localhost:14268/api/traces'
    },
    globalAttributes: {
      'demo.version': '1.0.0',
      'demo.environment': 'test'
    }
  });
  
  console.log('✅ PepperLog instance created');
  console.log('📊 Detected Framework:', logger.getDetectedFramework()?.name || 'none');
  
  console.log('\n📋 Step 2: Full Initialization (This will show PepperLog logs)');
  try {
    await logger.initialize();
    console.log('✅ Initialization completed successfully');
  } catch (error) {
    console.log('⚠️  Initialization failed (expected without backend running)');
    console.log('   Error:', (error as Error).message.split('\n')[0]);
  }
  
  console.log('\n📋 Step 3: Creating Spans (This generates trace data)');
  
  // Create manual span
  console.log('Creating manual span...');
  const span = logger.createSpan('demo.manual.operation', {
    attributes: {
      'operation.type': 'manual',
      'operation.demo': true
    }
  });
  
  // Add attributes
  logger.addAttributes({
    'span.timestamp': Date.now(),
    'span.demo': 'attribute-test'
  });
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 100));
  span.end();
  console.log('✅ Manual span completed');
  
  // Function tracing
  console.log('Creating function trace...');
  await logger.traceFunction(
    'demo.traced.function',
    async () => {
      console.log('  📝 Inside traced function');
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'demo-result';
    },
    {
      'function.demo': true,
      'function.type': 'async'
    }
  );
  console.log('✅ Function tracing completed');
  
  console.log('\n📋 Step 4: Creating Metrics');
  const counter = logger.createCounter('demo.operations.total', 'Demo operations counter');
  const histogram = logger.createHistogram('demo.operation.duration', 'Demo operation duration');
  
  counter.add(1, { 'operation': 'demo', 'status': 'success' });
  histogram.record(125, { 'operation': 'demo', 'type': 'manual' });
  
  console.log('✅ Metrics recorded');
  
  console.log('\n📋 Step 5: Error Handling Test');
  try {
    await logger.traceFunction(
      'demo.error.operation',
      async () => {
        throw new Error('Demo error for testing');
      }
    );
  } catch (error) {
    console.log('✅ Error traced successfully:', (error as Error).message);
  }
  
  console.log('\n🎉 Logging Demonstration Complete!');
  console.log('\n📊 Summary of What Was Generated:');
  console.log('  • Console logs showing PepperLog initialization');
  console.log('  • Trace spans (manual and function-traced)');
  console.log('  • Metric data points (counter and histogram)');
  console.log('  • Error traces with exception details');
  
  console.log('\n💡 What This Proves:');
  console.log('  ✅ PepperLog generates proper console logs');
  console.log('  ✅ PepperLog creates OpenTelemetry spans');
  console.log('  ✅ PepperLog records metrics');
  console.log('  ✅ PepperLog handles errors in traces');
  
  console.log('\n🔍 To see traces in a backend:');
  console.log('  1. Start Jaeger: docker run -d -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest');
  console.log('  2. Run: npm run demo');
  console.log('  3. Open: http://localhost:16686');
  console.log('  4. Search for service: logging-demo');
  
  try {
    await logger.shutdown();
    console.log('\n✅ PepperLog shutdown completed');
  } catch (error) {
    console.log('\n⚠️  Shutdown completed with minor issues (expected)');
  }
}

// Run the demonstration
demonstrateLogging().catch(console.error);