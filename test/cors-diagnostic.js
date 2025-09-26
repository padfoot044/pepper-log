// CORS Diagnostic Tool for PepperLog
// Run this in browser console to test different endpoints

async function testCORS() {
  console.log('🔍 Testing CORS for different endpoints...');
  
  const endpoints = [
    'http://localhost:14268/api/traces',  // Jaeger native
    'http://localhost:4318/v1/traces',   // OTLP (recommended)
    'http://localhost:16686/api/traces', // Jaeger query
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'cors-check' }),
        mode: 'cors'
      });
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      
    } catch (error) {
      if (error.message.includes('CORS')) {
        console.log(`❌ ${endpoint} - CORS blocked: ${error.message}`);
      } else if (error.message.includes('Failed to fetch')) {
        console.log(`⚠️ ${endpoint} - Network/Server error: ${error.message}`);
      } else {
        console.log(`❓ ${endpoint} - Other error: ${error.message}`);
      }
    }
  }
  
  console.log('\n💡 Recommendations:');
  console.log('1. If OTLP (4318) works: Switch to that endpoint');
  console.log('2. If all fail: Check if Jaeger is running and CORS is enabled');
  console.log('3. Consider using Angular proxy for development');
}

// Run the test
testCORS();