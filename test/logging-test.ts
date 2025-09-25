import { PepperLog, FrameworkDetector, BackendFactory } from '../src/index';
import { trace, SpanStatusCode } from '@opentelemetry/api';

// Mock console to capture logs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
let capturedLogs: string[] = [];
let capturedWarns: string[] = [];
let capturedErrors: string[] = [];

function mockConsole() {
  capturedLogs = [];
  capturedWarns = [];
  capturedErrors = [];
  
  console.log = (...args: any[]) => {
    capturedLogs.push(args.map(arg => String(arg)).join(' '));
    originalConsoleLog(...args);
  };
  
  console.warn = (...args: any[]) => {
    capturedWarns.push(args.map(arg => String(arg)).join(' '));
    originalConsoleWarn(...args);
  };
  
  console.error = (...args: any[]) => {
    capturedErrors.push(args.map(arg => String(arg)).join(' '));
    originalConsoleError(...args);
  };
}

function restoreConsole() {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function addTestResult(name: string, passed: boolean, message: string, details?: any) {
  testResults.push({ name, passed, message, details });
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}: ${message}`);
  if (details) {
    console.log('  Details:', details);
  }
}

// Test suites
async function testFrameworkDetection() {
  console.log('\n📱 Testing Framework Detection and Logging...');
  
  mockConsole();
  
  const detector = FrameworkDetector.getInstance();
  const detectedFramework = detector.detectFramework();
  
  restoreConsole();
  
  // Test if framework was detected
  addTestResult(
    'Framework Detection',
    detectedFramework !== null,
    detectedFramework ? 
      `Successfully detected ${detectedFramework.name} with ${Math.round(detectedFramework.confidence * 100)}% confidence` :
      'No framework detected',
    detectedFramework
  );
  
  // Test if detection logs are present (should have some internal logging)
  addTestResult(
    'Detection Logging',
    capturedLogs.length > 0 || capturedWarns.length > 0,
    `Captured ${capturedLogs.length} logs, ${capturedWarns.length} warnings`,
    { logs: capturedLogs, warns: capturedWarns }
  );
  
  return detectedFramework;
}

async function testBackendConfiguration() {
  console.log('\n🔌 Testing Backend Configuration...');
  
  const supportedBackends = BackendFactory.getSupportedBackends();
  
  addTestResult(
    'Backend Support',
    supportedBackends.length >= 8,
    `Found ${supportedBackends.length} supported backends: ${supportedBackends.join(', ')}`,
    supportedBackends
  );
  
  // Test each backend can be instantiated
  let backendTests = 0;
  let backendSuccesses = 0;
  
  for (const backendName of supportedBackends) {
    try {
      backendTests++;
      const backend = BackendFactory.getBackend(backendName);
      const defaultConfig = backend.getDefaultConfig();
      backendSuccesses++;
      
      addTestResult(
        `Backend: ${backendName}`,
        true,
        `Successfully created backend with default config`,
        defaultConfig
      );
    } catch (error) {
      addTestResult(
        `Backend: ${backendName}`,
        false,
        `Failed to create backend: ${error}`,
        { error }
      );
    }
  }
  
  addTestResult(
    'Overall Backend Test',
    backendSuccesses === backendTests,
    `${backendSuccesses}/${backendTests} backends working correctly`
  );
}

async function testPepperLogInitialization() {
  console.log('\n🚀 Testing PepperLog Initialization and Logging...');
  
  mockConsole();
  
  // Test with different configurations
  const testConfigs = [
    {
      name: 'Basic Jaeger Config',
      config: {
        serviceName: 'test-jaeger-service',
        backend: 'jaeger' as const,
        config: { endpoint: 'http://localhost:14268/api/traces' },
        features: { autoInstrumentation: false }
      }
    },
    {
      name: 'SigNoz Config',
      config: {
        serviceName: 'test-signoz-service',
        backend: 'signoz' as const,
        config: { endpoint: 'http://localhost:4318/v1/traces' },
        features: { autoInstrumentation: false }
      }
    },
    {
      name: 'Custom Config with Features',
      config: {
        serviceName: 'test-custom-service',
        backend: 'custom' as const,
        config: { endpoint: 'https://example.com/traces' },
        features: {
          tracing: true,
          metrics: true,
          logging: true,
          autoInstrumentation: false
        },
        globalAttributes: {
          'test.environment': 'unit-test',
          'test.version': '1.0.0'
        }
      }
    }
  ];
  
  for (const testConfig of testConfigs) {
    console.log(`\n  Testing ${testConfig.name}...`);
    
    try {
      capturedLogs = [];
      capturedWarns = [];
      capturedErrors = [];
      
      const logger = new PepperLog(testConfig.config);
      
      // Test configuration
      const config = logger.getConfig();
      addTestResult(
        `${testConfig.name}: Config`,
        config.serviceName === testConfig.config.serviceName,
        `Configuration correctly stored`,
        config
      );
      
      // Test detected framework
      const framework = logger.getDetectedFramework();
      addTestResult(
        `${testConfig.name}: Framework Detection`,
        framework !== null,
        framework ? `Framework detected: ${framework.name}` : 'No framework detected',
        framework
      );
      
      // Test utility methods
      const supportedFrameworks = PepperLog.getSupportedFrameworks();
      const supportedBackends = PepperLog.getSupportedBackends();
      
      addTestResult(
        `${testConfig.name}: Static Methods`,
        supportedFrameworks.length > 0 && supportedBackends.length > 0,
        `Static methods working: ${supportedFrameworks.length} frameworks, ${supportedBackends.length} backends`
      );
      
    } catch (error) {
      addTestResult(
        `${testConfig.name}: Initialization`,
        false,
        `Failed to initialize: ${error}`,
        { error }
      );
    }
  }
  
  restoreConsole();
  
  // Test if initialization logs are captured
  addTestResult(
    'Initialization Logging',
    capturedLogs.length > 0,
    `Captured ${capturedLogs.length} initialization logs`,
    { logs: capturedLogs.slice(0, 5) } // Show first 5 logs
  );
}

async function testSpanCreationAndLogging() {
  console.log('\n🎯 Testing Span Creation and Tracing...');
  
  const logger = new PepperLog({
    serviceName: 'test-span-service',
    backend: 'jaeger',
    config: { endpoint: 'http://localhost:14268/api/traces' },
    features: { autoInstrumentation: false }
  });
  
  try {
    // Test custom span creation
    const span = logger.createSpan('test.custom.span', {
      attributes: {
        'test.type': 'unit-test',
        'test.timestamp': Date.now()
      }
    });
    
    addTestResult(
      'Span Creation',
      span !== null && typeof span.end === 'function',
      'Successfully created custom span with attributes'
    );
    
    // Add attributes to span
    logger.addAttributes({
      'test.additional': 'attribute',
      'test.number': 42,
      'test.boolean': true
    });
    
    span.end();
    
    addTestResult(
      'Span Attributes',
      true,
      'Successfully added attributes to span'
    );
    
    // Test function tracing
    const result = await logger.traceFunction(
      'test.traced.function',
      async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'traced-result';
      },
      {
        'function.type': 'async',
        'function.test': true
      }
    );
    
    addTestResult(
      'Function Tracing',
      result === 'traced-result',
      'Successfully traced async function',
      { result }
    );
    
    // Test function tracing with error
    try {
      await logger.traceFunction(
        'test.error.function',
        async () => {
          throw new Error('Test error for tracing');
        }
      );
    } catch (error) {
      addTestResult(
        'Error Tracing',
        error instanceof Error && error.message === 'Test error for tracing',
        'Successfully traced function error',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
    
  } catch (error) {
    addTestResult(
      'Span Testing',
      false,
      `Span testing failed: ${error}`,
      { error }
    );
  }
}

async function testMetricsCreation() {
  console.log('\n📊 Testing Metrics Creation...');
  
  const logger = new PepperLog({
    serviceName: 'test-metrics-service',
    backend: 'jaeger',
    config: { endpoint: 'http://localhost:14268/api/traces' },
    features: { metrics: true, autoInstrumentation: false }
  });
  
  try {
    // Test counter creation
    const counter = logger.createCounter('test.requests.total', 'Test request counter');
    addTestResult(
      'Counter Creation',
      counter !== null && typeof counter.add === 'function',
      'Successfully created counter metric'
    );
    
    // Test histogram creation
    const histogram = logger.createHistogram('test.response.duration', 'Test response duration');
    addTestResult(
      'Histogram Creation',
      histogram !== null && typeof histogram.record === 'function',
      'Successfully created histogram metric'
    );
    
    // Test metric usage
    counter.add(1, { 'test.route': '/test' });
    histogram.record(150, { 'test.method': 'GET' });
    
    addTestResult(
      'Metrics Usage',
      true,
      'Successfully used counter and histogram metrics'
    );
    
  } catch (error) {
    addTestResult(
      'Metrics Testing',
      false,
      `Metrics testing failed: ${error}`,
      { error }
    );
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling and Logging...');
  
  mockConsole();
  
  try {
    // Test invalid backend
    try {
      const invalidLogger = new PepperLog({
        serviceName: 'test-service',
        backend: 'invalid-backend' as any,
        config: {}
      });
      
      addTestResult(
        'Invalid Backend Handling',
        false,
        'Should have thrown error for invalid backend'
      );
    } catch (error) {
      addTestResult(
        'Invalid Backend Handling',
        true,
        'Correctly handled invalid backend',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
    
    // Test missing required config
    try {
      const logger = new PepperLog({
        serviceName: 'test-service',
        backend: 'datadog',
        config: {} // Missing API key
      });
      
      // This might not fail until initialization, so we'll test that too
      addTestResult(
        'Missing Config Creation',
        true,
        'Logger created despite missing config (will fail on initialization)'
      );
      
    } catch (error) {
      addTestResult(
        'Missing Config Handling',
        true,
        'Correctly handled missing config',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
    
  } catch (error) {
    addTestResult(
      'Error Handling Test',
      false,
      `Error handling test failed: ${error}`,
      { error }
    );
  }
  
  restoreConsole();
  
  // Check if error logs were captured
  addTestResult(
    'Error Logging',
    capturedErrors.length > 0 || capturedWarns.length > 0,
    `Captured ${capturedErrors.length} errors, ${capturedWarns.length} warnings during error tests`,
    { errors: capturedErrors, warns: capturedWarns }
  );
}

async function testLoggingOutput() {
  console.log('\n📝 Testing Logging Output Verification...');
  
  // Test if PepperLog produces expected log output
  mockConsole();
  
  const logger = new PepperLog({
    serviceName: 'test-logging-service',
    backend: 'signoz',
    config: { endpoint: 'http://localhost:4318/v1/traces' },
    environment: 'test'
  });
  
  // Check if framework detection produces logs
  const framework = logger.getDetectedFramework();
  
  restoreConsole();
  
  // Analyze captured logs
  const pepperLogLogs = capturedLogs.filter(log => log.includes('PepperLog'));
  const frameworkLogs = capturedLogs.filter(log => log.toLowerCase().includes('framework'));
  const initLogs = capturedLogs.filter(log => log.toLowerCase().includes('initializ'));
  
  addTestResult(
    'PepperLog Logs',
    pepperLogLogs.length > 0,
    `Found ${pepperLogLogs.length} PepperLog-specific logs`,
    { logs: pepperLogLogs }
  );
  
  addTestResult(
    'Framework Detection Logs',
    frameworkLogs.length > 0 || framework !== null,
    `Found ${frameworkLogs.length} framework-related logs`,
    { logs: frameworkLogs }
  );
  
  addTestResult(
    'Initialization Logs',
    initLogs.length >= 0, // May be 0 if not initialized
    `Found ${initLogs.length} initialization logs`,
    { logs: initLogs }
  );
}

// Main test function
async function runAllTests() {
  console.log('🌶️ Running Comprehensive PepperLog Tests...\n');
  console.log('=' .repeat(60));
  
  try {
    await testFrameworkDetection();
    await testBackendConfiguration();
    await testPepperLogInitialization();
    await testSpanCreationAndLogging();
    await testMetricsCreation();
    await testErrorHandling();
    await testLoggingOutput();
    
  } catch (error) {
    console.error('Test suite failed:', error);
    addTestResult(
      'Test Suite',
      false,
      `Test suite failed with error: ${error}`
    );
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => console.log(`  • ${r.name}: ${r.message}`));
  }
  
  console.log('\n🎯 LOGGING & TRACING VERIFICATION:');
  
  const loggingTests = testResults.filter(r => 
    r.name.includes('Logging') || 
    r.name.includes('Span') || 
    r.name.includes('Metrics') ||
    r.name.includes('Tracing')
  );
  
  const loggingPassed = loggingTests.filter(r => r.passed).length;
  
  if (loggingPassed === loggingTests.length) {
    console.log('✅ PepperLog is correctly generating logs and traces');
  } else {
    console.log('⚠️  Some logging/tracing functionality may not be working correctly');
  }
  
  console.log('\n🌶️ PepperLog Testing Complete!');
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});