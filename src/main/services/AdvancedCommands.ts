import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { shell } from 'electron';
import { Command } from './CommandRegistry';

const execAsync = promisify(exec);

// File Operations
export const fileCommands: Command[] = [
  {
    name: 'create-file',
    match: (intent, actions) => intent === 'create-file' || actions.some(a => a.includes('create') && a.includes('file')),
    execute: async (actions, context) => {
      const fileName = actions.find(a => a.includes('.'));
      if (!fileName) return { success: false, message: 'No filename specified.' };
      try {
        fs.writeFileSync(fileName, '');
        return { success: true, message: `Created file: ${fileName}` };
      } catch (err) {
        return { success: false, message: `Failed to create file: ${err}` };
      }
    }
  },
  {
    name: 'open-file',
    match: (intent, actions) => intent === 'open-file' || actions.some(a => a.includes('open') && a.includes('file')),
    execute: async (actions, context) => {
      const fileName = actions.find(a => a.includes('.'));
      if (!fileName) return { success: false, message: 'No filename specified.' };
      try {
        shell.openPath(fileName);
        return { success: true, message: `Opened file: ${fileName}` };
      } catch (err) {
        return { success: false, message: `Failed to open file: ${err}` };
      }
    }
  },
  {
    name: 'search-files',
    match: (intent, actions) => intent === 'search-files' || actions.some(a => a.includes('search') && a.includes('file')),
    execute: async (actions, context) => {
      const query = actions.find(a => !a.includes('search') && !a.includes('file'));
      if (!query) return { success: false, message: 'No search query specified.' };
      try {
        const { stdout } = await execAsync(`dir /s /b *${query}*`, { windowsHide: true });
        return { success: true, message: `Found files:\n${stdout}` };
      } catch (err) {
        return { success: false, message: `Search failed: ${err}` };
      }
    }
  }
];

// App Control
export const appCommands: Command[] = [
  {
    name: 'launch-app',
    match: (intent, actions) => intent === 'launch-app' || actions.some(a => a.includes('launch') || a.includes('open')),
    execute: async (actions, context) => {
      const appName = actions.find(a => !a.includes('launch') && !a.includes('open'));
      if (!appName) return { success: false, message: 'No app specified.' };
      try {
        shell.openExternal(appName);
        return { success: true, message: `Launched: ${appName}` };
      } catch (err) {
        return { success: false, message: `Failed to launch: ${err}` };
      }
    }
  },
  {
    name: 'close-app',
    match: (intent, actions) => intent === 'close-app' || actions.some(a => a.includes('close') && a.includes('app')),
    execute: async (actions, context) => {
      const appName = actions.find(a => !a.includes('close') && !a.includes('app'));
      if (!appName) return { success: false, message: 'No app specified.' };
      try {
        await execAsync(`taskkill /f /im ${appName}.exe`, { windowsHide: true });
        return { success: true, message: `Closed: ${appName}` };
      } catch (err) {
        return { success: false, message: `Failed to close: ${err}` };
      }
    }
  }
];

// Web Automation
export const webCommands: Command[] = [
  {
    name: 'open-url',
    match: (intent, actions) => intent === 'open-url' || actions.some(a => a.includes('http')),
    execute: async (actions, context) => {
      const url = actions.find(a => a.startsWith('http'));
      if (!url) return { success: false, message: 'No URL found.' };
      try {
        shell.openExternal(url);
        return { success: true, message: `Opened: ${url}` };
      } catch (err) {
        return { success: false, message: `Failed to open URL: ${err}` };
      }
    }
  },
  {
    name: 'search-web',
    match: (intent, actions) => intent === 'search-web' || actions.some(a => a.includes('search') && a.includes('web')),
    execute: async (actions, context) => {
      const query = actions.find(a => !a.includes('search') && !a.includes('web'));
      if (!query) return { success: false, message: 'No search query specified.' };
      try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        shell.openExternal(searchUrl);
        return { success: true, message: `Searching for: ${query}` };
      } catch (err) {
        return { success: false, message: `Search failed: ${err}` };
      }
    }
  }
];

// System Control
export const systemCommands: Command[] = [
  {
    name: 'system-info',
    match: (intent, actions) => intent === 'system-info' || actions.some(a => a.includes('system') && a.includes('info')),
    execute: async (actions, context) => {
      try {
        const { stdout } = await execAsync('systeminfo', { windowsHide: true });
        return { success: true, message: `System Info:\n${stdout.substring(0, 500)}...` };
      } catch (err) {
        return { success: false, message: `Failed to get system info: ${err}` };
      }
    }
  },
  {
    name: 'screenshot',
    match: (intent, actions) => intent === 'screenshot' || actions.some(a => a.includes('screenshot')),
    execute: async (actions, context) => {
      try {
        const { stdout } = await execAsync('snippingtool', { windowsHide: true });
        return { success: true, message: 'Screenshot tool opened' };
      } catch (err) {
        return { success: false, message: `Screenshot failed: ${err}` };
      }
    }
  },
  {
    name: 'volume-control',
    match: (intent, actions) => intent === 'volume-control' || actions.some(a => a.includes('volume')),
    execute: async (actions, context) => {
      const action = actions.find(a => a.includes('up') || a.includes('down') || a.includes('mute'));
      if (!action) return { success: false, message: 'No volume action specified.' };
      try {
        if (action.includes('up')) {
          await execAsync('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"');
        } else if (action.includes('down')) {
          await execAsync('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"');
        } else if (action.includes('mute')) {
          await execAsync('powershell -command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
        }
        return { success: true, message: `Volume ${action}` };
      } catch (err) {
        return { success: false, message: `Volume control failed: ${err}` };
      }
    }
  }
];

// Workflow Macros
export const workflowCommands: Command[] = [
  {
    name: 'workflow-morning',
    match: (intent, actions) => intent === 'workflow-morning' || actions.some(a => a.includes('morning')),
    execute: async (actions, context) => {
      try {
        // Open common morning apps
        await Promise.all([
          shell.openExternal('https://mail.google.com'),
          shell.openExternal('https://calendar.google.com'),
          execAsync('notepad', { windowsHide: true })
        ]);
        return { success: true, message: 'Morning workflow executed: Email, Calendar, and Notepad opened' };
      } catch (err) {
        return { success: false, message: `Morning workflow failed: ${err}` };
      }
    }
  },
  {
    name: 'workflow-coding',
    match: (intent, actions) => intent === 'workflow-coding' || actions.some(a => a.includes('coding')),
    execute: async (actions, context) => {
      try {
        // Open coding tools
        await Promise.all([
          shell.openExternal('https://github.com'),
          shell.openExternal('https://stackoverflow.com'),
          execAsync('code', { windowsHide: true })
        ]);
        return { success: true, message: 'Coding workflow executed: GitHub, Stack Overflow, and VS Code opened' };
      } catch (err) {
        return { success: false, message: `Coding workflow failed: ${err}` };
      }
    }
  }
];

export const allCommands = [
  ...fileCommands,
  ...appCommands,
  ...webCommands,
  ...systemCommands,
  ...workflowCommands
]; 