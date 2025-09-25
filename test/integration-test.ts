import { PepperLog } from '../src/index';

// Test actual initialization and trace generation
async function testActualLogging() {
  console.log('🌶️ Testing Actual Logging and Tracing...');
  console.log('Note: This requires a running backend (Jaeger/SigNoz) to see actual traces\n');

  // Test 1: Basic initialization
  console.log('📋 Test 1: Basic Initialization');
  const logger = new PepperLog({
    serviceName: 'pepper-log-integration-test',
    backend: 'jaeger',
    config: {
      endpoint: 'http://localhost:14268/api/traces'
    },
    globalAttributes: {
      'test.suite': 'integration',
      'test.timestamp': Date.now().toString()
    }
  });

  console.log('✅ PepperLog instance created');
  console.log('Configuration:', {
    serviceName: logger.getConfig().serviceName,
    backend: logger.getConfig().backend,
    framework: logger.getDetectedFramework()?.name || 'none'
  });

  // Test 2: Manual span creation (without full initialization)
  console.log('\n📊 Test 2: Manual Span Creation');
  try {
    const span = logger.createSpan('test.manual.span', {
      attributes: {
        'test.type': 'manual',
        'test.timestamp': Date.now()
      }
    });

    console.log('✅ Manual span created');
    
    // Add some attributes
    logger.addAttributes({
      'test.operation': 'span-test',
      'test.result': 'success'
    });

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    span.end();
    console.log('✅ Span completed');
  } catch (error) {
    console.error('❌ Manual span creation failed:', error);
  }

  // Test 3: Function tracing
  console.log('\n🎯 Test 3: Function Tracing');
  try {
    const result = await logger.traceFunction(
      'test.async.operation',
      async () => {
        console.log('  📝 Executing traced function...');
        
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Add some nested operations
        const nestedSpan = logger.createSpan('test.nested.operation');
        await new Promise(resolve => setTimeout(resolve, 50));
        nestedSpan.end();
        
        return 'operation-completed';
      },
      {
        'operation.type': 'async',
        'operation.complexity': 'medium',
        'operation.test': true
      }
    );

    console.log('✅ Function tracing completed, result:', result);
  } catch (error) {
    console.error('❌ Function tracing failed:', error);
  }

  // Test 4: Error tracing
  console.log('\n🚨 Test 4: Error Tracing');
  try {
    await logger.traceFunction(
      'test.error.operation',
      async () => {
        console.log('  📝 Executing function that will throw error...');
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('This is a test error for tracing');
      },
      {
        'operation.type': 'error-test',
        'operation.expected': 'failure'
      }
    );
  } catch (error) {
    console.log('✅ Error tracing completed, caught expected error:', (error as Error).message);
  }

  // Test 5: Metrics creation
  console.log('\n📈 Test 5: Metrics Creation');
  try {
    const counter = logger.createCounter('pepper_log.test.requests', 'Test requests counter');
    const histogram = logger.createHistogram('pepper_log.test.duration', 'Test operation duration');

    // Record some metrics
    counter.add(1, { 'test.endpoint': '/api/test', 'test.method': 'GET' });
    counter.add(3, { 'test.endpoint': '/api/users', 'test.method': 'POST' });
    
    histogram.record(150, { 'test.operation': 'database-query' });
    histogram.record(75, { 'test.operation': 'cache-lookup' });
    histogram.record(300, { 'test.operation': 'external-api' });

    console.log('✅ Metrics recorded successfully');
  } catch (error) {
    console.error('❌ Metrics creation failed:', error);
  }

  // Test 6: Rapid span creation to test batching
  console.log('\n⚡ Test 6: Rapid Span Creation (Testing Batching)');
  try {
    const spans = [];
    for (let i = 0; i < 10; i++) {
      const span = logger.createSpan(`test.batch.span.${i}`, {
        attributes: {
          'span.index': i,
          'span.batch': 'rapid-test'
        }
      });
      spans.push(span);
      
      // Simulate quick work
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // End all spans
    spans.forEach(span => span.end());
    console.log('✅ Created and ended 10 spans rapidly');
  } catch (error) {
    console.error('❌ Rapid span creation failed:', error);
  }

  console.log('\n🎉 Integration test completed!');
  console.log('\n📍 To verify tracing is working:');
  console.log('1. Start Jaeger: docker run -d -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest');
  console.log('2. Run this test');
  console.log('3. Open http://localhost:16686');
  console.log('4. Search for service: pepper-log-integration-test');
  console.log('5. You should see traces with spans named: test.manual.span, test.async.operation, etc.');
  
  console.log('\n📍 For SigNoz:');
  console.log('1. Change backend to "signoz" and endpoint to "http://localhost:4318/v1/traces"');
  console.log('2. Open http://localhost:3301');
  console.log('3. Go to Services -> pepper-log-integration-test');
}

// Test with actual initialization (requires backend)
async function testWithInitialization() {
  console.log('\n🚀 Testing with Full Initialization...');
  console.log('⚠️  This requires a running observability backend!\n');

  try {
    const logger = new PepperLog({
      serviceName: 'pepper-log-full-test',
      backend: 'jaeger',
      config: {
        endpoint: 'http://localhost:14268/api/traces'
      },
      features: {
        tracing: true,
        metrics: true,
        logging: true,
        autoInstrumentation: false // Disable to avoid noise
      }
    });

    console.log('📝 Attempting full initialization...');
    await logger.initialize();
    
    console.log('✅ PepperLog fully initialized!');
    console.log('🌶️ This means traces should be sent to the backend');
    
    // Create a test trace after initialization
    await logger.traceFunction(
      'post-initialization.test',
      async () => {
        console.log('  📊 Creating trace after full initialization...');
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      }
    );

    console.log('✅ Post-initialization trace created');
    
    // Shutdown properly
    await logger.shutdown();
    console.log('✅ PepperLog shutdown completed');
    
  } catch (error) {
    console.log('❌ Full initialization failed (backend might not be running):');
    console.log('  ', error);
    console.log('\n💡 This is expected if you don\'t have Jaeger running locally');
    console.log('   Start Jaeger: docker run -d -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest');
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🌶️ PepperLog Integration Tests');
  console.log('=' .repeat(60));
  
  await testActualLogging();
  await testWithInitialization();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Integration tests completed!');
}

// Run the tests
runIntegrationTests().catch(console.error);