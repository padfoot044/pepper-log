// Test the main PepperLog class API includes logging methods
import { PepperLog, LogLevel } from '../src/index';

describe('PepperLog Main API', () => {
  describe('API Availability', () => {
    it('should expose LogLevel enum', () => {
      expect(LogLevel).toBeDefined();
      expect(LogLevel.DEBUG).toBe(5);
      expect(LogLevel.INFO).toBe(9);
      expect(LogLevel.WARN).toBe(13);
      expect(LogLevel.ERROR).toBe(17);
      expect(LogLevel.FATAL).toBe(21);
    });

    it('should have logsEndpoint in config interface', () => {
      const config = {
        serviceName: 'test-app',
        backend: 'signoz' as const,
        config: {
          endpoint: 'http://localhost:4318/v1/traces',
          logsEndpoint: 'http://localhost:4318/v1/logs'  // This should be valid
        }
      };
      
      expect(() => new PepperLog(config)).not.toThrow();
    });

    it('should have logging methods available on main class', () => {
      const logger = new PepperLog({
        serviceName: 'test-app',
        backend: 'signoz',
        config: {
          endpoint: 'http://localhost:4318/v1/traces',
          logsEndpoint: 'http://localhost:4318/v1/logs'
        },
        logging: {
          enabled: true,
          level: LogLevel.DEBUG
        }
      });

      // Check that logging methods exist
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.fatal).toBe('function');
    });

    it('should call logging methods without errors', () => {
      const logger = new PepperLog({
        serviceName: 'test-app',
        backend: 'signoz',
        config: {
          endpoint: 'http://localhost:4318/v1/traces',
          logsEndpoint: 'http://localhost:4318/v1/logs'
        },
        logging: {
          enabled: true,
          level: LogLevel.DEBUG
        }
      });

      // These should not throw errors
      expect(() => {
        logger.info('Test info message', { userId: '123' });
        logger.warn('Test warning', { component: 'test' });
        logger.debug('Debug info', { step: 1 });
        logger.error('Test error', new Error('Test error'), { context: 'test' });
        logger.fatal('Fatal error', new Error('Fatal'), { severity: 'high' });
      }).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should accept full v3.0.0 configuration', () => {
      const config = {
        serviceName: 'my-awesome-app',
        backend: 'signoz' as const,
        config: {
          endpoint: 'http://localhost:4318/v1/traces',
          logsEndpoint: 'http://localhost:4318/v1/logs',
        },
        features: {
          tracing: true,
          logging: true,
          metrics: true,
          autoInstrumentation: true
        },
        logging: {
          enabled: true,
          level: LogLevel.INFO,
          enableCorrelation: true,
          consoleOutput: true
        }
      };

      expect(() => new PepperLog(config)).not.toThrow();
      const logger = new PepperLog(config);
      expect(logger).toBeDefined();
    });

    it('should work with auto-derived logs endpoint', () => {
      const config = {
        serviceName: 'my-app',
        backend: 'signoz' as const,
        config: {
          endpoint: 'http://localhost:4318/v1/traces'
          // logsEndpoint should be auto-derived
        },
        logging: {
          enabled: true,
          level: LogLevel.INFO
        }
      };

      expect(() => new PepperLog(config)).not.toThrow();
    });
  });
});