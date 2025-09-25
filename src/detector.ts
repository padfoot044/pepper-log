import * as fs from 'fs';
import * as path from 'path';
import { Framework, DetectedFramework } from './types';

export class FrameworkDetector {
  private static instance: FrameworkDetector;
  
  public static getInstance(): FrameworkDetector {
    if (!FrameworkDetector.instance) {
      FrameworkDetector.instance = new FrameworkDetector();
    }
    return FrameworkDetector.instance;
  }

  /**
   * Auto-detect the framework being used
   */
  public detectFramework(): DetectedFramework | null {
    // Try multiple detection methods in order of confidence
    const detectionMethods = [
      () => this.detectFromPackageJson(),
      () => this.detectFromRuntime(),
      () => this.detectFromFileStructure(),
      () => this.detectFromEnvironment()
    ];

    for (const method of detectionMethods) {
      const result = method();
      if (result && result.confidence > 0.7) {
        return result;
      }
    }

    // Return the best guess even if confidence is low
    const results = detectionMethods.map(method => method()).filter(Boolean);
    if (results.length > 0) {
      return results.sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))[0] || null;
    }

    return null;
  }

  /**
   * Detect framework from package.json dependencies
   */
  private detectFromPackageJson(): DetectedFramework | null {
    try {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      // Framework detection with priority order
      const frameworkChecks: Array<{ 
        framework: Framework; 
        dependencies: string[]; 
        confidence: number;
      }> = [
        { framework: 'nextjs', dependencies: ['next'], confidence: 0.95 },
        { framework: 'angular', dependencies: ['@angular/core', '@angular/common'], confidence: 0.95 },
        { framework: 'react', dependencies: ['react'], confidence: 0.9 },
        { framework: 'vue', dependencies: ['vue'], confidence: 0.9 },
        { framework: 'express', dependencies: ['express'], confidence: 0.8 },
        { framework: 'fastify', dependencies: ['fastify'], confidence: 0.8 },
        { framework: 'koa', dependencies: ['koa'], confidence: 0.8 }
      ];

      for (const check of frameworkChecks) {
        const hasRequiredDeps = check.dependencies.some(dep => allDeps[dep]);
        if (hasRequiredDeps) {
          const version = check.dependencies
            .map(dep => allDeps[dep])
            .find(v => v);
          
          return {
            name: check.framework,
            version: this.cleanVersion(version),
            confidence: check.confidence,
            source: 'package.json'
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('PepperLog: Failed to detect framework from package.json:', error);
      return null;
    }
  }

  /**
   * Detect framework from runtime environment
   */
  private detectFromRuntime(): DetectedFramework | null {
    try {
      // Browser environment checks
      if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
        const win = globalThis as any;
        if (win.window?.React) {
          return { name: 'react', confidence: 0.8, source: 'runtime' };
        }
        if (win.window?.Vue) {
          return { name: 'vue', confidence: 0.8, source: 'runtime' };
        }
        if (win.window?.ng || win.window?.getAllAngularRootElements) {
          return { name: 'angular', confidence: 0.8, source: 'runtime' };
        }
      }

      // Node.js environment checks
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Check for loaded modules
        const moduleCache = require.cache;
        
        if (Object.keys(moduleCache).some(key => key.includes('next'))) {
          return { name: 'nextjs', confidence: 0.7, source: 'runtime' };
        }
        
        if (Object.keys(moduleCache).some(key => key.includes('express'))) {
          return { name: 'express', confidence: 0.6, source: 'runtime' };
        }
      }

      return null;
    } catch (error) {
      console.warn('PepperLog: Failed to detect framework from runtime:', error);
      return null;
    }
  }

  /**
   * Detect framework from file structure
   */
  private detectFromFileStructure(): DetectedFramework | null {
    try {
      const cwd = process.cwd();
      
      // Check for framework-specific config files
      const configFiles = [
        { file: 'next.config.js', framework: 'nextjs' as Framework, confidence: 0.9 },
        { file: 'next.config.ts', framework: 'nextjs' as Framework, confidence: 0.9 },
        { file: 'angular.json', framework: 'angular' as Framework, confidence: 0.95 },
        { file: 'vue.config.js', framework: 'vue' as Framework, confidence: 0.9 },
        { file: 'nuxt.config.js', framework: 'vue' as Framework, confidence: 0.8 }
      ];

      for (const config of configFiles) {
        if (fs.existsSync(path.join(cwd, config.file))) {
          return {
            name: config.framework,
            confidence: config.confidence,
            source: 'files'
          };
        }
      }

      // Check for typical folder structures
      const folderChecks = [
        { folder: 'src/app', framework: 'angular' as Framework, confidence: 0.6 },
        { folder: 'pages', framework: 'nextjs' as Framework, confidence: 0.5 },
        { folder: 'src/components', framework: 'react' as Framework, confidence: 0.4 }
      ];

      for (const check of folderChecks) {
        if (fs.existsSync(path.join(cwd, check.folder))) {
          return {
            name: check.framework,
            confidence: check.confidence,
            source: 'files'
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('PepperLog: Failed to detect framework from file structure:', error);
      return null;
    }
  }

  /**
   * Detect framework from environment variables
   */
  private detectFromEnvironment(): DetectedFramework | null {
    try {
      const env = process.env;

      if (env.NEXT_RUNTIME || env.__NEXT_PRIVATE_PREBUNDLED_REACT) {
        return { name: 'nextjs', confidence: 0.8, source: 'environment' };
      }

      if (env.NODE_ENV && env.npm_lifecycle_event) {
        const script = env.npm_lifecycle_event;
        if (script.includes('next')) {
          return { name: 'nextjs', confidence: 0.6, source: 'environment' };
        }
        if (script.includes('angular') || script.includes('ng')) {
          return { name: 'angular', confidence: 0.6, source: 'environment' };
        }
      }

      return null;
    } catch (error) {
      console.warn('PepperLog: Failed to detect framework from environment:', error);
      return null;
    }
  }

  /**
   * Clean version string to extract version number
   */
  private cleanVersion(version?: string): string | undefined {
    if (!version) return undefined;
    
    // Remove semver prefixes like ^, ~, >=, etc.
    const cleanedVersion = version.replace(/^[\^~>=<]*/, '');
    return cleanedVersion || undefined;
  }
}