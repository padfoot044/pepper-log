# 🌶️ PepperLog Quick Demo

This is a minimal example showing how easy PepperLog is to use.

## Setup (30 seconds)

1. **Install PepperLog:**
```bash
npm install pepper-log
```

2. **Create a telemetry file (telemetry.js):**
```javascript
const { PepperLog } = require('pepper-log');

const logger = new PepperLog({
  serviceName: 'my-demo-app',
  backend: 'jaeger', // or 'signoz'
  config: {
    endpoint: 'http://localhost:14268/api/traces'
  }
});

logger.initialize().then(() => {
  console.log('🌶️ PepperLog initialized!');
});

module.exports = logger;
```

3. **Import in your main file (app.js):**
```javascript
require('./telemetry'); // Import first!
const express = require('express');

const app = express();

app.get('/users/:id', async (req, res) => {
  // This route is automatically traced!
  const user = { id: req.params.id, name: 'John Doe' };
  res.json(user);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Start Jaeger (for testing)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

## Test It

1. **Start your app:**
```bash
node app.js
```

2. **Make some requests:**
```bash
curl http://localhost:3000/users/123
curl http://localhost:3000/users/456
```

3. **View traces in Jaeger:** http://localhost:16686

## That's It! 🎉

PepperLog automatically:
- ✅ Detected your Express framework
- ✅ Set up OpenTelemetry tracing
- ✅ Instrumented HTTP requests
- ✅ Sent traces to Jaeger

No complex configuration, no learning OpenTelemetry APIs, no boilerplate code!