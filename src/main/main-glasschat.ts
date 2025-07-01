import { app, BrowserWindow, screen, globalShortcut, ipcMain, shell, clipboard } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import fetch from 'node-fetch';
require('dotenv').config();

class GlassChatApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupGlobalShortcuts();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow() {
    try {
      console.log('🚀 Starting GlassChat App...');
      
      // Get screen dimensions for full screen coverage
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      console.log('📱 Screen dimensions:', { screenWidth, screenHeight });
      
      this.mainWindow = new BrowserWindow({
        width: screenWidth,
        height: screenHeight,
        x: 0,
        y: 0,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        show: false,
        titleBarStyle: 'hidden',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });

      // Use the correct port that Vite is running on
      const url = this.isDev ? 'http://localhost:3006?glasschat=true' : `file://${path.join(__dirname, '../renderer/index.html')}?glasschat=true`;
      console.log(`🚀 Loading URL: ${url}`);
      
      this.mainWindow.loadURL(url);

      this.mainWindow.on('ready-to-show', () => {
        console.log('✅ GlassChat window ready to show');
        this.mainWindow?.show();
        this.mainWindow?.focus();
      });

      this.mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ GlassChat page finished loading');
        setTimeout(() => {
          this.mainWindow?.show();
          this.mainWindow?.focus();
          console.log('🎯 GlassChat window should now be visible');
        }, 1000);
      });

      this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
        console.error(`Error code: ${errorCode}`);
      });

      this.mainWindow.on('close', (event) => {
        event.preventDefault();
        this.mainWindow?.hide();
      });

      console.log('✅ GlassChat window created successfully');
    } catch (error) {
      console.error('❌ Error creating GlassChat window:', error);
    }
  }

  private setupGlobalShortcuts() {
    try {
      // Alt + D to toggle GlassChat visibility
      globalShortcut.register('Alt+D', () => {
        if (this.mainWindow) {
          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide();
            console.log('🪟 GlassChat hidden');
          } else {
            this.mainWindow.show();
            this.mainWindow.focus();
            console.log('🪟 GlassChat shown');
          }
        }
      });

      // ESC to hide GlassChat
      globalShortcut.register('Escape', () => {
        if (this.mainWindow?.isVisible()) {
          this.mainWindow.hide();
          console.log('🪟 GlassChat hidden (Escape)');
        }
      });

      console.log('✅ Global shortcuts registered successfully');
    } catch (error) {
      console.error('❌ Error setting up global shortcuts:', error);
    }
  }

  private setupIPC() {
    // Handle command execution
    ipcMain.handle('execute-command', async (event, command: string) => {
      try {
        console.log(`🎯 Executing command: "${command}"`);
        return { 
          success: true, 
          result: `Command executed: ${command}`,
          data: { type: 'command' }
        };
      } catch (error) {
        console.error('❌ Command execution error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle AI processing
    ipcMain.handle('process-ai-input', async (event, input: string) => {
      try {
        console.log(`🤖 Processing AI input: "${input}"`);
        return { 
          success: true, 
          result: `I understand: ${input}. How can I help you?`
        };
      } catch (error) {
        console.error('❌ AI processing error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Modular DELO automation handler
    ipcMain.handle('process-delo-command', async (event, { command }) => {
      try {
        const lower = command.toLowerCase();
        // App Launching
        if (lower.includes('open') && (lower.includes('chrome') || lower.includes('browser'))) {
          this.launchApp('chrome');
          return { success: true, result: 'Opening Chrome browser...' };
        }
        if (lower.includes('open') && (lower.includes('vscode') || lower.includes('code'))) {
          this.launchApp('vscode');
          return { success: true, result: 'Opening VSCode...' };
        }
        if (lower.includes('open') && (lower.includes('terminal') || lower.includes('cmd'))) {
          this.launchApp('terminal');
          return { success: true, result: 'Opening Terminal...' };
        }
        // Clipboard Summarization
        if (lower.includes('summarize') && lower.includes('clipboard')) {
          const text = clipboard.readText();
          if (!text) return { success: false, error: 'Clipboard is empty.' };
          const summary = await this.summarizeWithGemini(text);
          return { success: true, result: summary };
        }
        // Email Drafting
        if (lower.includes('email') || lower.includes('mail')) {
          const subject = encodeURIComponent('Draft from DELO');
          const body = encodeURIComponent('This is a draft email generated by DELO.');
          shell.openExternal(`https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`);
          return { success: true, result: 'Opening Gmail to draft your email...' };
        }
        // Web Search
        if (lower.startsWith('search ') || lower.includes('search for')) {
          const query = encodeURIComponent(command.replace(/search( for)?/i, '').trim());
          shell.openExternal(`https://www.google.com/search?q=${query}`);
          return { success: true, result: `Searching Google for "${decodeURIComponent(query)}"...` };
        }
        // Fallback
        return { success: false, error: 'Sorry, I could not understand or fulfill that command.' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Handle GlassChat visibility toggle
    ipcMain.handle('toggle-glasschat', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide();
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });

    // Handle app status
    ipcMain.handle('get-app-status', () => {
      return {
        isVisible: this.mainWindow?.isVisible() || false,
        isDev: this.isDev,
        platform: process.platform
      };
    });

    console.log('✅ IPC handlers setup complete');
  }

  private launchApp(appName: string) {
    // Cross-platform app launching
    if (process.platform === 'win32') {
      if (appName === 'chrome') child_process.exec('start chrome');
      if (appName === 'vscode') child_process.exec('code');
      if (appName === 'terminal') child_process.exec('start cmd');
    } else if (process.platform === 'darwin') {
      if (appName === 'chrome') child_process.exec('open -a "Google Chrome"');
      if (appName === 'vscode') child_process.exec('open -a "Visual Studio Code"');
      if (appName === 'terminal') child_process.exec('open -a Terminal');
    } else {
      if (appName === 'chrome') child_process.exec('google-chrome');
      if (appName === 'vscode') child_process.exec('code');
      if (appName === 'terminal') child_process.exec('x-terminal-emulator');
    }
  }

  private async summarizeWithGemini(text: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return 'Gemini API key not set.';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
    const body = {
      contents: [{ parts: [{ text }] }]
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      return 'Could not summarize clipboard.';
    } catch (e) {
      return 'Error summarizing clipboard: ' + e.message;
    }
  }
}

// Initialize the app
new GlassChatApp(); 