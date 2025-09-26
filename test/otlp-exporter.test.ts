// Test cases for OTLP Logs Exporter
import { OTLPLogsExporter } from '../src/logging/otlp-logs-exporter';
import { LogLevel, LogRecord } from '../src/logging/types';

// Mock fetch for testing
global.fetch = jest.fn();

describe('OTLP Logs Exporter', () => {
  let exporter: OTLPLogsExporter;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    exporter = new OTLPLogsExporter({
      endpoint: 'http://localhost:4318/v1/logs',
      serviceName: 'test-service',
      batchConfig: {
        maxBatchSize: 3, // Small batch for testing
        batchTimeout: 1000,
        maxQueueSize: 100,
        retryAttempts: 2,
        retryDelay: 500
      }
    });

    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response);
  });

  afterEach(() => {
    if (exporter) {
      exporter.shutdown();
    }
  });

  describe('Configuration', () => {
    it('should create exporter with correct configuration', () => {
      expect(exporter).toBeDefined();
      expect(exporter).toBeInstanceOf(OTLPLogsExporter);
    });

    it('should handle custom headers', () => {
      const customExporter = new OTLPLogsExporter({
        endpoint: 'http://localhost:4318/v1/logs',
        serviceName: 'custom-service',
        headers: {
          'Authorization': 'Bearer token123',
          'Custom-Header': 'custom-value'
        }
      });

      expect(customExporter).toBeDefined();
    });
  });

  describe('Log Processing', () => {
    it('should add log records', () => {
      const logRecord: LogRecord = {
        timestamp: Date.now(),
        level: LogLevel.INFO,
        message: 'Test message',
        attributes: { userId: '123' },
        resource: { 'service.name': 'test-service' }
      };

      expect(() => {
        exporter.addLog(logRecord);
      }).not.toThrow();
    });

    it('should handle multiple log records', () => {
      const logs: LogRecord[] = [
        {
          timestamp: Date.now(),
          level: LogLevel.INFO,
          message: 'Info message',
          attributes: { type: 'info' },
          resource: { 'service.name': 'test-service' }
        },
        {
          timestamp: Date.now(),
          level: LogLevel.ERROR,
          message: 'Error message',
          attributes: { type: 'error' },
          resource: { 'service.name': 'test-service' }
        }
      ];

      expect(() => {
        logs.forEach(log => exporter.addLog(log));
      }).not.toThrow();
    });

    it('should handle logs with trace correlation', () => {
      const correlatedLog: LogRecord = {
        timestamp: Date.now(),
        level: LogLevel.INFO,
        message: 'Correlated message',
        attributes: { operation: 'checkout' },
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        resource: { 'service.name': 'test-service' }
      };

      expect(() => {
        exporter.addLog(correlatedLog);
      }).not.toThrow();
    });
  });

  describe('Batching Behavior', () => {
    it('should batch logs before sending', async () => {
      // Add logs below batch size
      exporter.addLog({
        timestamp: Date.now(),
        level: LogLevel.INFO,
        message: 'Log 1',
        attributes: {},
        resource: { 'service.name': 'test-service' }
      });

      exporter.addLog({
        timestamp: Date.now(),
        level: LogLevel.INFO,
        message: 'Log 2',
        attributes: {},
        resource: { 'service.name': 'test-service' }
      });

      // Should not have sent yet (batch size is 3)
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should flush when batch size is reached', async () => {
      // Add logs to trigger batch flush (batch size is 3)
      for (let i = 1; i <= 3; i++) {
        exporter.addLog({
          timestamp: Date.now(),
          level: LogLevel.INFO,
          message: `Log ${i}`,
          attributes: { index: i },
          resource: { 'service.name': 'test-service' }
        });
      }

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have triggered a batch send
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4318/v1/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      expect(() => {
        exporter.addLog({
          timestamp: Date.now(),
          level: LogLevel.ERROR,
          message: 'This will fail to send',
          attributes: {},
          resource: { 'service.name': 'test-service' }
        });
      }).not.toThrow();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      expect(() => {
        // Add enough logs to trigger send
        for (let i = 1; i <= 3; i++) {
          exporter.addLog({
            timestamp: Date.now(),
            level: LogLevel.INFO,
            message: `Log ${i}`,
            attributes: {},
            resource: { 'service.name': 'test-service' }
          });
        }
      }).not.toThrow();
    });
  });

  describe('OTLP Format', () => {
    it('should format logs according to OTLP specification', async () => {
      // Add logs to trigger send
      for (let i = 1; i <= 3; i++) {
        exporter.addLog({
          timestamp: Date.now(),
          level: LogLevel.INFO,
          message: `Test message ${i}`,
          attributes: { 
            'string.attr': 'value',
            'number.attr': 42,
            'boolean.attr': true
          },
          resource: { 'service.name': 'test-service' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalled();
      
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      // Verify OTLP structure
      expect(body).toHaveProperty('resourceLogs');
      expect(Array.isArray(body.resourceLogs)).toBe(true);
      expect(body.resourceLogs[0]).toHaveProperty('resource');
      expect(body.resourceLogs[0]).toHaveProperty('scopeLogs');
      expect(Array.isArray(body.resourceLogs[0].scopeLogs)).toBe(true);
      expect(body.resourceLogs[0].scopeLogs[0]).toHaveProperty('logRecords');
    });
  });

  describe('Resource Management', () => {
    it('should handle flush operation', async () => {
      exporter.addLog({
        timestamp: Date.now(),
        level: LogLevel.INFO,
        message: 'Pending log',
        attributes: {},
        resource: { 'service.name': 'test-service' }
      });

      expect(() => {
        exporter.forceFlush();
      }).not.toThrow();
    });

    it('should handle shutdown operation', () => {
      expect(() => {
        exporter.shutdown();
      }).not.toThrow();
    });
  });
});