# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.2] - 2025-09-26

### Fixed
- **API Integration**: Fixed missing `logsEndpoint` configuration in main `BackendConfig` interface
- **Export Resolution**: Added proper export of `LogLevel` enum from main package
- **Method Availability**: Added logging methods (`info`, `warn`, `error`, `debug`, `fatal`) to main `PepperLog` class
- **TypeScript Definitions**: Updated interface definitions to match actual implementation
- **Cross-Platform Support**: Ensured logging methods work in both Node.js and browser environments

### Added
- **API Tests**: Added comprehensive test suite for main PepperLog class API (6 new tests)
- **Configuration Validation**: Added tests for `logsEndpoint` configuration and LogLevel enum usage
- **Integration Validation**: Added tests ensuring logging methods work correctly on main class instance

### Technical Details
- Fixed TypeScript compilation issues with duplicate LogLevel exports
- Updated both `PepperLogNode` and `PepperLogSimple` implementations to support logging methods
- Added proper method delegation in main `PepperLog` wrapper class
- Maintained backward compatibility with existing API

### Testing
- **Total Tests**: 48 (previously 42)
- **Test Coverage**: All core functionality, OTLP protocol compliance, integration scenarios, and main API
- **Status**: All tests passing ✅

## [1.0.0] - 2024-09-24

### Added
- Initial release of PepperLog
- Universal OpenTelemetry integration for JavaScript/TypeScript frameworks
- Auto-detection for React, Angular, Vue, Express, Next.js, Fastify, and Koa
- Support for multiple backends: SigNoz, Datadog, Jaeger, New Relic, Grafana, Azure, AWS X-Ray
- Comprehensive TypeScript support with full type definitions
- Framework-specific instrumentation and optimizations
- Auto-instrumentation for HTTP requests, databases, and more
- Custom span and metrics creation APIs
- Environment-based configuration support
- Detailed documentation and examples
- Zero-configuration setup with sensible defaults

### Framework Support
- **React**: Component lifecycle, route changes, error boundaries
- **Angular**: HTTP interceptors, router events, component lifecycle
- **Vue.js**: Component lifecycle, Vue Router, Vuex state changes
- **Next.js**: Page transitions, API routes, SSR tracing
- **Express**: Middleware instrumentation, route handlers
- **Fastify**: Hook instrumentation, request lifecycle
- **Koa**: Middleware and context instrumentation

### Backend Integrations
- SigNoz (recommended for self-hosting)
- Datadog APM
- Jaeger distributed tracing
- New Relic APM
- Grafana Cloud/Tempo
- Azure Application Insights
- AWS X-Ray
- Custom OTLP endpoints

### Developer Experience
- Auto-detection of framework and environment
- Minimal configuration required
- TypeScript-first development
- Comprehensive error handling and debugging
- Detailed logging and troubleshooting guides

[Unreleased]: https://github.com/yourusername/pepper-log/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/pepper-log/releases/tag/v1.0.0