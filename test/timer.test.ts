// Tests for automatic timing/duration logging feature
import { PepperLogger } from '../src/logging/logger';
import { PepperTimerManager, PepperTimer } from '../src/logging/timer';
import { LogLevel } from '../src/logging/types';

describe('PepperLog Timer Feature', () => {
  let logger: PepperLogger;
  let logDurationSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new PepperLogger({
      serviceName: 'test-service',
      loggingConfig: {
        enabled: true,
        level: LogLevel.INFO,
        consoleOutput: false,
        enableCorrelation: true
      }
    });

    // Spy on the logDuration method to track calls
    logDurationSpy = jest.spyOn(logger, 'logDuration');
    warnSpy = jest.spyOn(logger, 'warn');
  });

  afterEach(() => {
    // Cleanup any active timers after each test
    logger.cleanupTimers();
    jest.clearAllMocks();
  });

  describe('Timer Creation and Management', () => {
    it('should create a timer with unique ID and operation name', () => {
      const timer = logger.startTimer('test-operation', { context: 'unit-test' });
      
      expect(timer).toBeDefined();
      expect(timer.id).toMatch(/^timer-\d+-\d{4}$/);
      expect(timer.operation).toBe('test-operation');
      expect(timer.startAttributes).toEqual({ context: 'unit-test' });
      expect(timer.startTime).toBeGreaterThan(0);
    });

    it('should track active timers', () => {
      const timer1 = logger.startTimer('operation-1');
      const timer2 = logger.startTimer('operation-2');
      
      const activeTimers = logger.getActiveTimers();
      expect(activeTimers).toHaveLength(2);
      expect(activeTimers.map(t => t.operation)).toContain('operation-1');
      expect(activeTimers.map(t => t.operation)).toContain('operation-2');
    });

    it('should allow adding context to timers', () => {
      const timer = logger.startTimer('test-operation');
      timer.addContext({ step: 'validation', userId: '123' });
      timer.addContext({ progress: 50 });
      
      timer.end();
      
      // Check that logDuration was called with merged attributes
      expect(logDurationSpy).toHaveBeenCalledWith(
        'test-operation',
        expect.any(Number),
        expect.objectContaining({
          step: 'validation',
          userId: '123',
          progress: 50
        })
      );
    });
  });

  describe('Timer Completion', () => {
    it('should automatically log duration when timer ends', async () => {
      const timer = logger.startTimer('async-operation', { type: 'test' });
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      timer.end({ status: 'success' });
      
      expect(logDurationSpy).toHaveBeenCalledWith(
        'async-operation',
        expect.any(Number),
        expect.objectContaining({
          type: 'test',
          status: 'success',
          'timer.id': timer.id
        })
      );

      const duration = logDurationSpy.mock.calls[0][1];
      expect(duration).toBeGreaterThanOrEqual(5); // Allow for timing variance
    });

    it('should handle timer cancellation', () => {
      const timer = logger.startTimer('cancellable-operation');
      timer.cancel();
      
      expect(warnSpy).toHaveBeenCalledWith(
        'Timer cancelled: cancellable-operation',
        expect.objectContaining({
          'timer.id': timer.id,
          'timer.status': 'cancelled'
        })
      );
    });

    it('should ignore multiple end/cancel calls', () => {
      const timer = logger.startTimer('test-operation');
      timer.end();
      timer.end(); // Second call should be ignored
      timer.cancel(); // Should be ignored after end
      
      expect(logDurationSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Function Wrapper Timing', () => {
    it('should time synchronous functions successfully', () => {
      const result = logger.timeSync('sync-calculation', () => {
        return 42 * 2;
      }, { complexity: 'simple' });
      
      expect(result).toBe(84);
      expect(logDurationSpy).toHaveBeenCalledWith(
        'sync-calculation',
        expect.any(Number),
        expect.objectContaining({
          complexity: 'simple',
          'timing.type': 'sync',
          'timing.status': 'success',
          'timing.result': 'number'
        })
      );
    });

    it('should time asynchronous functions successfully', async () => {
      const result = await logger.timeAsync('async-fetch', async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return { data: 'test' };
      }, { endpoint: '/api/test' });
      
      expect(result).toEqual({ data: 'test' });
      expect(logDurationSpy).toHaveBeenCalledWith(
        'async-fetch',
        expect.any(Number),
        expect.objectContaining({
          endpoint: '/api/test',
          'timing.type': 'async',
          'timing.status': 'success',
          'timing.result': 'object'
        })
      );
    });

    it('should handle errors in synchronous functions', () => {
      const testError = new Error('Test error');
      
      expect(() => {
        logger.timeSync('error-operation', () => {
          throw testError;
        });
      }).toThrow('Test error');
      
      expect(logDurationSpy).toHaveBeenCalledWith(
        'error-operation',
        expect.any(Number),
        expect.objectContaining({
          'timing.type': 'sync',
          'timing.status': 'error',
          'timing.error': 'Test error'
        })
      );
    });

    it('should handle errors in asynchronous functions', async () => {
      const testError = new Error('Async error');
      
      await expect(
        logger.timeAsync('async-error', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw testError;
        })
      ).rejects.toThrow('Async error');
      
      expect(logDurationSpy).toHaveBeenCalledWith(
        'async-error',
        expect.any(Number),
        expect.objectContaining({
          'timing.type': 'async',
          'timing.status': 'error',
          'timing.error': 'Async error'
        })
      );
    });
  });

  describe('Timer Cleanup and Error Handling', () => {
    it('should cleanup active timers on shutdown', () => {
      const timer1 = logger.startTimer('operation-1');
      const timer2 = logger.startTimer('operation-2');
      
      expect(logger.getActiveTimers()).toHaveLength(2);
      
      logger.cleanupTimers();
      
      expect(logger.getActiveTimers()).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        'Cleaning up 2 active timers',
        expect.objectContaining({
          'cleanup.timer_count': 2,
          'cleanup.operations': ['operation-1', 'operation-2']
        })
      );
    });

    it('should handle endTimer with invalid timer ID gracefully', () => {
      expect(() => {
        logger.endTimer('invalid-timer-id');
      }).not.toThrow();
    });

    it('should handle context inheritance from parent logger', () => {
      const contextLogger = logger.withContext({ userId: '123', session: 'abc' });
      const timer = contextLogger.startTimer('context-operation');
      timer.end();
      
      expect(logDurationSpy).toHaveBeenCalledWith(
        'context-operation',
        expect.any(Number),
        expect.objectContaining({
          userId: '123',
          session: 'abc'
        })
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should handle multiple concurrent timers efficiently', () => {
      const timerCount = 100;
      const timers: any[] = [];
      
      // Start many timers
      for (let i = 0; i < timerCount; i++) {
        timers.push(logger.startTimer(`operation-${i}`, { index: i }));
      }
      
      expect(logger.getActiveTimers()).toHaveLength(timerCount);
      
      // End all timers
      timers.forEach(timer => timer.end());
      
      expect(logger.getActiveTimers()).toHaveLength(0);
      expect(logDurationSpy).toHaveBeenCalledTimes(timerCount);
    });

    it('should generate unique timer IDs', () => {
      const timerIds = new Set();
      const timerCount = 50;
      
      for (let i = 0; i < timerCount; i++) {
        const timer = logger.startTimer(`operation-${i}`);
        timerIds.add(timer.id);
        timer.end();
      }
      
      expect(timerIds.size).toBe(timerCount);
    });
  });

  describe('TimerManager Direct Testing', () => {
    let timerManager: PepperTimerManager;
    let mockLogDuration: jest.Mock;
    let mockLogWarn: jest.Mock;

    beforeEach(() => {
      mockLogDuration = jest.fn();
      mockLogWarn = jest.fn();
      timerManager = new PepperTimerManager(mockLogDuration, mockLogWarn);
    });

    it('should create and manage timers independently', () => {
      const timer = timerManager.startTimer('direct-test');
      
      expect(timer).toBeDefined();
      expect(timer.operation).toBe('direct-test');
      expect(timerManager.getActiveTimers()).toHaveLength(1);
      
      timer.end();
      expect(mockLogDuration).toHaveBeenCalled();
      expect(timerManager.getActiveTimers()).toHaveLength(0);
    });

    it('should handle timer manager cleanup', () => {
      const timer1 = timerManager.startTimer('test-1');
      const timer2 = timerManager.startTimer('test-2');
      
      timerManager.cleanup();
      
      expect(mockLogWarn).toHaveBeenCalledWith(
        'Cleaning up 2 active timers',
        expect.objectContaining({
          'cleanup.timer_count': 2
        })
      );
    });
  });
});