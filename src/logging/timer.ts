// Timer implementation for automatic timing/duration logging
import { Timer, TimerManager } from './types';

export class PepperTimer implements Timer {
  public readonly id: string;
  public readonly operation: string;
  public readonly startTime: number;
  public readonly startAttributes: Record<string, any>;
  private contextAttributes: Record<string, any> = {};
  private ended: boolean = false;
  private cancelled: boolean = false;

  constructor(
    id: string,
    operation: string,
    startAttributes: Record<string, any> = {},
    private onEnd: (timer: PepperTimer, endAttributes: Record<string, any>) => void,
    private onCancel: (timer: PepperTimer) => void
  ) {
    this.id = id;
    this.operation = operation;
    this.startTime = Date.now();
    this.startAttributes = { ...startAttributes };
  }

  end(attributes: Record<string, any> = {}): void {
    if (this.ended || this.cancelled) {
      return;
    }
    
    this.ended = true;
    const endAttributes = {
      ...this.contextAttributes,
      ...attributes
    };
    
    this.onEnd(this, endAttributes);
  }

  cancel(): void {
    if (this.ended || this.cancelled) {
      return;
    }
    
    this.cancelled = true;
    this.onCancel(this);
  }

  addContext(attributes: Record<string, any>): void {
    if (this.ended || this.cancelled) {
      return;
    }
    
    this.contextAttributes = {
      ...this.contextAttributes,
      ...attributes
    };
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  getAllAttributes(): Record<string, any> {
    return {
      ...this.startAttributes,
      ...this.contextAttributes
    };
  }

  isActive(): boolean {
    return !this.ended && !this.cancelled;
  }
}

export class PepperTimerManager implements TimerManager {
  private timers: Map<string, PepperTimer> = new Map();
  private timerCounter: number = 0;

  constructor(
    private logDurationFn: (operation: string, duration: number, attributes: Record<string, any>) => void,
    private logWarnFn?: (message: string, attributes: Record<string, any>) => void
  ) {}

  startTimer(operation: string, attributes: Record<string, any> = {}): Timer {
    const id = this.generateTimerId();
    
    const timer = new PepperTimer(
      id,
      operation,
      attributes,
      (timer, endAttributes) => this.handleTimerEnd(timer, endAttributes),
      (timer) => this.handleTimerCancel(timer)
    );

    this.timers.set(id, timer);
    
    // Log timer start if debug logging is available
    if (this.logWarnFn && process.env.NODE_ENV !== 'production') {
      this.logWarnFn(`Timer started: ${operation}`, {
        'timer.id': id,
        'timer.operation': operation,
        'timer.start_time': timer.startTime,
        ...attributes
      });
    }

    return timer;
  }

  getTimer(id: string): Timer | undefined {
    return this.timers.get(id);
  }

  endTimer(id: string, attributes: Record<string, any> = {}): void {
    const timer = this.timers.get(id);
    if (timer) {
      timer.end(attributes);
    }
  }

  cancelTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      timer.cancel();
    }
  }

  getActiveTimers(): Timer[] {
    return Array.from(this.timers.values()).filter(timer => timer.isActive());
  }

  cleanup(): void {
    const activeTimers = this.getActiveTimers();
    
    // Log warning for unclosed timers
    if (activeTimers.length > 0 && this.logWarnFn) {
      this.logWarnFn(`Cleaning up ${activeTimers.length} active timers`, {
        'cleanup.timer_count': activeTimers.length,
        'cleanup.operations': activeTimers.map(t => t.operation)
      });
    }

    // Cancel all active timers
    activeTimers.forEach(timer => timer.cancel());
    this.timers.clear();
  }

  private generateTimerId(): string {
    this.timerCounter++;
    return `timer-${Date.now()}-${this.timerCounter.toString().padStart(4, '0')}`;
  }

  private handleTimerEnd(timer: PepperTimer, endAttributes: Record<string, any>): void {
    const duration = timer.getDuration();
    const allAttributes = {
      ...timer.getAllAttributes(),
      ...endAttributes,
      'timer.id': timer.id,
      'timer.start_time': timer.startTime,
      'timer.end_time': Date.now()
    };

    this.logDurationFn(timer.operation, duration, allAttributes);
    this.timers.delete(timer.id);
  }

  private handleTimerCancel(timer: PepperTimer): void {
    if (this.logWarnFn) {
      this.logWarnFn(`Timer cancelled: ${timer.operation}`, {
        'timer.id': timer.id,
        'timer.operation': timer.operation,
        'timer.duration_ms': timer.getDuration(),
        'timer.status': 'cancelled',
        ...timer.getAllAttributes()
      });
    }
    this.timers.delete(timer.id);
  }
}