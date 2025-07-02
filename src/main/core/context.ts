import { clipboard } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Tesseract from 'tesseract.js';
import screenshot from 'screenshot-desktop';

const execAsync = promisify(exec);

export interface Context {
  activeApp: string;
  windowTitle: string;
  clipboardContent: string;
  screenText?: string;
  recentCommands: string[];
  sessionDuration: number;
  systemInfo: {
    platform: string;
    arch: string;
    version: string;
    uptime: number;
  };
  userInfo: {
    username: string;
    homeDir: string;
    desktopDir: string;
  };
  timestamp: number;
}

export class ContextManager {
  private recentCommands: string[] = [];
  private sessionStartTime: number = Date.now();
  private debug: boolean;
  private ocrCache: Map<string, { text: string; timestamp: number }> = new Map();
  private ocrCacheTimeout = 5000; // 5 seconds

  constructor() {
    this.debug = process.env.DEBUG_MODE === 'true';
  }

  public async getCurrentContext(): Promise<Context> {
    try {
      const [
        activeApp,
        windowTitle,
        clipboardContent,
        screenText,
        systemInfo,
        userInfo
      ] = await Promise.all([
        this.getActiveApp(),
        this.getActiveWindowTitle(),
        this.getClipboardContent(),
        this.getScreenText(),
        this.getSystemInfo(),
        this.getUserInfo()
      ]);

      return {
        activeApp,
        windowTitle,
        clipboardContent,
        screenText,
        recentCommands: [...this.recentCommands],
        sessionDuration: Date.now() - this.sessionStartTime,
        systemInfo,
        userInfo,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log('Error getting context:', error);
      
      // Return minimal context on error
      return {
        activeApp: 'unknown',
        windowTitle: 'unknown',
        clipboardContent: '',
        recentCommands: [...this.recentCommands],
        sessionDuration: Date.now() - this.sessionStartTime,
        systemInfo: {
          platform: os.platform(),
          arch: os.arch(),
          version: os.version(),
          uptime: os.uptime()
        },
        userInfo: {
          username: os.userInfo().username,
          homeDir: os.homedir(),
          desktopDir: path.join(os.homedir(), 'Desktop')
        },
        timestamp: Date.now()
      };
    }
  }

  private async getActiveApp(): Promise<string> {
    try {
      if (os.platform() === 'darwin') {
        const { stdout } = await execAsync(`
          osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'
        `);
        return stdout.trim();
      } else if (os.platform() === 'win32') {
        const { stdout } = await execAsync(`
          powershell -command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 | Select-Object -ExpandProperty ProcessName"
        `);
        return stdout.trim();
      } else {
        // Linux - try to get active window
        const { stdout } = await execAsync(`
          xdotool getactivewindow getwindowname 2>/dev/null || echo "unknown"
        `);
        return stdout.trim();
      }
    } catch (error) {
      this.log('Error getting active app:', error);
      return 'unknown';
    }
  }

  private async getActiveWindowTitle(): Promise<string> {
    try {
      if (os.platform() === 'darwin') {
        const { stdout } = await execAsync(`
          osascript -e 'tell application "System Events" to get name of first window of (first application process whose frontmost is true)'
        `);
        return stdout.trim();
      } else if (os.platform() === 'win32') {
        const { stdout } = await execAsync(`
          powershell -command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 | Select-Object -ExpandProperty MainWindowTitle"
        `);
        return stdout.trim();
      } else {
        // Linux
        const { stdout } = await execAsync(`
          xdotool getactivewindow getwindowname 2>/dev/null || echo "unknown"
        `);
        return stdout.trim();
      }
    } catch (error) {
      this.log('Error getting window title:', error);
      return 'unknown';
    }
  }

  private getClipboardContent(): string {
    try {
      return clipboard.readText() || '';
    } catch (error) {
      this.log('Error reading clipboard:', error);
      return '';
    }
  }

  private async getScreenText(): Promise<string | undefined> {
    try {
      // Check cache first
      const cacheKey = 'screen';
      const cached = this.ocrCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.ocrCacheTimeout) {
        return cached.text;
      }

      // Take screenshot
      const imgBuffer = await screenshot();
      
      // Perform OCR
      const result = await Tesseract.recognize(imgBuffer, 'eng', {
        logger: m => {
          if (this.debug) {
            this.log('OCR progress:', m);
          }
        }
      });

      const text = result.data.text.trim();
      
      // Cache the result
      this.ocrCache.set(cacheKey, {
        text,
        timestamp: Date.now()
      });

      return text || undefined;
    } catch (error) {
      this.log('Error getting screen text:', error);
      return undefined;
    }
  }

  private getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      version: os.version(),
      uptime: os.uptime()
    };
  }

  private getUserInfo() {
    return {
      username: os.userInfo().username,
      homeDir: os.homedir(),
      desktopDir: path.join(os.homedir(), 'Desktop')
    };
  }

  public addCommand(command: string): void {
    this.recentCommands.unshift(command);
    
    // Keep only last 10 commands
    if (this.recentCommands.length > 10) {
      this.recentCommands = this.recentCommands.slice(0, 10);
    }
  }

  public getRecentCommands(count: number = 5): string[] {
    return this.recentCommands.slice(0, count);
  }

  public getSessionStartTime(): number {
    return this.sessionStartTime;
  }

  public clearCache(): void {
    this.ocrCache.clear();
  }

  public async getClipboardHistory(): Promise<string[]> {
    // This would typically integrate with a clipboard manager
    // For now, return empty array
    return [];
  }

  public async getActiveWindowInfo(): Promise<{
    app: string;
    title: string;
    bounds?: { x: number; y: number; width: number; height: number };
  }> {
    try {
      const app = await this.getActiveApp();
      const title = await this.getActiveWindowTitle();
      
      let bounds;
      if (os.platform() === 'darwin') {
        try {
          const { stdout } = await execAsync(`
            osascript -e 'tell application "System Events" to get position and size of first window of (first application process whose frontmost is true)'
          `);
          const match = stdout.match(/(\d+), (\d+), (\d+), (\d+)/);
          if (match) {
            bounds = {
              x: parseInt(match[1]),
              y: parseInt(match[2]),
              width: parseInt(match[3]),
              height: parseInt(match[4])
            };
          }
        } catch (error) {
          this.log('Error getting window bounds:', error);
        }
      }

      return { app, title, bounds };
    } catch (error) {
      this.log('Error getting window info:', error);
      return { app: 'unknown', title: 'unknown' };
    }
  }

  public async getSystemResources(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
  }> {
    try {
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

      // Disk usage would require additional libraries
      const diskUsage = 0; // Placeholder

      return {
        cpu: Math.round(cpuUsage),
        memory: Math.round(memoryUsage),
        disk: diskUsage
      };
    } catch (error) {
      this.log('Error getting system resources:', error);
      return { cpu: 0, memory: 0, disk: 0 };
    }
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[ContextManager] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const contextManager = new ContextManager(); 