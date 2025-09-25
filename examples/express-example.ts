import { PepperLog } from '../src/index';
import express from 'express';

// Express Example
const app = express();

// Initialize PepperLog
const logger = new PepperLog({
  serviceName: 'my-express-api',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

// Initialize PepperLog before starting the server
logger.initialize().then(() => {
  console.log('PepperLog initialized for Express app!');
  
  // Middleware
  app.use(express.json());

  // Custom middleware with manual tracing
  app.use(async (req, res, next) => {
    await logger.traceFunction(
      'middleware.auth',
      async () => {
        // Your auth logic here
        logger.addAttributes({
          'http.method': req.method,
          'http.route': req.path,
          'user.id': req.headers['x-user-id'] as string || 'anonymous'
        });
        next();
      }
    );
  });

  // Routes
  app.get('/users/:id', async (req, res) => {
    const span = logger.createSpan('user.get', {
      attributes: {
        'user.id': req.params.id
      }
    });

    try {
      // Simulate database call
      const user = await logger.traceFunction(
        'database.findUser',
        async () => {
          // Simulate async database operation
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            id: req.params.id,
            name: 'John Doe',
            email: 'john@example.com'
          };
        },
        {
          'db.operation': 'select',
          'db.table': 'users'
        }
      );

      res.json(user);
      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.setStatus({ code: 2, message: String(error) }); // ERROR
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      span.end();
    }
  });

  app.post('/users', async (req, res) => {
    const counter = logger.createCounter('users.created', 'Number of users created');
    
    await logger.traceFunction(
      'user.create',
      async () => {
        // Simulate user creation
        await new Promise(resolve => setTimeout(resolve, 200));
        counter.add(1);
        
        res.status(201).json({
          id: Date.now().toString(),
          ...req.body
        });
      },
      {
        'operation': 'create',
        'resource': 'user'
      }
    );
  });

  // Error handling
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.addAttributes({
      'error.name': error.name,
      'error.message': error.message
    });
    
    res.status(500).json({ error: 'Something went wrong!' });
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;