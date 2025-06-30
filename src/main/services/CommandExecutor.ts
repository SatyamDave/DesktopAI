import { shell, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { configManager } from './ConfigManager';
import { browserAutomationService } from './BrowserAutomationService';
import { appLaunchService } from './AppLaunchService';
import { agenticCommandProcessor } from './AgenticCommandProcessor';

const execAsync = promisify(exec);

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface CommandHistory {
  command: string;
  timestamp: number;
  success: boolean;
  result: string;
}

export class CommandExecutor {
  private commandHistory: CommandHistory[] = [];
  private maxHistorySize = 50;
  private historyFile: string;
  private configManager: typeof configManager;
  private debug: boolean;
  private browserAutomationService: typeof browserAutomationService;
  private appLaunchService: typeof appLaunchService;
  private agenticCommandProcessor: typeof agenticCommandProcessor;

  constructor() {
    this.historyFile = path.join(os.homedir(), '.doppel', 'command-history.json');
    this.configManager = configManager;
    this.debug = process.env.DEBUG_MODE === 'true';
    this.browserAutomationService = browserAutomationService;
    this.appLaunchService = appLaunchService;
    this.agenticCommandProcessor = agenticCommandProcessor;
    this.loadCommandHistory();
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[CommandExecutor] ${message}`, data || '');
    }
  }

  private loadCommandHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        this.commandHistory = JSON.parse(data);
      }
    } catch (error) {
      this.log('Error loading command history', error);
      this.commandHistory = [];
    }
  }

  private saveCommandHistory() {
    try {
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.commandHistory, null, 2));
    } catch (error) {
      this.log('Error saving command history', error);
    }
  }

  private addToHistory(command: string, success: boolean, result: string) {
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
      success,
      result
    });
    this.saveCommandHistory();
  }

  public async executeCommand(input: string): Promise<CommandResult> {
    this.log(`Executing command: "${input}"`);
    try {
      // Use the new AgenticCommandProcessor for natural language commands
      const result = await this.agenticCommandProcessor.processCommand(input);
      
      // Add to history
      this.addToHistory(input, result.success, result.message);
      
      this.log(`Command executed: "${input}" - Success: ${result.success}`);
      return result;
    } catch (e) {
      this.log('AgenticCommandProcessor failed, falling back to legacy logic', { error: String(e) });
      
      // Fallback to legacy logic for specific command types
      const lowerInput = input.toLowerCase();
      
      // Handle specific command patterns that the agentic processor might miss
      if (lowerInput.includes('open browser') || lowerInput.includes('launch browser')) {
        return await this.handleBrowserLaunch(input);
      }
      
      // For any other commands, try the agentic processor again or provide a helpful response
      return {
        success: false,
        message: 'I couldn\'t understand that command.',
        error: String(e),
        data: { type: 'unrecognized_command' }
      };
    }
  }

  private async handleBrowserLaunch(input: string): Promise<CommandResult> {
    try {
      // Try to open the default browser
      await shell.openExternal('https://www.google.com');
      return {
        success: true,
        message: 'Opened your default browser.'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open browser.',
        error: String(error)
      };
    }
  }

  public getCommandHistory(limit = 10): CommandHistory[] {
    return this.commandHistory.slice(-limit);
  }

  public getCommandSuggestions(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const suggestions: string[] = [];
    
    // Get app suggestions from AppLaunchService
    const appSuggestions = this.appLaunchService.getAppSuggestions(lowerInput);
    appSuggestions.forEach(appName => {
      suggestions.push(`Open ${appName}`);
    });

    // Add other common commands
    if (lowerInput.includes('search') || lowerInput.includes('find')) {
      suggestions.push('Search for...', 'YouTube search...');
    }
    if (lowerInput.includes('file') || lowerInput.includes('folder')) {
      suggestions.push('Open file...', 'Create folder...', 'Delete file...');
    }
    if (lowerInput.includes('volume') || lowerInput.includes('sound')) {
      suggestions.push('Volume up', 'Volume down', 'Mute');
    }
    if (lowerInput.includes('brightness') || lowerInput.includes('screen')) {
      suggestions.push('Brightness up', 'Brightness down');
    }
    if (lowerInput.includes('system') || lowerInput.includes('computer')) {
      suggestions.push('Lock system', 'Sleep system', 'Shutdown system');
    }
    if (lowerInput.includes('clipboard') || lowerInput.includes('copy')) {
      suggestions.push('Copy to clipboard...', 'Show clipboard history');
    }
    if (lowerInput.includes('screenshot') || lowerInput.includes('screen')) {
      suggestions.push('Take screenshot', 'Record screen');
    }
    if (lowerInput.includes('email') || lowerInput.includes('mail')) {
      suggestions.push('Compose email...', 'Open email client');
    }

    return suggestions.slice(0, 10);
  }

  public async executeCommandQueue(commands: string[]): Promise<CommandResult[]> {
    this.log('Executing command queue', { commands });
    const results: CommandResult[] = [];
    for (const command of commands) {
      this.log('Queue executing', { command });
      const result = await this.executeCommand(command);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
  }

  // --- File Operations Handler ---
  private async handleFileOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Open file/folder
    if (lowerInput.includes('open file') || lowerInput.includes('open folder')) {
      const pathMatch = input.match(/open (?:file|folder) (.+)/i);
      if (pathMatch) {
        const filePath = pathMatch[1].trim();
        return await this.openFileOrFolder(filePath, input);
      }
    }

    // Create file/folder
    if (lowerInput.includes('create file') || lowerInput.includes('create folder') || lowerInput.includes('new file') || lowerInput.includes('new folder')) {
      const pathMatch = input.match(/create (?:file|folder) (.+)/i) || input.match(/new (?:file|folder) (.+)/i);
      if (pathMatch) {
        const path = pathMatch[1].trim();
        const isFolder = lowerInput.includes('folder');
        return await this.createFileOrFolder(path, isFolder, input);
      }
    }

    // Delete file/folder
    if (lowerInput.includes('delete file') || lowerInput.includes('delete folder') || lowerInput.includes('remove file') || lowerInput.includes('remove folder')) {
      const pathMatch = input.match(/delete (?:file|folder) (.+)/i) || input.match(/remove (?:file|folder) (.+)/i);
      if (pathMatch) {
        const path = pathMatch[1].trim();
        return await this.deleteFileOrFolder(path, input);
      }
    }

    // Move file/folder
    if (lowerInput.includes('move file') || lowerInput.includes('move folder')) {
      const moveMatch = input.match(/move (?:file|folder) (.+?) to (.+)/i);
      if (moveMatch) {
        const source = moveMatch[1].trim();
        const destination = moveMatch[2].trim();
        return await this.moveFileOrFolder(source, destination, input);
      }
    }

    // Copy file/folder
    if (lowerInput.includes('copy file') || lowerInput.includes('copy folder')) {
      const copyMatch = input.match(/copy (?:file|folder) (.+?) to (.+)/i);
      if (copyMatch) {
        const source = copyMatch[1].trim();
        const destination = copyMatch[2].trim();
        return await this.copyFileOrFolder(source, destination, input);
      }
    }

    // Rename file/folder
    if (lowerInput.includes('rename file') || lowerInput.includes('rename folder')) {
      const renameMatch = input.match(/rename (?:file|folder) (.+?) to (.+)/i);
      if (renameMatch) {
        const oldName = renameMatch[1].trim();
        const newName = renameMatch[2].trim();
        return await this.renameFileOrFolder(oldName, newName, input);
      }
    }

    return { success: false, message: 'Please specify a file operation (open, create, delete, move, copy, rename).' };
  }

  private async openFileOrFolder(filePath: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync(`explorer "${filePath}"`);
      } else if (platform === 'darwin') {
        await execAsync(`open "${filePath}"`);
      } else {
        await execAsync(`xdg-open "${filePath}"`);
      }
      this.addToHistory(originalInput, true, `Opened ${filePath}`);
      return { success: true, message: `Opened ${filePath}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to open ${filePath}: ${error}`);
      return { success: false, message: `Failed to open ${filePath}.`, error: String(error) };
    }
  }

  private async createFileOrFolder(path: string, isFolder: boolean, originalInput: string): Promise<CommandResult> {
    try {
      if (isFolder) {
        fs.mkdirSync(path, { recursive: true });
      } else {
        fs.writeFileSync(path, '');
      }
      this.addToHistory(originalInput, true, `Created ${isFolder ? 'folder' : 'file'} ${path}`);
      return { success: true, message: `Created ${isFolder ? 'folder' : 'file'} ${path}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to create ${isFolder ? 'folder' : 'file'} ${path}: ${error}`);
      return { success: false, message: `Failed to create ${isFolder ? 'folder' : 'file'} ${path}.`, error: String(error) };
    }
  }

  private async deleteFileOrFolder(path: string, originalInput: string): Promise<CommandResult> {
    try {
      const stats = fs.statSync(path);
      if (stats.isDirectory()) {
        fs.rmdirSync(path, { recursive: true });
      } else {
        fs.unlinkSync(path);
      }
      this.addToHistory(originalInput, true, `Deleted ${path}`);
      return { success: true, message: `Deleted ${path}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to delete ${path}: ${error}`);
      return { success: false, message: `Failed to delete ${path}.`, error: String(error) };
    }
  }

  private async moveFileOrFolder(source: string, destination: string, originalInput: string): Promise<CommandResult> {
    try {
      fs.renameSync(source, destination);
      this.addToHistory(originalInput, true, `Moved ${source} to ${destination}`);
      return { success: true, message: `Moved ${source} to ${destination}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to move ${source} to ${destination}: ${error}`);
      return { success: false, message: `Failed to move ${source} to ${destination}.`, error: String(error) };
    }
  }

  private async copyFileOrFolder(source: string, destination: string, originalInput: string): Promise<CommandResult> {
    try {
      const stats = fs.statSync(source);
      if (stats.isDirectory()) {
        // Copy directory recursively
        this.copyDirectorySync(source, destination);
      } else {
        fs.copyFileSync(source, destination);
      }
      this.addToHistory(originalInput, true, `Copied ${source} to ${destination}`);
      return { success: true, message: `Copied ${source} to ${destination}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to copy ${source} to ${destination}: ${error}`);
      return { success: false, message: `Failed to copy ${source} to ${destination}.`, error: String(error) };
    }
  }

  private copyDirectorySync(source: string, destination: string): void {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    const files = fs.readdirSync(source);
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      const stats = fs.statSync(sourcePath);
      if (stats.isDirectory()) {
        this.copyDirectorySync(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  private async renameFileOrFolder(oldName: string, newName: string, originalInput: string): Promise<CommandResult> {
    try {
      fs.renameSync(oldName, newName);
      this.addToHistory(originalInput, true, `Renamed ${oldName} to ${newName}`);
      return { success: true, message: `Renamed ${oldName} to ${newName}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to rename ${oldName} to ${newName}: ${error}`);
      return { success: false, message: `Failed to rename ${oldName} to ${newName}.`, error: String(error) };
    }
  }

  // --- System Controls Handler ---
  private async handleSystemControls(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Volume control
    if (lowerInput.includes('volume')) {
      const volumeMatch = lowerInput.match(/volume (up|down|mute|(\d+))/i);
      if (volumeMatch) {
        const action = volumeMatch[1];
        return await this.controlVolume(action, input);
      }
    }

    // Brightness control
    if (lowerInput.includes('brightness')) {
      const brightnessMatch = lowerInput.match(/brightness (up|down|(\d+))/i);
      if (brightnessMatch) {
        const action = brightnessMatch[1];
        return await this.controlBrightness(action, input);
      }
    }

    // System actions
    if (lowerInput.includes('lock')) {
      return await this.lockSystem(input);
    }
    if (lowerInput.includes('sleep')) {
      return await this.sleepSystem(input);
    }
    if (lowerInput.includes('shutdown') || lowerInput.includes('turn off')) {
      return await this.shutdownSystem(input);
    }
    if (lowerInput.includes('restart') || lowerInput.includes('reboot')) {
      return await this.restartSystem(input);
    }

    return { success: false, message: 'Please specify a system control (volume, brightness, lock, sleep, shutdown, restart).' };
  }

  private async controlVolume(action: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        if (action === 'up') {
          await execAsync('powershell -command "(Get-AudioDevice -Playback).Volume += 10"');
        } else if (action === 'down') {
          await execAsync('powershell -command "(Get-AudioDevice -Playback).Volume -= 10"');
        } else if (action === 'mute') {
          await execAsync('powershell -command "Set-AudioDevice -Playback -Mute $true"');
        } else {
          await execAsync(`powershell -command "(Get-AudioDevice -Playback).Volume = ${action}"`);
        }
      } else if (platform === 'darwin') {
        if (action === 'up') {
          await execAsync('osascript -e "set volume output volume (output volume of (get volume settings) + 10)"');
        } else if (action === 'down') {
          await execAsync('osascript -e "set volume output volume (output volume of (get volume settings) - 10)"');
        } else if (action === 'mute') {
          await execAsync('osascript -e "set volume output muted true"');
        } else {
          await execAsync(`osascript -e "set volume output volume ${action}"`);
        }
      } else {
        // Linux - using amixer
        if (action === 'up') {
          await execAsync('amixer -D pulse sset Master 10%+');
        } else if (action === 'down') {
          await execAsync('amixer -D pulse sset Master 10%-');
        } else if (action === 'mute') {
          await execAsync('amixer -D pulse sset Master toggle');
        } else {
          await execAsync(`amixer -D pulse sset Master ${action}%`);
        }
      }
      this.addToHistory(originalInput, true, `Volume ${action}`);
      return { success: true, message: `Volume ${action}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to control volume: ${error}`);
      return { success: false, message: 'Failed to control volume.', error: String(error) };
    }
  }

  private async controlBrightness(action: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        // Windows brightness control (requires WMI)
        await execAsync(`powershell -command "Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods | ForEach-Object { $_.WmiSetBrightness(1, ${action}) }"`);
      } else if (platform === 'darwin') {
        if (action === 'up') {
          await execAsync('osascript -e "tell application \\"System Events\\" to key code 144"');
        } else if (action === 'down') {
          await execAsync('osascript -e "tell application \\"System Events\\" to key code 145"');
        } else {
          await execAsync(`osascript -e "tell application \\"System Events\\" to set brightness to ${parseInt(action) / 100}"`);
        }
      } else {
        // Linux brightness control
        const brightnessPath = '/sys/class/backlight/intel_backlight/brightness';
        const maxBrightnessPath = '/sys/class/backlight/intel_backlight/max_brightness';
        if (fs.existsSync(brightnessPath)) {
          const maxBrightness = parseInt(fs.readFileSync(maxBrightnessPath, 'utf8'));
          let newBrightness;
          if (action === 'up') {
            const current = parseInt(fs.readFileSync(brightnessPath, 'utf8'));
            newBrightness = Math.min(current + maxBrightness * 0.1, maxBrightness);
          } else if (action === 'down') {
            const current = parseInt(fs.readFileSync(brightnessPath, 'utf8'));
            newBrightness = Math.max(current - maxBrightness * 0.1, 0);
          } else {
            newBrightness = (parseInt(action) / 100) * maxBrightness;
          }
          fs.writeFileSync(brightnessPath, Math.round(newBrightness).toString());
        }
      }
      this.addToHistory(originalInput, true, `Brightness ${action}`);
      return { success: true, message: `Brightness ${action}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to control brightness: ${error}`);
      return { success: false, message: 'Failed to control brightness.', error: String(error) };
    }
  }

  private async lockSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('rundll32.exe user32.dll,LockWorkStation');
      } else if (platform === 'darwin') {
        await execAsync('pmset displaysleepnow');
      } else {
        await execAsync('gnome-screensaver-command --lock');
      }
      this.addToHistory(originalInput, true, 'System locked');
      return { success: true, message: 'System locked.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to lock system: ${error}`);
      return { success: false, message: 'Failed to lock system.', error: String(error) };
    }
  }

  private async sleepSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('powercfg /hibernate off && rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
      } else if (platform === 'darwin') {
        await execAsync('pmset sleepnow');
      } else {
        await execAsync('systemctl suspend');
      }
      this.addToHistory(originalInput, true, 'System sleeping');
      return { success: true, message: 'System sleeping.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to sleep system: ${error}`);
      return { success: false, message: 'Failed to sleep system.', error: String(error) };
    }
  }

  private async shutdownSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('shutdown /s /t 0');
      } else if (platform === 'darwin') {
        await execAsync('sudo shutdown -h now');
      } else {
        await execAsync('sudo shutdown -h now');
      }
      this.addToHistory(originalInput, true, 'System shutting down');
      return { success: true, message: 'System shutting down.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to shutdown system: ${error}`);
      return { success: false, message: 'Failed to shutdown system.', error: String(error) };
    }
  }

  private async restartSystem(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('shutdown /r /t 0');
      } else if (platform === 'darwin') {
        await execAsync('sudo shutdown -r now');
      } else {
        await execAsync('sudo shutdown -r now');
      }
      this.addToHistory(originalInput, true, 'System restarting');
      return { success: true, message: 'System restarting.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to restart system: ${error}`);
      return { success: false, message: 'Failed to restart system.', error: String(error) };
    }
  }

  // --- Clipboard Operations Handler ---
  private async handleClipboardOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Copy to clipboard
    if (lowerInput.includes('copy to clipboard') || lowerInput.includes('copy text')) {
      const textMatch = input.match(/copy (?:to clipboard|text) (.+)/i);
      if (textMatch) {
        const text = textMatch[1].trim();
        return await this.copyToClipboard(text, input);
      }
    }

    // Clear clipboard
    if (lowerInput.includes('clear clipboard') || lowerInput.includes('empty clipboard')) {
      return await this.clearClipboard(input);
    }

    // Show clipboard history
    if (lowerInput.includes('clipboard history') || lowerInput.includes('show clipboard')) {
      return await this.showClipboardHistory(input);
    }

    return { success: false, message: 'Please specify a clipboard operation (copy, clear, history).' };
  }

  private async copyToClipboard(text: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync(`echo ${text} | clip`);
      } else if (platform === 'darwin') {
        await execAsync(`echo "${text}" | pbcopy`);
      } else {
        await execAsync(`echo "${text}" | xclip -selection clipboard`);
      }
      this.addToHistory(originalInput, true, `Copied "${text}" to clipboard`);
      return { success: true, message: `Copied "${text}" to clipboard.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to copy to clipboard: ${error}`);
      return { success: false, message: 'Failed to copy to clipboard.', error: String(error) };
    }
  }

  private async clearClipboard(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('echo. | clip');
      } else if (platform === 'darwin') {
        await execAsync('pbcopy < /dev/null');
      } else {
        await execAsync('xclip -selection clipboard < /dev/null');
      }
      this.addToHistory(originalInput, true, 'Clipboard cleared');
      return { success: true, message: 'Clipboard cleared.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to clear clipboard: ${error}`);
      return { success: false, message: 'Failed to clear clipboard.', error: String(error) };
    }
  }

  private async showClipboardHistory(originalInput: string): Promise<CommandResult> {
    try {
      // This would integrate with the existing ClipboardManager service
      // For now, return a placeholder message
      this.addToHistory(originalInput, true, 'Clipboard history requested');
      return { success: true, message: 'Clipboard history feature is available. Use the clipboard manager interface to view history.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to show clipboard history: ${error}`);
      return { success: false, message: 'Failed to show clipboard history.', error: String(error) };
    }
  }

  // --- Browser Automation Handler ---
  private async handleBrowserAutomation(action: string, target: string, browser: string, originalInput: string): Promise<CommandResult> {
    // For now, just open/search in the specified browser (future: deep automation)
    let url = '';
    if (action === 'search') {
      url = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    } else if (action === 'open') {
      url = target.startsWith('http') ? target : `https://${target}`;
    }
    
    try {
      // Use the AppLaunchService to launch the browser with the URL
      const launchInput = `open ${browser}`;
      const result = await this.appLaunchService.launchApp(launchInput);
      
      if (result.success) {
        // If browser launched successfully, try to open the URL
        try {
          await shell.openExternal(url);
          this.addToHistory(originalInput, true, `Opened ${url} in ${browser}`);
          return { success: true, message: `Opened ${url} in ${browser}.` };
        } catch (urlError) {
          this.addToHistory(originalInput, true, `Launched ${browser} but failed to open URL`);
          return { success: true, message: `Launched ${browser}. You can manually navigate to ${url}.` };
        }
      } else {
        this.addToHistory(originalInput, false, `Failed to launch ${browser}: ${result.message}`);
        return { success: false, message: `Failed to launch ${browser}: ${result.message}` };
      }
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to open in ${browser}: ${error}`);
      return { success: false, message: `Failed to open in ${browser}.`, error: String(error) };
    }
    // Future: add Puppeteer/Playwright automation for fill/click actions
  }

  // --- Network Operations Handler ---
  private async handleNetworkOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Ping
    if (lowerInput.includes('ping')) {
      const pingMatch = input.match(/ping (.+)/i);
      if (pingMatch) {
        const target = pingMatch[1].trim();
        return await this.pingHost(target, input);
      }
    }

    // Check internet
    if (lowerInput.includes('internet') || lowerInput.includes('check connection')) {
      return await this.checkInternetConnection(input);
    }

    // Network status
    if (lowerInput.includes('network status') || lowerInput.includes('network info')) {
      return await this.getNetworkStatus(input);
    }

    // Download file
    if (lowerInput.includes('download')) {
      const downloadMatch = input.match(/download (.+?) to (.+)/i);
      if (downloadMatch) {
        const url = downloadMatch[1].trim();
        const destination = downloadMatch[2].trim();
        return await this.downloadFile(url, destination, input);
      }
    }

    return { success: false, message: 'Please specify a network operation (ping, internet, network status, download).' };
  }

  private async pingHost(target: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      const pingCount = platform === 'win32' ? '-n 4' : '-c 4';
      const result = await execAsync(`ping ${pingCount} ${target}`);
      this.addToHistory(originalInput, true, `Pinged ${target}`);
      return { success: true, message: `Ping result for ${target}:\n${result.stdout}`, data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to ping ${target}: ${error}`);
      return { success: false, message: `Failed to ping ${target}.`, error: String(error) };
    }
  }

  private async checkInternetConnection(originalInput: string): Promise<CommandResult> {
    try {
      const result = await execAsync('ping -n 1 8.8.8.8');
      this.addToHistory(originalInput, true, 'Internet connection check');
      return { success: true, message: 'Internet connection is working.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, 'Internet connection failed');
      return { success: false, message: 'No internet connection detected.', error: String(error) };
    }
  }

  private async getNetworkStatus(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'ipconfig';
      } else if (platform === 'darwin') {
        command = 'ifconfig';
      } else {
        command = 'ip addr';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Network status retrieved');
      return { success: true, message: 'Network status retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get network status: ${error}`);
      return { success: false, message: 'Failed to get network status.', error: String(error) };
    }
  }

  private async downloadFile(url: string, destination: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = `powershell -command "Invoke-WebRequest -Uri '${url}' -OutFile '${destination}'"`;
      } else {
        command = `curl -o "${destination}" "${url}"`;
      }
      await execAsync(command);
      this.addToHistory(originalInput, true, `Downloaded ${url} to ${destination}`);
      return { success: true, message: `Downloaded file to ${destination}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to download ${url}: ${error}`);
      return { success: false, message: 'Failed to download file.', error: String(error) };
    }
  }

  // --- Process Management Handler ---
  private async handleProcessManagement(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Kill process
    if (lowerInput.includes('kill process') || lowerInput.includes('end process')) {
      const killMatch = input.match(/kill process (.+)/i) || input.match(/end process (.+)/i);
      if (killMatch) {
        const processName = killMatch[1].trim();
        return await this.killProcess(processName, input);
      }
    }

    // List processes
    if (lowerInput.includes('list processes') || lowerInput.includes('show processes') || lowerInput.includes('running processes')) {
      return await this.listProcesses(input);
    }

    // Task manager
    if (lowerInput.includes('task manager') || lowerInput.includes('process manager')) {
      return await this.openTaskManager(input);
    }

    return { success: false, message: 'Please specify a process operation (kill process, list processes, task manager).' };
  }

  private async killProcess(processName: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = `taskkill /IM "${processName}" /F`;
      } else if (platform === 'darwin') {
        command = `pkill -f "${processName}"`;
      } else {
        command = `pkill -f "${processName}"`;
      }
      await execAsync(command);
      this.addToHistory(originalInput, true, `Killed process ${processName}`);
      return { success: true, message: `Killed process ${processName}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to kill process ${processName}: ${error}`);
      return { success: false, message: `Failed to kill process ${processName}.`, error: String(error) };
    }
  }

  private async listProcesses(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'tasklist';
      } else if (platform === 'darwin') {
        command = 'ps aux';
      } else {
        command = 'ps aux';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Processes listed');
      return { success: true, message: 'Process list retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to list processes: ${error}`);
      return { success: false, message: 'Failed to list processes.', error: String(error) };
    }
  }

  private async openTaskManager(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync('taskmgr');
      } else if (platform === 'darwin') {
        await execAsync('open -a "Activity Monitor"');
      } else {
        await execAsync('gnome-system-monitor');
      }
      this.addToHistory(originalInput, true, 'Task manager opened');
      return { success: true, message: 'Task manager opened.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to open task manager: ${error}`);
      return { success: false, message: 'Failed to open task manager.', error: String(error) };
    }
  }

  // --- Automation Operations Handler ---
  private async handleAutomationOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // Screenshot
    if (lowerInput.includes('screenshot') || lowerInput.includes('take screenshot')) {
      return await this.takeScreenshot(input);
    }

    // Record screen
    if (lowerInput.includes('record screen') || lowerInput.includes('start recording')) {
      return await this.recordScreen(input);
    }

    // Schedule task
    if (lowerInput.includes('schedule') || lowerInput.includes('set reminder')) {
      const scheduleMatch = input.match(/schedule (.+?) at (.+)/i);
      if (scheduleMatch) {
        const task = scheduleMatch[1].trim();
        const time = scheduleMatch[2].trim();
        return await this.scheduleTask(task, time, input);
      }
    }

    return { success: false, message: 'Please specify an automation operation (screenshot, record screen, schedule).' };
  }

  private async takeScreenshot(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const filepath = path.join(desktopPath, filename);

      if (platform === 'win32') {
        await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{PrtSc}')"`);
      } else if (platform === 'darwin') {
        await execAsync(`screencapture "${filepath}"`);
      } else {
        await execAsync(`gnome-screenshot -f "${filepath}"`);
      }
      
      this.addToHistory(originalInput, true, `Screenshot saved as ${filename}`);
      return { success: true, message: `Screenshot saved as ${filename} on Desktop.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to take screenshot: ${error}`);
      return { success: false, message: 'Failed to take screenshot.', error: String(error) };
    }
  }

  private async recordScreen(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${timestamp}.mp4`;
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const filepath = path.join(desktopPath, filename);

      if (platform === 'darwin') {
        await execAsync(`screencapture -v "${filepath}"`);
      } else {
        // For Windows and Linux, we'll use a placeholder for now
        // In a real implementation, you'd use ffmpeg or similar
        await execAsync(`echo "Recording started - press Ctrl+C to stop"`);
      }
      
      this.addToHistory(originalInput, true, `Screen recording started`);
      return { success: true, message: 'Screen recording started. Press Ctrl+C to stop.' };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to start recording: ${error}`);
      return { success: false, message: 'Failed to start screen recording.', error: String(error) };
    }
  }

  private async scheduleTask(task: string, time: string, originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      if (platform === 'win32') {
        await execAsync(`schtasks /create /tn "Doppel_${Date.now()}" /tr "${task}" /sc once /st "${time}"`);
      } else if (platform === 'darwin') {
        await execAsync(`at ${time} <<< "${task}"`);
      } else {
        await execAsync(`at ${time} <<< "${task}"`);
      }
      
      this.addToHistory(originalInput, true, `Scheduled task: ${task} at ${time}`);
      return { success: true, message: `Scheduled task: ${task} at ${time}.` };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to schedule task: ${error}`);
      return { success: false, message: 'Failed to schedule task.', error: String(error) };
    }
  }

  // --- Utility Operations Handler ---
  private async handleUtilityOperations(input: string): Promise<CommandResult> {
    const lowerInput = input.toLowerCase();
    
    // System info
    if (lowerInput.includes('system info') || lowerInput.includes('check system')) {
      return await this.getSystemInfo(input);
    }

    // System status
    if (lowerInput.includes('status') || lowerInput.includes('system status')) {
      return await this.getSystemStatus(input);
    }

    // Memory usage
    if (lowerInput.includes('memory') || lowerInput.includes('ram')) {
      return await this.getMemoryUsage(input);
    }

    // Disk usage
    if (lowerInput.includes('disk') || lowerInput.includes('storage')) {
      return await this.getDiskUsage(input);
    }

    return { success: false, message: 'Please specify a utility operation (system info, status, memory, disk).' };
  }

  private async getSystemInfo(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'systeminfo';
      } else if (platform === 'darwin') {
        command = 'system_profiler SPHardwareDataType';
      } else {
        command = 'lshw -short';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'System info retrieved');
      return { success: true, message: 'System information retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get system info: ${error}`);
      return { success: false, message: 'Failed to get system information.', error: String(error) };
    }
  }

  private async getSystemStatus(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'wmic cpu get loadpercentage';
      } else if (platform === 'darwin') {
        command = 'top -l 1 | head -10';
      } else {
        command = 'top -bn1 | head -10';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'System status retrieved');
      return { success: true, message: 'System status retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get system status: ${error}`);
      return { success: false, message: 'Failed to get system status.', error: String(error) };
    }
  }

  private async getMemoryUsage(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /Value';
      } else if (platform === 'darwin') {
        command = 'vm_stat';
      } else {
        command = 'free -h';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Memory usage retrieved');
      return { success: true, message: 'Memory usage retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get memory usage: ${error}`);
      return { success: false, message: 'Failed to get memory usage.', error: String(error) };
    }
  }

  private async getDiskUsage(originalInput: string): Promise<CommandResult> {
    try {
      const platform = os.platform();
      let command = '';
      if (platform === 'win32') {
        command = 'wmic logicaldisk get size,freespace,caption';
      } else if (platform === 'darwin') {
        command = 'df -h';
      } else {
        command = 'df -h';
      }
      const result = await execAsync(command);
      this.addToHistory(originalInput, true, 'Disk usage retrieved');
      return { success: true, message: 'Disk usage retrieved.', data: { stdout: result.stdout } };
    } catch (error) {
      this.addToHistory(originalInput, false, `Failed to get disk usage: ${error}`);
      return { success: false, message: 'Failed to get disk usage.', error: String(error) };
    }
  }

  // --- Email Handling Handler ---
  private async handleEmailComposition(input: string): Promise<CommandResult> {
    try {
      this.log('Starting email composition via Gmail automation', { input });
      
      // Check if browser automation is available
      if (!this.browserAutomationService.isAvailable()) {
        return {
          success: false,
          message: 'Browser automation is not available. Please ensure Puppeteer is installed.',
          error: 'Browser automation unavailable'
        };
      }

      // Use BrowserAutomationService to compose email via Gmail
      const result = await this.browserAutomationService.composeEmailViaGmail(input);
      
      this.addToHistory(input, true, 'Email composed via Gmail automation');
      this.log('Email composition completed', { input, result });
      
      return {
        success: true,
        message: result,
        data: { type: 'gmail_automation', result }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(input, false, `Email composition failed: ${errorMessage}`);
      this.log('Email composition error', { input, error });
      
      return {
        success: false,
        message: `Failed to compose email: ${errorMessage}`,
        error: errorMessage
      };
    }
  }
}

export const commandExecutor = new CommandExecutor(); 