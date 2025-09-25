import { Framework, DetectedFramework } from './types';

/**
 * Browser-only framework detector
 * Uses runtime inspection without Node.js dependencies
 */
export class BrowserFrameworkDetector {
  private static instance: BrowserFrameworkDetector;
  
  public static getInstance(): BrowserFrameworkDetector {
    if (!BrowserFrameworkDetector.instance) {
      BrowserFrameworkDetector.instance = new BrowserFrameworkDetector();
    }
    return BrowserFrameworkDetector.instance;
  }

  /**
   * Detect framework from browser runtime environment
   */
  public detectFramework(): DetectedFramework | null {
    // Check global variables and runtime environment
    const detectionResults = [
      this.detectAngular(),
      this.detectReact(),
      this.detectVue(),
      this.detectNextJS(),
      this.detectFromUserAgent(),
      this.detectFromDOM()
    ].filter(Boolean);

    if (detectionResults.length === 0) {
      return null;
    }

    // Return the highest confidence detection
    return detectionResults.sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))[0] || null;
  }

  private detectAngular(): DetectedFramework | null {
    try {
      // Check for Angular global variables
      const win = window as any;
      
      if (win.ng) {
        return {
          name: 'angular',
          version: win.ng.version?.full || 'unknown',
          confidence: 0.95,
          source: 'runtime'
        };
      }

      // Check for Angular elements in DOM
      const angularElements = document.querySelectorAll('[ng-version], app-root, [_nghost], [_ngcontent]');
      if (angularElements.length > 0) {
        const versionAttr = document.querySelector('[ng-version]')?.getAttribute('ng-version');
        return {
          name: 'angular',
          version: versionAttr || 'unknown',
          confidence: 0.9,
          source: 'runtime'
        };
      }

      // Check for Angular in script tags or modules
      const scripts = Array.from(document.scripts);
      const hasAngularScript = scripts.some(script => 
        script.src.includes('angular') || script.textContent?.includes('@angular')
      );
      
      if (hasAngularScript) {
        return {
          name: 'angular',
          version: 'unknown',
          confidence: 0.7,
          source: 'runtime'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private detectReact(): DetectedFramework | null {
    try {
      const win = window as any;
      
      // Check for React global
      if (win.React) {
        return {
          name: 'react',
          version: win.React.version || 'unknown',
          confidence: 0.95,
          source: 'runtime'
        };
      }

      // Check for React DevTools
      if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        return {
          name: 'react',
          version: 'unknown',
          confidence: 0.8,
          source: 'runtime'
        };
      }

      // Check for React DOM elements
      const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
      if (reactElements.length > 0) {
        return {
          name: 'react',
          version: 'unknown',
          confidence: 0.7,
          source: 'runtime'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private detectVue(): DetectedFramework | null {
    try {
      const win = window as any;
      
      // Check for Vue global
      if (win.Vue) {
        return {
          name: 'vue',
          version: win.Vue.version || 'unknown',
          confidence: 0.95,
          source: 'runtime'
        };
      }

      // Check for Vue app instance
      if (win.__VUE__) {
        return {
          name: 'vue',
          version: 'unknown',
          confidence: 0.8,
          source: 'runtime'
        };
      }

      // Check for Vue elements
      const vueElements = document.querySelectorAll('[v-cloak], [data-v-], #app[data-server-rendered]');
      if (vueElements.length > 0) {
        return {
          name: 'vue',
          version: 'unknown',
          confidence: 0.7,
          source: 'runtime'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private detectNextJS(): DetectedFramework | null {
    try {
      const win = window as any;
      
      // Check for Next.js global
      if (win.__NEXT_DATA__ || win.__NEXT_ROUTER__) {
        return {
          name: 'nextjs',
          version: 'unknown',
          confidence: 0.9,
          source: 'runtime'
        };
      }

      // Check for Next.js specific elements
      const nextElements = document.querySelectorAll('#__next, [data-nextjs-scroll-focus-boundary]');
      if (nextElements.length > 0) {
        return {
          name: 'nextjs',
          version: 'unknown',
          confidence: 0.8,
          source: 'runtime'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private detectFromUserAgent(): DetectedFramework | null {
    try {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // This is a fallback method with low confidence
      if (userAgent.includes('electron')) {
        return {
          name: 'custom', // electron is not in our Framework type
          version: 'unknown',
          confidence: 0.5,
          source: 'runtime'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private detectFromDOM(): DetectedFramework | null {
    try {
      // Generic framework detection from meta tags
      const metaTags = Array.from(document.querySelectorAll('meta[name*="framework"], meta[name*="generator"]'));
      
      for (const meta of metaTags) {
        const content = meta.getAttribute('content')?.toLowerCase() || '';
        const name = meta.getAttribute('name')?.toLowerCase() || '';
        
        if (content.includes('angular') || name.includes('angular')) {
          return { name: 'angular', version: 'unknown', confidence: 0.6, source: 'runtime' };
        }
        if (content.includes('react') || name.includes('react')) {
          return { name: 'react', version: 'unknown', confidence: 0.6, source: 'runtime' };
        }
        if (content.includes('vue') || name.includes('vue')) {
          return { name: 'vue', version: 'unknown', confidence: 0.6, source: 'runtime' };
        }
        if (content.includes('next') || name.includes('next')) {
          return { name: 'nextjs', version: 'unknown', confidence: 0.6, source: 'runtime' };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get browser environment info
   */
  public getBrowserInfo() {
    try {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth
        },
        location: {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname
        }
      };
    } catch {
      return null;
    }
  }
}