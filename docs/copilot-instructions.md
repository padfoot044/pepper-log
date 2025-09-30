# Copilot Instructions for PepperLog

## Project Context
PepperLog is a comprehensive OpenTelemetry observability library for JavaScript/TypeScript applications. It provides distributed tracing, structured logging, and metrics collection with automatic framework detection and multi-backend support.

## Codebase Architecture

### Core Concepts
- **Dual Environment Support**: Browser (simplified) and Node.js (full OpenTelemetry SDK)
- **Framework Agnostic**: Automatically detects React, Angular, Vue, Express, Next.js, etc.
- **Backend Abstraction**: Supports SigNoz, Grafana, Datadog, Jaeger, New Relic with preset configurations
- **OTLP Compliance**: Follows OpenTelemetry Protocol for traces (/v1/traces) and logs (/v1/logs)

### Key Design Principles
1. **Graceful Degradation**: Never break user applications - log errors and continue
2. **Environment Separation**: Clear distinction between browser and Node.js implementations
3. **Interface-First Design**: Strong TypeScript interfaces define all contracts
4. **Composition over Inheritance**: Use composition for flexibility and testability

## Directory Structure

```
src/
├── index.ts                    # Main entry point with PepperLog class
├── types.ts                    # Core interfaces and types
├── simple.ts                   # Browser simplified implementation
├── detector.ts                 # Node.js framework detection
├── browser-detector.ts         # Browser framework detection
├── backends/index.ts           # Backend configurations
├── frameworks/index.ts         # Framework-specific integrations
└── logging/                    # Structured logging system (v3.0.0+)
    ├── logger.ts              # Main PepperLogger class
    ├── otlp-logs-exporter.ts  # OTLP logs network layer
    ├── correlator.ts          # Trace-log correlation
    └── types.ts               # Logging-specific types
```

## Coding Conventions

### TypeScript Patterns
- Use interfaces for all public APIs
- Employ union types for configuration options
- Implement proper error handling without throwing exceptions
- Use optional chaining and nullish coalescing

### Error Handling Pattern
```typescript
try {
  // risky operation
} catch (error) {
  console.error('PepperLog: Operation failed:', error);
  // Continue execution - never break user app
}
```

### Environment Detection Pattern
```typescript
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;
```

### Configuration Merging Pattern
```typescript
const config = {
  defaults: defaultConfig,
  ...userConfig,
  features: {
    tracing: true,
    logging: true,
    metrics: true,
    autoInstrumentation: true,
    ...userConfig.features
  }
};
```

## Common Development Tasks

### Adding New Backend Support
1. Add configuration to `src/backends/index.ts`
2. Update backend union type in `src/types.ts`
3. Test with actual backend endpoint
4. Document configuration requirements

### Adding Logging Features
1. Extend interfaces in `src/logging/types.ts`
2. Implement in `src/logging/logger.ts`
3. Update main class delegation in `src/index.ts`
4. Add both Node.js and browser implementations
5. Write comprehensive tests

### Adding Framework Detection
1. Extend detection logic in appropriate detector file
2. Add framework-specific integration in `src/frameworks/index.ts`
3. Test with actual framework applications
4. Update type definitions

## Testing Requirements
- All new features must have comprehensive tests
- Use Jest testing framework with TypeScript support
- Mock network requests using jest.fn()
- Test both success and failure scenarios
- Maintain test coverage for all public APIs

## Version Management
- Follow semantic versioning (Major.Minor.Patch)
- Update version in package.json, README.md, and CHANGELOG.md
- Create git tags for releases
- Document breaking changes clearly

## Performance Considerations
- Use batching for network operations
- Implement lazy loading for environment-specific code
- Avoid blocking operations in logging/tracing paths
- Use bounded queues to prevent memory leaks
- Consider bundle size impact for browser builds

## Browser vs Node.js Specifics

### Browser Implementation
- Use fetch API for network requests
- Fallback to console logging when network fails
- Handle CORS restrictions gracefully
- Minimize bundle size
- Support offline scenarios with localStorage

### Node.js Implementation  
- Use full OpenTelemetry SDK
- Support file system operations
- Implement comprehensive auto-instrumentation
- Handle process lifecycle events (shutdown, signals)
- Support server-side frameworks

## Important Files to Understand

### `src/index.ts`
Main entry point that:
- Detects environment (browser vs Node.js)
- Creates appropriate implementation instance
- Provides unified API through delegation
- Handles initialization and configuration

### `src/logging/logger.ts`
Core logging implementation that:
- Implements all logging methods (debug, info, warn, error, fatal)
- Handles log level filtering
- Manages trace-log correlation
- Batches logs for network efficiency

### `src/logging/otlp-logs-exporter.ts`
Network layer that:
- Formats logs according to OTLP specification
- Manages batch processing and timeouts
- Handles network failures and retries
- Sends HTTP POST requests to /v1/logs endpoints

## Code Quality Standards
- Write JSDoc comments for all public methods
- Use meaningful variable and function names
- Keep functions small and focused (max 50 lines)
- Prefer explicit over implicit behavior
- Handle edge cases gracefully
- Write self-documenting code

## Common Patterns to Follow

### Method Delegation Pattern
```typescript
// Main class delegates to environment-specific implementation
methodName(...args): ReturnType {
  if ('methodName' in this.instance && typeof this.instance.methodName === 'function') {
    return this.instance.methodName(...args);
  }
  // Fallback behavior
}
```

### Configuration Validation Pattern
```typescript
// Validate and provide defaults
const validatedConfig = {
  serviceName: config.serviceName || 'unknown-service',
  backend: config.backend || 'custom',
  features: {
    tracing: true,
    logging: true,
    ...config.features
  }
};
```

### Async Batch Processing Pattern
```typescript
private async processBatch(): Promise<void> {
  if (this.batch.length === 0) return;
  
  try {
    await this.sendBatch([...this.batch]);
    this.batch.length = 0; // Clear batch
  } catch (error) {
    console.error('Batch processing failed:', error);
    // Implement retry logic or fallback
  }
}
```

## Dependencies Management
- Keep dependencies minimal and focused
- Use peer dependencies for framework-specific packages
- Separate browser and Node.js dependencies clearly
- Regularly update OpenTelemetry packages
- Test compatibility with different versions

## Documentation Standards
- Update README.md for user-facing changes
- Update CHANGELOG.md for all releases
- Include code examples in documentation
- Document breaking changes prominently
- Maintain TypeScript definitions accuracy

When working with this codebase, always consider:
1. Which environment (browser/Node.js) the code will run in
2. Whether the change affects the public API
3. How errors should be handled gracefully
4. What tests need to be added or updated
5. Performance impact on logging/tracing operations
6. Backward compatibility with existing configurations