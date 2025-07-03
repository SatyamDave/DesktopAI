import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface DiscoveredTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  exec: {
    type: 'applescript' | 'shortcut';
    bundle: string;
    verb: string;
    args?: Record<string, any>;
  };
}

export interface AppInfo {
  bundleId: string;
  name: string;
  path: string;
}

/**
 * Scans /Applications for .app bundles and extracts their AppleScript capabilities
 */
export async function scanMacApps(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  const appsDir = '/Applications';
  
  try {
    const appFolders = readdirSync(appsDir).filter(name => name.endsWith('.app'));
    
    for (const appFolder of appFolders) {
      const appPath = join(appsDir, appFolder);
      const appInfo = await getAppInfo(appPath);
      
      if (appInfo) {
        const appTools = await extractAppCommands(appInfo);
        tools.push(...appTools);
      }
    }
  } catch (error) {
    console.error('Error scanning Mac apps:', error);
  }
  
  return tools;
}

/**
 * Gets bundle ID and name for an app
 */
async function getAppInfo(appPath: string): Promise<AppInfo | null> {
  try {
    const infoPlistPath = join(appPath, 'Contents', 'Info.plist');
    if (!existsSync(infoPlistPath)) return null;
    
    // Extract bundle ID using defaults command
    const bundleId = execSync(`defaults read "${infoPlistPath}" CFBundleIdentifier`, { encoding: 'utf8' }).trim();
    
    // Extract app name
    const appName = execSync(`defaults read "${infoPlistPath}" CFBundleName`, { encoding: 'utf8' }).trim();
    
    return {
      bundleId,
      name: appName,
      path: appPath
    };
  } catch (error) {
    // App might not have readable Info.plist or no bundle ID
    return null;
  }
}

/**
 * Extracts AppleScript commands from an app using sdef and sdp
 */
async function extractAppCommands(appInfo: AppInfo): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  
  try {
    // Generate sdef output
    const sdefOutput = execSync(`sdef "${appInfo.path}"`, { encoding: 'utf8' });
    
    // Parse the sdef output for command definitions
    const commands = parseSdefCommands(sdefOutput, appInfo);
    tools.push(...commands);
    
  } catch (error) {
    // App might not have AppleScript dictionary or sdef failed
    console.debug(`No AppleScript dictionary for ${appInfo.name}:`, error instanceof Error ? error.message : String(error));
  }
  
  return tools;
}

/**
 * Parses sdef output to extract command definitions
 */
function parseSdefCommands(sdefOutput: string, appInfo: AppInfo): DiscoveredTool[] {
  const tools: DiscoveredTool[] = [];
  
  // Split into lines and look for command definitions
  const lines = sdefOutput.split('\n');
  let inCommand = false;
  let currentCommand = '';
  let currentParams: Record<string, any> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for command start
    if (trimmed.startsWith('<command name=')) {
      inCommand = true;
      const match = trimmed.match(/name="([^"]+)"/);
      if (match) {
        currentCommand = match[1];
        currentParams = {};
      }
    }
    
    // Look for parameter definitions within commands
    if (inCommand && trimmed.startsWith('<parameter name=')) {
      const paramMatch = trimmed.match(/name="([^"]+)" type="([^"]+)"/);
      if (paramMatch) {
        const [, paramName, paramType] = paramMatch;
        currentParams[paramName] = {
          type: mapSdefTypeToJson(paramType),
          description: `Parameter ${paramName} for ${currentCommand}`
        };
      }
    }
    
    // Look for command end
    if (inCommand && trimmed === '</command>') {
      if (currentCommand) {
        tools.push({
          name: `app_${appInfo.bundleId}_${currentCommand}`,
          description: `AppleScript '${currentCommand}' command on ${appInfo.name}`,
          parameters: {
            type: 'object',
            properties: currentParams,
            required: Object.keys(currentParams)
          },
          exec: {
            type: 'applescript',
            bundle: appInfo.bundleId,
            verb: currentCommand
          }
        });
      }
      
      inCommand = false;
      currentCommand = '';
      currentParams = {};
    }
  }
  
  return tools;
}

/**
 * Maps sdef types to JSON schema types
 */
function mapSdefTypeToJson(sdefType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'integer': 'number',
    'real': 'number',
    'boolean': 'boolean',
    'list': 'array',
    'record': 'object',
    'date': 'string',
    'file': 'string'
  };
  
  return typeMap[sdefType] || 'string';
}

/**
 * Scans macOS Shortcuts for available actions
 */
export async function scanShortcuts(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  
  try {
    // List all shortcuts
    const shortcutsList = execSync('shortcuts list', { encoding: 'utf8' });
    const shortcuts = shortcutsList.split('\n').filter(line => line.trim());
    
    for (const shortcut of shortcuts) {
      try {
        // Get shortcut details
        const shortcutInfo = execSync(`shortcuts info "${shortcut}"`, { encoding: 'utf8' });
        
        tools.push({
          name: `shortcut_${shortcut.replace(/[^a-zA-Z0-9]/g, '_')}`,
          description: `Run macOS Shortcut: ${shortcut}`,
          parameters: {
            type: 'object',
            properties: {
              input: {
                type: 'string',
                description: 'Input to pass to the shortcut'
              }
            }
          },
          exec: {
            type: 'shortcut',
            bundle: shortcut,
            verb: 'run'
          }
        });
      } catch (error) {
        console.debug(`Could not get info for shortcut ${shortcut}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.error('Error scanning Shortcuts:', error);
  }
  
  return tools;
} 