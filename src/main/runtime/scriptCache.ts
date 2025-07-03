import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface CachedScript {
  id: string;
  name: string;
  description: string;
  script: string;
  language: 'applescript' | 'powershell' | 'javascript';
  parameters: Record<string, any>;
  created: Date;
  lastUsed: Date;
  successCount: number;
  failureCount: number;
  metadata: {
    generatedBy: string;
    originalRequest: string;
    tags: string[];
  };
}

export interface ScriptCache {
  scripts: Map<string, CachedScript>;
  cacheDir: string;
}

/**
 * Manages a cache of generated scripts for reuse
 */
export class ScriptCacheManager {
  private cache: ScriptCache;
  private cacheFile: string;
  
  constructor(cacheDir: string = join(process.cwd(), 'cache', 'scripts')) {
    this.cache = {
      scripts: new Map(),
      cacheDir
    };
    this.cacheFile = join(cacheDir, 'script-cache.json');
    this.ensureCacheDir();
    this.loadCache();
  }
  
  /**
   * Ensures the cache directory exists
   */
  private ensureCacheDir(): void {
    if (!existsSync(this.cache.cacheDir)) {
      mkdirSync(this.cache.cacheDir, { recursive: true });
    }
  }
  
  /**
   * Loads cached scripts from disk
   */
  private loadCache(): void {
    try {
      if (existsSync(this.cacheFile)) {
        const cacheData = JSON.parse(readFileSync(this.cacheFile, 'utf8'));
        
        // Convert back to Map and restore Date objects
        this.cache.scripts = new Map();
        for (const [id, scriptData] of Object.entries(cacheData.scripts || {})) {
          const script = scriptData as any;
          script.created = new Date(script.created);
          script.lastUsed = new Date(script.lastUsed);
          this.cache.scripts.set(id, script as CachedScript);
        }
      }
    } catch (error) {
      console.error('Error loading script cache:', error);
    }
  }
  
  /**
   * Saves cache to disk
   */
  private saveCache(): void {
    try {
      const cacheData = {
        scripts: Object.fromEntries(this.cache.scripts)
      };
      writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error('Error saving script cache:', error);
    }
  }
  
  /**
   * Generates a unique ID for a script based on its content and parameters
   */
  private generateScriptId(name: string, script: string, parameters: Record<string, any>): string {
    const content = `${name}:${script}:${JSON.stringify(parameters)}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
  
  /**
   * Stores a generated script in the cache
   */
  storeScript(
    name: string,
    description: string,
    script: string,
    language: 'applescript' | 'powershell' | 'javascript',
    parameters: Record<string, any>,
    originalRequest: string,
    tags: string[] = []
  ): string {
    const id = this.generateScriptId(name, script, parameters);
    
    const cachedScript: CachedScript = {
      id,
      name,
      description,
      script,
      language,
      parameters,
      created: new Date(),
      lastUsed: new Date(),
      successCount: 0,
      failureCount: 0,
      metadata: {
        generatedBy: 'microScriptGen',
        originalRequest,
        tags
      }
    };
    
    this.cache.scripts.set(id, cachedScript);
    this.saveCache();
    
    return id;
  }
  
  /**
   * Retrieves a script from cache by ID
   */
  getScript(id: string): CachedScript | undefined {
    const script = this.cache.scripts.get(id);
    if (script) {
      script.lastUsed = new Date();
      this.saveCache();
    }
    return script;
  }
  
  /**
   * Finds scripts by name or description
   */
  findScripts(query: string): CachedScript[] {
    const results: CachedScript[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const script of this.cache.scripts.values()) {
      if (
        script.name.toLowerCase().includes(lowerQuery) ||
        script.description.toLowerCase().includes(lowerQuery) ||
        script.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(script);
      }
    }
    
    return results.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }
  
  /**
   * Records a successful execution of a script
   */
  recordSuccess(id: string): void {
    const script = this.cache.scripts.get(id);
    if (script) {
      script.successCount++;
      script.lastUsed = new Date();
      this.saveCache();
    }
  }
  
  /**
   * Records a failed execution of a script
   */
  recordFailure(id: string): void {
    const script = this.cache.scripts.get(id);
    if (script) {
      script.failureCount++;
      script.lastUsed = new Date();
      this.saveCache();
    }
  }
  
  /**
   * Removes a script from cache
   */
  removeScript(id: string): boolean {
    const removed = this.cache.scripts.delete(id);
    if (removed) {
      this.saveCache();
    }
    return removed;
  }
  
  /**
   * Cleans up old or failed scripts
   */
  cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000, // 30 days
          maxFailureRate: number = 0.8): void {
    const now = new Date();
    const toRemove: string[] = [];
    
    for (const [id, script] of this.cache.scripts.entries()) {
      const age = now.getTime() - script.created.getTime();
      const totalExecutions = script.successCount + script.failureCount;
      const failureRate = totalExecutions > 0 ? script.failureCount / totalExecutions : 0;
      
      if (age > maxAge || failureRate > maxFailureRate) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.cache.scripts.delete(id);
    }
    
    if (toRemove.length > 0) {
      this.saveCache();
      console.log(`Cleaned up ${toRemove.length} scripts from cache`);
    }
  }
  
  /**
   * Gets cache statistics
   */
  getStats(): {
    totalScripts: number;
    totalSuccesses: number;
    totalFailures: number;
    averageSuccessRate: number;
  } {
    let totalSuccesses = 0;
    let totalFailures = 0;
    
    for (const script of this.cache.scripts.values()) {
      totalSuccesses += script.successCount;
      totalFailures += script.failureCount;
    }
    
    const totalExecutions = totalSuccesses + totalFailures;
    const averageSuccessRate = totalExecutions > 0 ? totalSuccesses / totalExecutions : 0;
    
    return {
      totalScripts: this.cache.scripts.size,
      totalSuccesses,
      totalFailures,
      averageSuccessRate
    };
  }
  
  /**
   * Exports all scripts as a tool catalog for the registry
   */
  exportAsTools(): any[] {
    const tools: any[] = [];
    
    for (const script of this.cache.scripts.values()) {
      // Only export scripts with good success rates
      const totalExecutions = script.successCount + script.failureCount;
      const successRate = totalExecutions > 0 ? script.successCount / totalExecutions : 0;
      
      if (successRate >= 0.5 || totalExecutions < 3) {
        tools.push({
          name: `gen_${script.id}`,
          description: script.description,
          parameters: {
            type: 'object',
            properties: script.parameters,
            required: Object.keys(script.parameters)
          },
          exec: {
            type: 'generated',
            scriptId: script.id,
            language: script.language
          }
        });
      }
    }
    
    return tools;
  }
} 