import * as fs from 'fs';
import * as path from 'path';
// import { validate } from 'fast-json-schema';

export interface PluginManifest {
  name: string;
  description: string;
  parametersSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  version?: string;
  author?: string;
}

export interface Plugin {
  manifest: PluginManifest;
  run: (args: any, context: any) => Promise<any>;
}

export interface RegistryStats {
  totalPlugins: number;
  loadedPlugins: number;
  failedPlugins: number;
  errors: string[];
}

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsDir: string;
  private debug: boolean;
  private stats: RegistryStats = {
    totalPlugins: 0,
    loadedPlugins: 0,
    failedPlugins: 0,
    errors: []
  };

  constructor() {
    // Fix the plugins directory path to be relative to the project root
    this.pluginsDir = path.join(process.cwd(), 'plugins');
    this.debug = process.env.DEBUG_MODE === 'true';
  }

  public async initialize(): Promise<void> {
    try {
      this.log('Initializing plugin registry...');
      this.log(`Plugins directory: ${this.pluginsDir}`);
      
      if (!fs.existsSync(this.pluginsDir)) {
        this.log('Plugins directory does not exist, creating...');
        fs.mkdirSync(this.pluginsDir, { recursive: true });
      }

      await this.discoverPlugins();
      this.log(`Registry initialized: ${this.stats.loadedPlugins} plugins loaded`);
      this.log(`Available plugins: ${this.listPlugins().join(', ')}`);
    } catch (error) {
      this.log('Error initializing registry:', error);
      throw error;
    }
  }

  private async discoverPlugins(): Promise<void> {
    try {
      const pluginDirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      this.stats.totalPlugins = pluginDirs.length;
      this.log(`Found ${pluginDirs.length} plugin directories`);

      for (const pluginDir of pluginDirs) {
        await this.loadPlugin(pluginDir);
      }
    } catch (error) {
      this.log('Error discovering plugins:', error);
      this.stats.errors.push(`Discovery error: ${error}`);
    }
  }

  private async loadPlugin(pluginDir: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsDir, pluginDir);
      const indexPath = path.join(pluginPath, 'index.ts');
      const indexJsPath = path.join(pluginPath, 'index.js');

      this.log(`Loading plugin from: ${pluginPath}`);
      this.log(`Checking for index.ts: ${indexPath}`);
      this.log(`Checking for index.js: ${indexJsPath}`);

      let pluginModule: any;
      
      // Try to load JavaScript first, then TypeScript
      if (fs.existsSync(indexJsPath)) {
        this.log(`Loading JavaScript plugin: ${indexJsPath}`);
        pluginModule = require(indexJsPath);
      } else if (fs.existsSync(indexPath)) {
        this.log(`Loading TypeScript plugin: ${indexPath}`);
        pluginModule = await import(indexPath);
      } else {
        throw new Error(`No index.js or index.ts found in ${pluginDir}`);
      }

      // Validate plugin structure
      if (!pluginModule.manifest) {
        throw new Error(`Plugin ${pluginDir} missing manifest`);
      }

      if (!pluginModule.run || typeof pluginModule.run !== 'function') {
        throw new Error(`Plugin ${pluginDir} missing run export function`);
      }

      // Validate manifest schema
      const manifestSchema = {
        type: 'object',
        required: ['name', 'description', 'parametersSchema'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          parametersSchema: { type: 'object' },
          version: { type: 'string' },
          author: { type: 'string' }
        }
      };

      // Simple validation without fast-json-schema
      const manifest = pluginModule.manifest;
      if (!manifest.name || !manifest.description || !manifest.parametersSchema) {
        throw new Error(`Plugin ${pluginDir} missing required manifest fields`);
      }

      // Validate parameters schema
      const parametersSchema = pluginModule.manifest.parametersSchema;
      if (!parametersSchema.type || parametersSchema.type !== 'object') {
        throw new Error(`Plugin ${pluginDir} parametersSchema must be an object type`);
      }

      const plugin: Plugin = {
        manifest: pluginModule.manifest,
        run: pluginModule.run
      };

      this.plugins.set(plugin.manifest.name, plugin);
      this.stats.loadedPlugins++;
      
      this.log(`Loaded plugin: ${plugin.manifest.name} (${plugin.manifest.description})`);

    } catch (error) {
      this.log(`Failed to load plugin ${pluginDir}:`, error);
      this.stats.failedPlugins++;
      this.stats.errors.push(`${pluginDir}: ${error}`);
    }
  }

  public getManifests(): any[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.manifest.name,
      description: plugin.manifest.description,
      parameters: plugin.manifest.parametersSchema
    }));
  }

  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  public async runPlugin(name: string, args: any, context: any): Promise<any> {
    const plugin = this.plugins.get(name);
    
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    try {
      this.log(`Running plugin: ${name} with args:`, args);
      
      // Simple argument validation without fast-json-schema
      const requiredParams = plugin.manifest.parametersSchema.required || [];
      for (const param of requiredParams) {
        if (args[param] === undefined) {
          throw new Error(`Missing required parameter: ${param}`);
        }
      }

      const result = await plugin.run(args, context);
      
      this.log(`Plugin ${name} completed successfully`);
      return result;
      
    } catch (error) {
      this.log(`Plugin ${name} failed:`, error);
      throw error;
    }
  }

  public getStats(): RegistryStats {
    return { ...this.stats };
  }

  public listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  public async reloadPlugin(name: string): Promise<boolean> {
    try {
      // Find the plugin directory
      const pluginDirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const pluginDir = pluginDirs.find(dir => {
        const plugin = this.plugins.get(dir);
        return plugin && plugin.manifest.name === name;
      });

      if (!pluginDir) {
        throw new Error(`Plugin directory for '${name}' not found`);
      }

      // Remove old plugin
      this.plugins.delete(name);
      this.stats.loadedPlugins--;

      // Reload plugin
      await this.loadPlugin(pluginDir);
      
      this.log(`Plugin ${name} reloaded successfully`);
      return true;
      
    } catch (error) {
      this.log(`Failed to reload plugin ${name}:`, error);
      return false;
    }
  }

  public async reloadAllPlugins(): Promise<void> {
    this.log('Reloading all plugins...');
    
    // Clear current plugins
    this.plugins.clear();
    this.stats.loadedPlugins = 0;
    this.stats.failedPlugins = 0;
    this.stats.errors = [];

    // Rediscover and load plugins
    await this.discoverPlugins();
    
    this.log(`Plugin reload complete: ${this.stats.loadedPlugins} plugins loaded`);
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[PluginRegistry] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const registry = new PluginRegistry(); 