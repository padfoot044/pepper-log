# Contributing to PepperLog

Thank you for your interest in contributing to PepperLog! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 14.0.0 or higher
- npm, yarn, or pnpm
- Git

### Development Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/yourusername/pepper-log.git
cd pepper-log
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Run in development mode:**
```bash
npm run dev
```

## 📁 Project Structure

```
pepper-log/
├── src/
│   ├── index.ts              # Main PepperLog class
│   ├── types.ts              # TypeScript interfaces
│   ├── detector.ts           # Framework detection logic
│   ├── backends/
│   │   └── index.ts          # Backend integrations
│   └── frameworks/
│       └── index.ts          # Framework-specific integrations
├── examples/                 # Usage examples
├── docs/                     # Documentation
├── dist/                     # Built output
└── tests/                    # Test files
```

## 🛠️ Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (we use Prettier)
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Architecture Principles

1. **Modularity**: Keep components separate and focused
2. **Extensibility**: Make it easy to add new backends/frameworks
3. **Zero Dependencies**: Minimize external dependencies where possible
4. **Performance**: Minimize overhead in production
5. **Developer Experience**: Simple APIs, good error messages

## 🔧 Adding New Features

### Adding a New Backend

1. **Create backend implementation:**
```typescript
// src/backends/my-backend.ts
export class MyBackend implements BackendProvider {
  name = 'my-backend';

  createExporter(config: BackendConfig) {
    // Implementation
  }

  getDefaultConfig(): Partial<BackendConfig> {
    // Default configuration
  }
}
```

2. **Register in BackendFactory:**
```typescript
// src/backends/index.ts
import { MyBackend } from './my-backend';

export class BackendFactory {
  private static backends: Map<string, BackendProvider> = new Map([
    // ... existing backends
    ['my-backend', new MyBackend()]
  ]);
}
```

3. **Update types:**
```typescript
// src/types.ts
export interface PepperLogConfig {
  backend: 'signoz' | 'datadog' | 'jaeger' | 'my-backend' | ...;
}
```

4. **Add documentation and examples**

### Adding a New Framework

1. **Create framework integration:**
```typescript
// src/frameworks/my-framework.ts
export class MyFrameworkIntegration implements FrameworkIntegration {
  name: Framework = 'my-framework';

  initialize() {
    console.log('PepperLog: Initializing MyFramework integration');
    this.setupInstrumentation();
  }

  setupInstrumentation() {
    // Framework-specific instrumentation
  }
}
```

2. **Add detection logic:**
```typescript
// src/detector.ts
private detectFromPackageJson(): DetectedFramework | null {
  const frameworkChecks = [
    // ... existing checks
    { framework: 'my-framework', dependencies: ['my-framework-core'], confidence: 0.9 }
  ];
}
```

3. **Register in FrameworkIntegrationFactory:**
```typescript
// src/frameworks/index.ts
private static integrations: Map<Framework, FrameworkIntegration> = new Map([
  // ... existing integrations
  ['my-framework', new MyFrameworkIntegration()]
]);
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Place test files next to source files with `.test.ts` extension
- Use descriptive test names
- Test both success and error scenarios
- Mock external dependencies

Example test:
```typescript
// src/detector.test.ts
import { FrameworkDetector } from './detector';

describe('FrameworkDetector', () => {
  it('should detect React from package.json', () => {
    // Test implementation
  });
});
```

## 📝 Documentation

### Update Documentation

When adding features, update:

- `README.md` - Main documentation
- `docs/GETTING_STARTED.md` - Getting started guide
- `docs/API.md` - API documentation
- `examples/` - Add usage examples

### Documentation Style

- Use clear, concise language
- Include code examples
- Add troubleshooting sections
- Use emojis sparingly but consistently

## 🐛 Bug Reports

### Before Submitting

1. Check existing issues
2. Update to latest version
3. Create minimal reproduction

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version:
- Framework:
- PepperLog version:
- Backend:
- OS:

## Additional Context
Any other relevant information
```

## 🆕 Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've considered

## Additional Context
Screenshots, examples, etc.
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create an issue** to discuss large changes
2. **Fork the repository**
3. **Create a feature branch** from `main`
4. **Make your changes**
5. **Add tests** for new functionality
6. **Update documentation**
7. **Ensure all tests pass**

### PR Guidelines

- **Small, focused changes** are easier to review
- **Clear commit messages** following conventional commits
- **Reference related issues** in PR description
- **Add screenshots** for UI changes

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(backends): add support for Grafana Cloud
fix(detector): improve Next.js detection accuracy
docs(readme): update installation instructions
```

## 🎯 Priority Areas

We're especially looking for contributions in:

1. **New Backend Integrations**
   - AWS X-Ray
   - Honeycomb
   - Elastic APM
   - Custom OTLP endpoints

2. **Framework Support**
   - Svelte/SvelteKit
   - Solid.js
   - Remix
   - Astro

3. **Better Detection**
   - Monorepo support
   - Edge case handling
   - Performance improvements

4. **Documentation**
   - More examples
   - Video tutorials
   - Blog posts

5. **Testing**
   - Integration tests
   - E2E tests
   - Performance benchmarks

## 🏆 Recognition

Contributors will be:
- Added to the contributors list
- Mentioned in release notes
- Given credit in documentation

## 📞 Getting Help

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat (link in README)

## 📜 Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

Thank you for contributing to PepperLog! 🌶️