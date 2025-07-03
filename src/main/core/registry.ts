import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
// import { validate } from 'fast-json-schema';
import { discoverAppleScriptApps, discoverShortcuts, DiscoveredTool } from './discovery';
import { exec } from 'child_process';
import { promisify } from 'util';
import { runUserIntent } from './intentParser';
import type { RunUserIntentResult } from './intentParser';
const execAsync = promisify(exec);

// Fallback to simple registry if TypeScript compilation fails
let SimpleRegistry: any;
try {
  const simpleRegistryModule = require('./registry-simple.js');
  SimpleRegistry = simpleRegistryModule.SimpleRegistry;
} catch (error) {
  console.log('Simple registry not available, using TypeScript version');
}

// Module-level API tools array
const apiTools: DiscoveredTool[] = [];

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

export class Registry {
  private plugins: Record<string, any> = {};
  private manifests: any[] = [];
  private pluginsDir: string;
  private debug: boolean;
  private simpleRegistry: any;
  private stats: RegistryStats = {
    totalPlugins: 0,
    loadedPlugins: 0,
    failedPlugins: 0,
    errors: []
  };
  private apiTools: DiscoveredTool[] = [];

  constructor() {
    // Fix the plugins directory path to be relative to the project root
    this.pluginsDir = path.join(process.cwd(), 'plugins');
    this.debug = process.env.DEBUG_MODE === 'true';
    
    // Use simple registry if available
    if (SimpleRegistry) {
      this.simpleRegistry = new SimpleRegistry();
    }
  }

  public async initialize(): Promise<void> {
    try {
      this.log('Initializing plugin registry...');
      this.log(`Plugins directory: ${this.pluginsDir}`);
      
      // Use simple registry if available
      if (this.simpleRegistry) {
        this.log('Using simple registry...');
        await this.simpleRegistry.initialize();
        this.plugins = this.simpleRegistry.plugins;
        this.manifests = this.simpleRegistry.manifests;
        this.stats.loadedPlugins = this.manifests.length;
        this.log(`Simple registry initialized: ${this.stats.loadedPlugins} plugins loaded`);
        this.log(`Available plugins: ${this.listPlugins().join(', ')}`);
        return;
      }
      
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
      const manifestYmlPath = path.join(pluginPath, 'manifest.yml');

      this.log(`Loading plugin from: ${pluginPath}`);

      let pluginModule: any;
      let manifest: any;
      
      // Check for YAML manifest first
      if (fs.existsSync(manifestYmlPath)) {
        this.log(`Loading YAML manifest: ${manifestYmlPath}`);
        const yamlContent = fs.readFileSync(manifestYmlPath, 'utf8');
        const yamlManifests = yaml.loadAll(yamlContent) as any[];
        
        // Load the JavaScript implementation
        if (fs.existsSync(indexJsPath)) {
          this.log(`Loading JavaScript plugin: ${indexJsPath}`);
          pluginModule = require(indexJsPath);
        } else {
          throw new Error(`YAML manifest found but no index.js implementation in ${pluginDir}`);
        }
        
        // Process each manifest in the YAML file
        for (const yamlManifest of yamlManifests) {
          if (yamlManifest.name && yamlManifest.description) {
            // Convert YAML manifest to expected format
            const convertedManifest = {
              name: yamlManifest.name,
              description: yamlManifest.description,
              parametersSchema: {
                type: 'object',
                properties: yamlManifest.parameters?.properties || {},
                required: yamlManifest.parameters?.required || []
              },
              kind: yamlManifest.kind,
              scopes: yamlManifest.scopes
            };
            
            // Check requirements and register
            if (this.requirementsMet(convertedManifest)) {
              this.manifests.push(convertedManifest);
              try {
                const plugin: Plugin = {
                  manifest: convertedManifest,
                  run: pluginModule.run
                };
                this.plugins[convertedManifest.name] = plugin;
                this.stats.loadedPlugins++;
                
                this.log(`Loaded YAML plugin: ${convertedManifest.name} (${convertedManifest.description})`);
              } catch (e) {
                this.stats.failedPlugins++;
                this.stats.errors.push(`${convertedManifest.name}: ${e}`);
              }
            } else {
              // Register fallback for missing capability
              this.manifests.push({
                name: 'fallback_request',
                description: `Missing capability for ${convertedManifest.name}`,
                parametersSchema: { 
                  type: 'object', 
                  properties: { reason: { type: 'string' } }, 
                  required: ['reason'] 
                }
              });
              this.stats.failedPlugins++;
              this.stats.errors.push(`${convertedManifest.name}: Missing capability`);
            }
          }
        }
        return; // YAML manifest handled, exit early
      }
      
      // Try to load JavaScript first, then TypeScript (legacy format)
      if (fs.existsSync(indexJsPath)) {
        this.log(`Loading JavaScript plugin: ${indexJsPath}`);
        pluginModule = require(indexJsPath);
      } else if (fs.existsSync(indexPath)) {
        this.log(`Loading TypeScript plugin: ${indexPath}`);
        pluginModule = await import(indexPath);
      } else {
        throw new Error(`No index.js, index.ts, or manifest.yml found in ${pluginDir}`);
      }

      // Validate plugin structure
      if (!pluginModule.manifest) {
        throw new Error(`Plugin ${pluginDir} missing manifest`);
      }

      if (!pluginModule.run || typeof pluginModule.run !== 'function') {
        throw new Error(`Plugin ${pluginDir} missing run export function`);
      }

      // Simple validation without fast-json-schema
      const legacyManifest = pluginModule.manifest;
      if (!legacyManifest.name || !legacyManifest.description || !legacyManifest.parametersSchema) {
        throw new Error(`Plugin ${pluginDir} missing required manifest fields`);
      }

      // Validate parameters schema
      const parametersSchema = legacyManifest.parametersSchema;
      if (!parametersSchema.type || parametersSchema.type !== 'object') {
        throw new Error(`Plugin ${pluginDir} parametersSchema must be an object type`);
      }

      // Check requirements (OAuth, app installed, etc.)
      if (this.requirementsMet(legacyManifest)) {
        this.manifests.push(legacyManifest);
        try {
          const plugin: Plugin = {
            manifest: legacyManifest,
            run: pluginModule.run
          };
          this.plugins[plugin.manifest.name] = plugin;
          this.stats.loadedPlugins++;
          
          this.log(`Loaded plugin: ${plugin.manifest.name} (${plugin.manifest.description})`);
        } catch (e) {
          // If plugin fails to load, fallback
          this.manifests.push({
            name: 'fallback_request',
            description: `Missing capability for ${legacyManifest.name}`,
            parametersSchema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] }
          });
          this.stats.failedPlugins++;
          this.stats.errors.push(`${legacyManifest.name}: ${e}`);
        }
      } else {
        // Register fallback_request for missing capability
        this.manifests.push({
          name: 'fallback_request',
          description: `Missing capability for ${legacyManifest.name}`,
          parametersSchema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] }
        });
        this.stats.failedPlugins++;
        this.stats.errors.push(`${legacyManifest.name}: Missing capability`);
      }
    } catch (error) {
      this.log(`Failed to load plugin ${pluginDir}:`, error);
      this.stats.failedPlugins++;
      this.stats.errors.push(`${pluginDir}: ${error}`);
    }
  }

  private requirementsMet(manifest: any): boolean {
    // T0: API - check OAuth token
    if (manifest.kind === 'api' && manifest.scopes) {
      // Check for OAuth token (pseudo-code, replace with your logic)
      return this.hasOAuthToken(manifest.scopes);
    }
    // T1: script - check if script file exists
    if (manifest.kind === 'script') {
      return true; // Assume script is present if manifest loaded
    }
    // T2: cli - check if CLI is available
    if (manifest.kind === 'cli') {
      return true; // Assume CLI is available for now
    }
    // T3: uia - check accessibility perms
    if (manifest.kind === 'uia') {
      return this.hasAccessibilityPerms();
    }
    // T4: vision-fallback - check user opt-in
    if (manifest.kind === 'vision-fallback') {
      return this.userOptedInVision();
    }
    return true;
  }

  private hasOAuthToken(scopes: string[]): boolean {
    // TODO: Implement real OAuth token check
    return false;
  }
  private hasAccessibilityPerms(): boolean {
    // TODO: Implement real accessibility check
    return true;
  }
  private userOptedInVision(): boolean {
    // TODO: Implement real user opt-in check
    return false;
  }

  public getManifests(): any[] {
    return this.manifests;
  }

  public getPlugin(name: string): Plugin | undefined {
    return this.plugins[name];
  }

  public async runPlugin(name: string, args: any, context: any): Promise<any> {
    // Use simple registry if available
    if (this.simpleRegistry) {
      return await this.simpleRegistry.runPlugin(name, args, context);
    }
    
    const plugin = this.plugins[name];
    
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
    return Object.keys(this.plugins);
  }

  public async reloadPlugin(name: string): Promise<boolean> {
    try {
      // Find the plugin directory
      const pluginDirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const pluginDir = pluginDirs.find(dir => {
        const plugin = this.plugins[dir];
        return plugin && plugin.manifest.name === name;
      });

      if (!pluginDir) {
        throw new Error(`Plugin directory for '${name}' not found`);
      }

      // Remove old plugin
      delete this.plugins[name];
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
    this.plugins = {};
    this.stats.loadedPlugins = 0;
    this.stats.failedPlugins = 0;
    this.stats.errors = [];

    // Rediscover and load plugins
    await this.discoverPlugins();
    
    this.log(`Plugin reload complete: ${this.stats.loadedPlugins} plugins loaded`);
  }

  public functionDeclarations(ctx?: any) {
    // Return only currently available tools (no fallback_request unless needed)
    return this.manifests.filter(m => m.name !== 'fallback_request');
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[PluginRegistry] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const registry = new Registry();

async function loadGeneratedScripts(): Promise<DiscoveredTool[]> {
  const dir = path.resolve(__dirname, '../../../plugins/generated');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.applescript'));
  return files.map(file => ({
    name: file.replace(/\.applescript$/, ''),
    description: `Generated AppleScript: ${file}`,
    type: 'applescript',
    command: path.join(dir, file),
  }));
}

// Register tools from OpenAPI schema
export function registerOpenApiTool(schema: any, provider: string) {
  // TODO: Parse OpenAPI schema and add tools for each operation
  // Placeholder: add a dummy tool for demonstration
  apiTools.push({
    name: `${provider}_dummy_api`,
    description: `Dummy API tool for ${provider}`,
    type: 'api',
    command: `${provider}:dummy`,
  });
}

export async function getAvailableTools(): Promise<DiscoveredTool[]> {
  const [appleScriptTools, shortcutTools, generatedTools] = await Promise.all([
    discoverAppleScriptApps(),
    discoverShortcuts(),
    loadGeneratedScripts(),
  ]);
  return [...appleScriptTools, ...shortcutTools, ...generatedTools, ...apiTools];
}

export type { DiscoveredTool } from './discovery';

// Permissions map: toolName -> granted
const toolPermissions: Record<string, boolean> = {};

// Request permission for a tool (stub: always grant for now)
export async function requestPermission(toolName: string): Promise<boolean> {
  // TODO: Show UI to user for permission request
  toolPermissions[toolName] = true;
  return true;
}

// Check if permission is granted
export function checkPermission(toolName: string): boolean {
  return !!toolPermissions[toolName];
}

export async function executeTool(tool: DiscoveredTool): Promise<{ success: boolean; output: string; error?: string }> {
  if (!checkPermission(tool.name)) {
    return { success: false, output: '', error: `Permission not granted for tool: ${tool.name}` };
  }
  try {
    let command = '';
    if (tool.type === 'applescript') {
      // Run the app via AppleScript
      command = `osascript -e 'tell application "${tool.command}" to activate'`;
    } else if (tool.type === 'shortcut') {
      // Run the shortcut via CLI
      command = `shortcuts run "${tool.command}"`;
    } else if (tool.type === 'api') {
      // TODO: Call API tool
      command = '';
    } else if (tool.type === 'meta') {
      // TODO: Handle meta-tools like run_pipeline
      command = '';
    } else {
      throw new Error('Unknown tool type');
    }
    if (command) {
      const { stdout } = await execAsync(command);
      return { success: true, output: stdout };
    } else {
      return { success: true, output: '' };
    }
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

// PipelineRunner: runs a sequence of commands, passing outputs as inputs
export async function runPipeline(commands: string[]): Promise<Array<{ success: boolean; output: string; error?: string }>> {
  const results: Array<{ success: boolean; output: string; error?: string }> = [];
  let lastOutput: any = undefined;
  for (const cmd of commands) {
    const input = typeof lastOutput === 'string' ? cmd.replace(/\{\{lastOutput\}\}/g, lastOutput) : cmd;
    const result = await runUserIntent(input);
    results.push(result);
    lastOutput = result.output || lastOutput;
    if (!result.success) break;
  }
  return results;
}

// Register run_pipeline as a meta-tool
apiTools.push({
  name: 'run_pipeline',
  description: 'Run a sequence of tool commands, passing outputs as needed.',
  type: 'meta',
  command: 'run_pipeline',
}); 