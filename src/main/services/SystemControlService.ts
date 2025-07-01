import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { screen, clipboard } from 'electron';
import si from 'systeminformation';
import screenshot from 'screenshot-desktop';

const execAsync = promisify(exec);

// Optional tesseract import
let createWorker: any = null;
try {
  const tesseract = require('tesseract.js');
  createWorker = tesseract.createWorker;
} catch (error) {
  console.warn('⚠️ Tesseract.js not available - OCR features will be disabled');
}

interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
}

interface WindowInfo {
  id: string;
  title: string;
  app: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isActive: boolean;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
}

interface ScreenCapture {
  image: Buffer;
  timestamp: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text?: string;
}

export class SystemControlService {
  private isInitialized = false;
  private tesseractWorker: any = null;
  private screenBounds: Electron.Rectangle = { x: 0, y: 0, width: 1920, height: 1080 };
  private lastScreenshot: ScreenCapture | null = null;
  private screenshotCache: Map<string, ScreenCapture> = new Map();
  private maxCacheSize = 10;
  private screen!: Electron.Screen;
  private primaryDisplay!: Electron.Display;
  private displays!: Electron.Display[];

  constructor() {
    // Don't initialize screen here - wait for app ready
    console.log('🖥️ Initializing System Control Service...');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize screen after app is ready
      this.screen = require('electron').screen;
      this.primaryDisplay = this.screen.getPrimaryDisplay();
      this.displays = this.screen.getAllDisplays();
      
      // Get screen bounds
      if (this.displays.length > 0) {
        this.screenBounds = this.displays[0].bounds;
      }

      // Initialize Tesseract OCR
      await this.initializeOCR();
      
      this.isInitialized = true;
      console.log('✅ System Control Service initialized');
    } catch (error) {
      console.error('❌ Error initializing System Control Service:', error);
      throw error;
    }
  }

  private async initializeOCR(): Promise<void> {
    if (!createWorker) {
      console.warn('⚠️ OCR not available - tesseract.js not installed');
      return;
    }
    
    try {
      this.tesseractWorker = await createWorker('eng', 1, {
        logger: m => console.log(`OCR: ${m.status} - ${Math.round(m.progress * 100)}%`)
      });
      console.log('✅ OCR initialized');
    } catch (error) {
      console.warn('⚠️ OCR initialization failed:', error);
    }
  }

  public async getSystemInfo(): Promise<SystemInfo> {
    await this.initialize();

    try {
      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize()
      ]);

      const diskInfo = disk[0] || { size: 0, used: 0, available: 0 };

      return {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        username: os.userInfo().username,
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          percentage: (mem.used / mem.total) * 100
        },
        cpu: {
          usage: cpu.currentLoad,
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'Unknown'
        },
        disk: {
          total: diskInfo.size,
          used: diskInfo.used,
          free: diskInfo.available,
          percentage: (diskInfo.used / diskInfo.size) * 100
        }
      };
    } catch (error) {
      console.error('❌ Error getting system info:', error);
      throw error;
    }
  }

  public async getActiveWindow(): Promise<WindowInfo | null> {
    await this.initialize();

    try {
      // Simplified window info without active-win dependency
      // For now, return basic window info or null
      return {
        id: 'unknown',
        title: 'Unknown Window',
        app: 'Unknown App',
        bounds: {
          x: 0,
          y: 0,
          width: this.screenBounds.width,
          height: this.screenBounds.height
        },
        isActive: true
      };
    } catch (error) {
      console.error('❌ Error getting active window:', error);
      return null;
    }
  }

  public async getRunningProcesses(): Promise<ProcessInfo[]> {
    await this.initialize();

    try {
      const { default: psList } = await import('ps-list');
      const processes = await psList();
      return processes.map(proc => ({
        pid: proc.pid,
        name: proc.name,
        cpu: proc.cpu ?? 0,
        memory: proc.memory ?? 0,
        command: proc.cmd || ''
      }));
    } catch (error) {
      console.error('❌ Error getting running processes:', error);
      return [];
    }
  }

  public async takeScreenshot(region?: { x: number; y: number; width: number; height: number }): Promise<ScreenCapture> {
    await this.initialize();

    try {
      const image = await screenshot();
      const timestamp = Date.now();
      const bounds = region || { x: 0, y: 0, width: this.screenBounds.width, height: this.screenBounds.height };

      const capture: ScreenCapture = {
        image,
        timestamp,
        bounds
      };

      // Cache the screenshot
      this.cacheScreenshot(capture);

      this.lastScreenshot = capture;
      return capture;
    } catch (error) {
      console.error('❌ Error taking screenshot:', error);
      throw error;
    }
  }

  public async extractTextFromScreenshot(capture?: ScreenCapture): Promise<string> {
    if (!this.tesseractWorker) {
      console.warn('⚠️ OCR not available - returning empty text');
      return '';
    }

    try {
      const screenshotToProcess = capture || this.lastScreenshot;
      if (!screenshotToProcess) {
        throw new Error('No screenshot available for OCR');
      }

      const { data: { text } } = await this.tesseractWorker.recognize(screenshotToProcess.image);
      return text || '';
    } catch (error) {
      console.error('❌ Error extracting text from screenshot:', error);
      return '';
    }
  }

  public async controlMouse(action: 'move' | 'click' | 'rightClick' | 'doubleClick', x?: number, y?: number): Promise<void> {
    await this.initialize();

    try {
      const platform = os.platform();
      let command: string;

      switch (action) {
        case 'move':
          if (x !== undefined && y !== undefined) {
            if (platform === 'win32') {
              command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`;
            } else if (platform === 'darwin') {
              command = `osascript -e 'tell application "System Events" to set mouse location to {${x}, ${y}}'`;
            } else {
              command = `xdotool mousemove ${x} ${y}`;
            }
            await execAsync(command);
          }
          break;
        case 'click':
          if (x !== undefined && y !== undefined) {
            await this.controlMouse('move', x, y);
          }
          if (platform === 'win32') {
            command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x || 0}, ${y || 0}); [System.Windows.Forms.SendKeys]::SendWait('{LEFT}')"`;
          } else if (platform === 'darwin') {
            command = `osascript -e 'tell application "System Events" to click at {${x || 0}, ${y || 0}}'`;
          } else {
            command = `xdotool click 1`;
          }
          await execAsync(command);
          break;
        case 'rightClick':
          if (x !== undefined && y !== undefined) {
            await this.controlMouse('move', x, y);
          }
          if (platform === 'win32') {
            command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x || 0}, ${y || 0}); [System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')"`;
          } else if (platform === 'darwin') {
            command = `osascript -e 'tell application "System Events" to click at {${x || 0}, ${y || 0}} using {button 2}'`;
          } else {
            command = `xdotool click 3`;
          }
          await execAsync(command);
          break;
        case 'doubleClick':
          if (x !== undefined && y !== undefined) {
            await this.controlMouse('move', x, y);
          }
          if (platform === 'win32') {
            command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x || 0}, ${y || 0}); [System.Windows.Forms.SendKeys]::SendWait('{LEFT}{LEFT}')"`;
          } else if (platform === 'darwin') {
            command = `osascript -e 'tell application "System Events" to click at {${x || 0}, ${y || 0}} using {button 1} with double click'`;
          } else {
            command = `xdotool click --repeat 2 1`;
          }
          await execAsync(command);
          break;
      }
    } catch (error) {
      console.error('❌ Error controlling mouse:', error);
      throw error;
    }
  }

  public async controlKeyboard(action: 'type' | 'keyTap' | 'keyToggle', input?: string, key?: string): Promise<void> {
    await this.initialize();

    try {
      const platform = os.platform();
      let command: string;

      switch (action) {
        case 'type':
          if (input) {
            if (platform === 'win32') {
              command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${input.replace(/'/g, "''")}')"`;
            } else if (platform === 'darwin') {
              command = `osascript -e 'tell application "System Events" to keystroke "${input.replace(/"/g, '\\"')}"'`;
            } else {
              command = `xdotool type "${input.replace(/"/g, '\\"')}"`;
            }
            await execAsync(command);
          }
          break;
        case 'keyTap':
          if (key) {
            if (platform === 'win32') {
              command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{${key.toUpperCase()}}')"`;
            } else if (platform === 'darwin') {
              command = `osascript -e 'tell application "System Events" to key code ${this.getKeyCode(key)}'`;
            } else {
              command = `xdotool key ${key}`;
            }
            await execAsync(command);
          }
          break;
        case 'keyToggle':
          if (key) {
            if (platform === 'win32') {
              command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{${key.toUpperCase()}}')"`;
            } else if (platform === 'darwin') {
              command = `osascript -e 'tell application "System Events" to key code ${this.getKeyCode(key)}'`;
            } else {
              command = `xdotool keydown ${key} && sleep 0.1 && xdotool keyup ${key}`;
            }
            await execAsync(command);
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error controlling keyboard:', error);
      throw error;
    }
  }

  private getKeyCode(key: string): number {
    // Simple key code mapping for macOS
    const keyCodes: { [key: string]: number } = {
      'enter': 36,
      'space': 49,
      'tab': 48,
      'escape': 53,
      'delete': 51,
      'backspace': 117,
      'up': 126,
      'down': 125,
      'left': 123,
      'right': 124,
      'home': 115,
      'end': 119,
      'pageup': 116,
      'pagedown': 121
    };
    return keyCodes[key.toLowerCase()] || 0;
  }

  public async launchApplication(appName: string): Promise<boolean> {
    await this.initialize();

    try {
      const platform = os.platform();
      let command: string;

      switch (platform) {
        case 'win32':
          command = `start ${appName}`;
          break;
        case 'darwin':
          command = `open -a "${appName}"`;
          break;
        case 'linux':
          command = appName;
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      await execAsync(command);
      console.log(`✅ Launched application: ${appName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error launching application ${appName}:`, error);
      return false;
    }
  }

  public async killProcess(pid: number): Promise<boolean> {
    await this.initialize();

    try {
      const platform = os.platform();
      let command: string;

      switch (platform) {
        case 'win32':
          command = `taskkill /PID ${pid} /F`;
          break;
        case 'darwin':
        case 'linux':
          command = `kill -9 ${pid}`;
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      await execAsync(command);
      console.log(`✅ Killed process: ${pid}`);
      return true;
    } catch (error) {
      console.error(`❌ Error killing process ${pid}:`, error);
      return false;
    }
  }

  public async getClipboardText(): Promise<string> {
    await this.initialize();

    try {
      return clipboard.readText();
    } catch (error) {
      console.error('❌ Error getting clipboard text:', error);
      return '';
    }
  }

  public async setClipboardText(text: string): Promise<void> {
    await this.initialize();

    try {
      clipboard.writeText(text);
      console.log(`📋 Setting clipboard text: ${text.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Error setting clipboard text:', error);
      throw error;
    }
  }

  public async getScreenBounds(): Promise<Electron.Rectangle> {
    await this.initialize();
    return this.screenBounds;
  }

  public async getMousePosition(): Promise<{ x: number; y: number }> {
    await this.initialize();

    try {
      const platform = os.platform();
      let command: string;

      if (platform === 'win32') {
        command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; $pos = [System.Windows.Forms.Cursor]::Position; Write-Output $pos.X, $pos.Y"`;
      } else if (platform === 'darwin') {
        command = `osascript -e 'tell application "System Events" to get mouse location'`;
      } else {
        command = `xdotool getmouselocation --shell`;
      }

      const { stdout } = await execAsync(command);
      
      if (platform === 'win32') {
        const [x, y] = stdout.trim().split('\n').map(Number);
        return { x, y };
      } else if (platform === 'darwin') {
        const [x, y] = stdout.trim().split(',').map(Number);
        return { x, y };
      } else {
        const match = stdout.match(/X=(\d+)\s+Y=(\d+)/);
        if (match) {
          return { x: parseInt(match[1]), y: parseInt(match[2]) };
        }
      }

      return { x: 0, y: 0 };
    } catch (error) {
      console.error('❌ Error getting mouse position:', error);
      return { x: 0, y: 0 };
    }
  }

  private cacheScreenshot(capture: ScreenCapture): void {
    const key = `${capture.bounds.x}-${capture.bounds.y}-${capture.bounds.width}-${capture.bounds.height}`;
    
    if (this.screenshotCache.size >= this.maxCacheSize) {
      const firstKey = this.screenshotCache.keys().next().value;
      if (firstKey !== undefined) {
        this.screenshotCache.delete(firstKey);
      }
    }
    
    this.screenshotCache.set(key, capture);
  }

  public getScreenshotCache(): Map<string, ScreenCapture> {
    return this.screenshotCache;
  }

  public clearScreenshotCache(): void {
    this.screenshotCache.clear();
    console.log('🗑️ Screenshot cache cleared');
  }

  public async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
    console.log('🧹 System Control Service cleaned up');
  }
}

export const systemControlService = new SystemControlService(); 