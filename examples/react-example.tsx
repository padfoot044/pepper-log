import { PepperLog } from 'pepper-log';

// React Example
const logger = new PepperLog({
  serviceName: 'my-react-app',
  backend: 'signoz',
  config: {
    endpoint: 'http://localhost:4318/v1/traces'
  }
});

// Initialize (call this in your main App component or index file)
logger.initialize().then(() => {
  console.log('PepperLog initialized for React app!');
});

// Example React component with manual instrumentation
export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    // Trace the user fetch operation
    logger.traceFunction(
      'user.fetch',
      async () => {
        const response = await fetch(`/api/users/${userId}`);
        const userData = await response.json();
        setUser(userData);
        return userData;
      },
      {
        'user.id': userId,
        'component.name': 'UserProfile'
      }
    );
  }, [userId]);

  return (
    <div>
      {user ? (
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}

export default logger;