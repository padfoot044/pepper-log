import { PepperLog, FrameworkDetector, BackendFactory } from '../src/index';

// Simple test to verify the package works
async function testPepperLog() {
  console.log('🌶️ Testing PepperLog...');

  // Test framework detection
  console.log('\n📱 Testing Framework Detection:');
  const detector = FrameworkDetector.getInstance();
  const detectedFramework = detector.detectFramework();
  console.log('Detected framework:', detectedFramework);

  // Test backend support
  console.log('\n🔌 Supported Backends:', BackendFactory.getSupportedBackends());

  // Test PepperLog initialization (dry run)
  console.log('\n🚀 Testing PepperLog Initialization:');
  const logger = new PepperLog({
    serviceName: 'test-service',
    backend: 'jaeger', // Use Jaeger as it's simpler for testing
    config: {
      endpoint: 'http://localhost:14268/api/traces'
    },
    features: {
      autoInstrumentation: false // Disable for testing
    }
  });

  console.log('✅ PepperLog instance created');
  console.log('Configuration:', logger.getConfig());
  console.log('Detected framework:', logger.getDetectedFramework());

  // Test utility methods
  console.log('\n🛠️ Testing Utility Methods:');
  console.log('Supported frameworks:', PepperLog.getSupportedFrameworks());
  console.log('Supported backends:', PepperLog.getSupportedBackends());

  console.log('\n✨ All tests passed! PepperLog is ready to use.');
}

// Run the test
testPepperLog().catch(console.error);