import { Framework } from '../types';
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export interface FrameworkIntegration {
  name: Framework;
  initialize(): void;
  setupInstrumentation(): void;
}

export class ReactIntegration implements FrameworkIntegration {
  name: Framework = 'react';

  initialize() {
    console.log('PepperLog: Initializing React integration');
    this.setupInstrumentation();
  }

  setupInstrumentation() {
    // React-specific instrumentation
    if (typeof window !== 'undefined') {
      this.instrumentComponentLifecycle();
      this.instrumentRouteChanges();
    }
  }

  private instrumentComponentLifecycle() {
    // Hook into React DevTools if available
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const tracer = trace.getTracer('pepper-log-react');
      
      // This is a simplified example - real implementation would be more sophisticated
      const originalMount = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (...args: any[]) => {
        const span = tracer.startSpan('react.component.render', {
          kind: SpanKind.INTERNAL
        });
        
        try {
          if (originalMount) {
            originalMount.apply(this, args);
          }
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
          span.recordException(error as Error);
        } finally {
          span.end();
        }
      };
    }
  }

  private instrumentRouteChanges() {
    // Instrument React Router if available
    if ((window as any).history) {
      const tracer = trace.getTracer('pepper-log-react');
      const originalPushState = window.history.pushState;
      
      window.history.pushState = function(...args) {
        const span = tracer.startSpan('react.navigation', {
          kind: SpanKind.CLIENT,
          attributes: {
            'route.path': String(args[2] || 'unknown')
          }
        });
        
        try {
          originalPushState.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        } finally {
          span.end();
        }
      };
    }
  }
}

export class AngularIntegration implements FrameworkIntegration {
  name: Framework = 'angular';

  initialize() {
    console.log('PepperLog: Initializing Angular integration');
    this.setupInstrumentation();
  }

  setupInstrumentation() {
    // Angular-specific instrumentation
    this.instrumentHttpInterceptor();
    this.instrumentRouterEvents();
  }

  private instrumentHttpInterceptor() {
    // This would typically be done through Angular's DI system
    // For now, we'll hook into XMLHttpRequest
    const tracer = trace.getTracer('pepper-log-angular');
    
    if (typeof XMLHttpRequest !== 'undefined') {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
        (this as any)._pepperLogSpan = tracer.startSpan(`HTTP ${method}`, {
          kind: SpanKind.CLIENT,
          attributes: {
            'http.method': method,
            'http.url': String(url)
          }
        });
        
        return originalOpen.call(this, method, url, async, username, password);
      };
      
      XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
        const span = (this as any)._pepperLogSpan;
        
        this.addEventListener('loadend', () => {
          if (span) {
            span.setAttributes({
              'http.status_code': this.status,
              'http.response_size': this.responseText.length
            });
            
            if (this.status >= 400) {
              span.setStatus({ code: SpanStatusCode.ERROR });
            } else {
              span.setStatus({ code: SpanStatusCode.OK });
            }
            
            span.end();
          }
        });
        
        return originalSend.call(this, body);
      };
    }
  }

  private instrumentRouterEvents() {
    // Hook into Angular Router events if available
    if (typeof window !== 'undefined' && (window as any).ng) {
      // This would require more sophisticated Angular-specific code
      console.log('PepperLog: Angular router instrumentation enabled');
    }
  }
}

export class VueIntegration implements FrameworkIntegration {
  name: Framework = 'vue';

  initialize() {
    console.log('PepperLog: Initializing Vue integration');
    this.setupInstrumentation();
  }

  setupInstrumentation() {
    // Vue-specific instrumentation
    this.instrumentVueComponents();
    this.instrumentVueRouter();
  }

  private instrumentVueComponents() {
    if (typeof window !== 'undefined' && (window as any).Vue) {
      const tracer = trace.getTracer('pepper-log-vue');
      const Vue = (window as any).Vue;
      
      // Hook into Vue's component lifecycle
      const originalMixin = Vue.mixin;
      Vue.mixin({
        beforeCreate() {
          const span = tracer.startSpan('vue.component.create', {
            kind: SpanKind.INTERNAL,
            attributes: {
              'component.name': this.$options.name || 'anonymous'
            }
          });
          this._pepperLogSpan = span;
        },
        
        mounted() {
          if (this._pepperLogSpan) {
            this._pepperLogSpan.addEvent('component.mounted');
            this._pepperLogSpan.setStatus({ code: SpanStatusCode.OK });
            this._pepperLogSpan.end();
          }
        }
      });
    }
  }

  private instrumentVueRouter() {
    if (typeof window !== 'undefined' && (window as any).VueRouter) {
      const tracer = trace.getTracer('pepper-log-vue');
      // Vue Router instrumentation would go here
      console.log('PepperLog: Vue Router instrumentation enabled');
    }
  }
}

export class ExpressIntegration implements FrameworkIntegration {
  name: Framework = 'express';

  initialize() {
    console.log('PepperLog: Initializing Express integration');
    this.setupInstrumentation();
  }

  setupInstrumentation() {
    // Express middleware will be automatically instrumented by OpenTelemetry
    // Additional custom instrumentation can be added here
    console.log('PepperLog: Express auto-instrumentation enabled');
  }
}

export class NextJsIntegration implements FrameworkIntegration {
  name: Framework = 'nextjs';

  initialize() {
    console.log('PepperLog: Initializing Next.js integration');
    this.setupInstrumentation();
  }

  setupInstrumentation() {
    // Next.js specific instrumentation
    this.instrumentPageTransitions();
    this.instrumentApiRoutes();
  }

  private instrumentPageTransitions() {
    if (typeof window !== 'undefined' && (window as any).next) {
      const tracer = trace.getTracer('pepper-log-nextjs');
      
      // Hook into Next.js router
      if ((window as any).next.router) {
        const router = (window as any).next.router;
        const originalPush = router.push;
        
        router.push = function(...args: any[]) {
          const span = tracer.startSpan('nextjs.page.transition', {
            kind: SpanKind.CLIENT,
            attributes: {
              'page.route': args[0] || 'unknown'
            }
          });
          
          const result = originalPush.apply(this, args);
          
          if (result && typeof result.then === 'function') {
            result
              .then(() => span.setStatus({ code: SpanStatusCode.OK }))
              .catch((error: Error) => {
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                span.recordException(error);
              })
              .finally(() => span.end());
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
          }
          
          return result;
        };
      }
    }
  }

  private instrumentApiRoutes() {
    // API routes are automatically instrumented by OpenTelemetry Node.js SDK
    console.log('PepperLog: Next.js API routes instrumentation enabled');
  }
}

export class FrameworkIntegrationFactory {
  private static integrations: Map<Framework, FrameworkIntegration> = new Map([
    ['react', new ReactIntegration()],
    ['angular', new AngularIntegration()],
    ['vue', new VueIntegration()],
    ['express', new ExpressIntegration()],
    ['nextjs', new NextJsIntegration()]
  ]);

  public static getIntegration(framework: Framework): FrameworkIntegration | null {
    return this.integrations.get(framework) || null;
  }

  public static getSupportedFrameworks(): Framework[] {
    return Array.from(this.integrations.keys());
  }
}