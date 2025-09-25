import { PepperLog } from '../src/index';

// Next.js Example - pages/api/users/[id].ts
const logger = new PepperLog({
  serviceName: 'my-nextjs-app',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

// Initialize PepperLog (do this in _app.tsx or layout)
logger.initialize().then(() => {
  console.log('PepperLog initialized for Next.js app!');
});

// API Route Handler
export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const span = logger.createSpan('api.user.get', {
      attributes: {
        'http.method': 'GET',
        'user.id': id,
        'api.route': '/api/users/[id]'
      }
    });

    try {
      // Trace the database operation
      const user = await logger.traceFunction(
        'database.getUser',
        async () => {
          // Simulate database call
          await new Promise(resolve => setTimeout(resolve, 150));
          
          return {
            id,
            name: `User ${id}`,
            email: `user${id}@example.com`,
            createdAt: new Date().toISOString()
          };
        },
        {
          'db.operation': 'select',
          'db.table': 'users',
          'db.user_id': id
        }
      );

      // Add success attributes
      logger.addAttributes({
        'response.status': 200,
        'response.user_found': true
      });

      res.status(200).json(user);
      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      logger.addAttributes({
        'response.status': 500,
        'error.occurred': true
      });

      span.setStatus({ code: 2, message: String(error) }); // ERROR
      res.status(500).json({ error: 'Failed to fetch user' });
    } finally {
      span.end();
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Example: Client-side component usage in pages/users/[id].tsx
export function UserPage({ userId }: { userId: string }) {
  // This would use the React integration automatically
  return <div>User: {userId}</div>;
}