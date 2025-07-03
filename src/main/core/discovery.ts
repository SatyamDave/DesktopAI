import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiscoveredTool {
  name: string;
  description: string;
  type: 'applescript' | 'shortcut' | 'api' | 'meta';
  command: string;
}

// Discover AppleScript-enabled apps by listing apps in /Applications and checking for scripting support
export async function discoverAppleScriptApps(): Promise<DiscoveredTool[]> {
  // List apps in /Applications
  const { stdout } = await execAsync('ls /Applications/*.app | xargs -n 1 basename');
  const appNames = stdout.split('\n').filter(Boolean);
  const tools: DiscoveredTool[] = [];

  for (const app of appNames) {
    // Try to get AppleScript dictionary (if available)
    try {
      const script = `tell application \"${app.replace(/\.app$/, '')}\" to get the name`;
      await execAsync(`osascript -e '${script}'`);
      tools.push({
        name: app.replace(/\.app$/, ''),
        description: `AppleScript-enabled app: ${app.replace(/\.app$/, '')}`,
        type: 'applescript',
        command: app.replace(/\.app$/, ''),
      });
    } catch (e) {
      // Not AppleScript-enabled, skip
    }
  }
  return tools;
}

// Discover user Shortcuts using the 'shortcuts' CLI
export async function discoverShortcuts(): Promise<DiscoveredTool[]> {
  try {
    const { stdout } = await execAsync('shortcuts list');
    const shortcutNames = stdout.split('\n').filter(Boolean);
    return shortcutNames.map(name => ({
      name,
      description: `User Shortcut: ${name}`,
      type: 'shortcut',
      command: name,
    }));
  } catch (e) {
    return [];
  }
} 