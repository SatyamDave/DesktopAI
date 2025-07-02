const { shell } = require('electron');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

const manifest = {
  name: "open_app",
  description: "Open or launch an application on the system",
  parametersSchema: {
    type: "object",
    properties: {
      appName: {
        type: "string",
        description: "Name of the application to open (e.g., 'chrome', 'spotify', 'notepad')"
      },
      fallbackToWeb: {
        type: "boolean",
        description: "Whether to fallback to web version if app is not found",
        default: true
      }
    },
    required: ["appName"]
  },
  version: "1.0.0",
  author: "Friday Team"
};

// Common app mappings with fallbacks
const appMappings = {
  chrome: {
    paths: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    webFallback: 'https://www.google.com'
  },
  firefox: {
    paths: [
      '/Applications/Firefox.app/Contents/MacOS/firefox',
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
    ]
  },
  spotify: {
    paths: [
      '/Applications/Spotify.app/Contents/MacOS/Spotify',
      'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Spotify\\Spotify.exe',
      'C:\\Program Files\\WindowsApps\\SpotifyAB.SpotifyMusic_*\\Spotify.exe'
    ],
    webFallback: 'https://open.spotify.com'
  },
  vscode: {
    paths: [
      '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
      'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
      '/usr/bin/code'
    ]
  },
  terminal: {
    paths: [
      '/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal',
      'C:\\Windows\\System32\\cmd.exe',
      '/usr/bin/gnome-terminal'
    ]
  },
  notepad: {
    paths: [
      '/Applications/TextEdit.app/Contents/MacOS/TextEdit',
      'C:\\Windows\\System32\\notepad.exe',
      '/usr/bin/gedit'
    ]
  }
};

async function run(args, context) {
  try {
    const appName = args.appName.toLowerCase();
    const fallbackToWeb = args.fallbackToWeb !== false; // Default to true
    
    // Try to find and launch the app
    const result = await tryLaunchApp(appName, fallbackToWeb);
    
    return {
      success: result.success,
      message: result.message,
      summary: result.message,
      data: {
        appName,
        method: result.method,
        fallbackUsed: result.fallbackUsed
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to open app ${args.appName}: ${error}`,
      error: String(error)
    };
  }
}

async function tryLaunchApp(appName, fallbackToWeb) {
  const mapping = appMappings[appName];
  
  if (mapping) {
    // Try native app paths first
    for (const appPath of mapping.paths) {
      try {
        const expandedPath = appPath.replace('%USERNAME%', os.userInfo().username);
        
        if (os.platform() === 'darwin') {
          await execAsync(`open "${expandedPath}"`);
        } else if (os.platform() === 'win32') {
          await execAsync(`start "" "${expandedPath}"`);
        } else {
          await execAsync(expandedPath);
        }
        
        return {
          success: true,
          message: `Opened ${appName}`,
          method: 'native',
          fallbackUsed: false
        };
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    
    // Try web fallback if available
    if (fallbackToWeb && mapping.webFallback) {
      await shell.openExternal(mapping.webFallback);
      return {
        success: true,
        message: `Opened ${appName} web version`,
        method: 'web',
        fallbackUsed: true
      };
    }
  }
  
  // Try system-specific app launching
  try {
    if (os.platform() === 'darwin') {
      await execAsync(`open -a "${appName}"`);
      return {
        success: true,
        message: `Opened ${appName}`,
        method: 'macos-open',
        fallbackUsed: false
      };
    } else if (os.platform() === 'win32') {
      await execAsync(`start ${appName}`);
      return {
        success: true,
        message: `Opened ${appName}`,
        method: 'windows-start',
        fallbackUsed: false
      };
    } else {
      await execAsync(appName);
      return {
        success: true,
        message: `Opened ${appName}`,
        method: 'linux-exec',
        fallbackUsed: false
      };
    }
  } catch (error) {
    // Final fallback: try to search for the app
    if (fallbackToWeb) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
      await shell.openExternal(searchUrl);
      return {
        success: true,
        message: `Could not find ${appName}, opened search results instead`,
        method: 'search',
        fallbackUsed: true
      };
    }
    
    throw new Error(`Could not find or launch ${appName}`);
  }
}

module.exports.manifest = manifest;
module.exports.run = run; 