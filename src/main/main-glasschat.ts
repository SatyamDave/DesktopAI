import { app, BrowserWindow, screen, globalShortcut, ipcMain, shell, clipboard } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { startStream } from '../audio/capturer';
require('dotenv').config();

// Import Friday core
import { Friday } from './core/friday';
import { runUserIntent } from './core/intentParser';
const friday = new Friday();

class GlassChatApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev: boolean;
  private fridayInitialized: boolean = false;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    // Enable debug mode for plugin loading
    process.env.DEBUG_MODE = 'true';
    
    app.whenReady().then(async () => {
      await this.initializeFriday();
      this.createMainWindow();
      this.setupGlobalShortcuts();
      this.setupIPC();
      this.startAudioPipeline();
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

  private async initializeFriday() {
    try {
      console.log('🤖 Initializing Friday AI Assistant...');
      await friday.initialize();
      this.fridayInitialized = true;
      console.log('✅ Friday initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Friday:', error);
      this.fridayInitialized = false;
    }
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
          preload: path.join(__dirname, 'preload-working.js'),
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      });

      // Use the built file for the UI, always
      const url = `file://${path.join(__dirname, '../../dist/renderer/index.html')}?glasschat=true`;
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
        const result = await runUserIntent(command);
        return result;
      } catch (error) {
        console.error('❌ Command execution error:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // Handle AI processing
    ipcMain.handle('process-ai-input', async (event, input) => {
      try {
        const provider = process.env.LLM_PROVIDER || 'groq';
        if (provider === 'openai') {
          // Use OpenAI Node SDK
          const openaiApiKey = process.env.OPENAI_API_KEY;
          if (!openaiApiKey) {
            return { success: false, error: 'OpenAI API key not set.' };
          }
          const client = new OpenAI({ apiKey: openaiApiKey });
          const response = await client.chat.completions.create({
            model: 'gpt-4.0', // or 'gpt-4.1' if available
            messages: [
              { role: 'system', content: 'You are a helpful, friendly, and witty AI assistant.' },
              { role: 'user', content: input }
            ]
          });
          const text = response.choices?.[0]?.message?.content || '';
          return { success: true, result: text };
        } else {
        // Use Groq API (OpenAI-compatible)
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return { success: false, error: 'GROQ API key not set.' };
        }
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3-70b-8192',
              messages: [
                { role: 'system', content: 'You are a helpful, friendly, and witty AI assistant.' },
                { role: 'user', content: input }
              ]
            })
          });
          const data = await response.json();
          if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return { success: true, result: data.choices[0].message.content };
          } else {
            return { success: false, error: 'No response from Groq LLM.' };
          }
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Friday AI command processing
    ipcMain.handle('friday-process-command', async (event, command: string) => {
      try {
        console.log('[Friday] IPC called with command:', command);
        if (!this.fridayInitialized) {
          return { 
            success: false, 
            error: 'Friday AI is not initialized',
            message: 'Friday AI system is not ready'
          };
        }
        let result = await friday.processCommand(command);
        console.log('[Friday] Result:', result);
        if (!result.success) {
          // Fallback to Groq LLM
          try {
            console.log('[Friday] Falling back to Groq LLM...');
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) return { success: false, message: 'GROQ API key not set.' };
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama-3-70b-8192',
                messages: [
                  { role: 'system', content: 'You are a helpful, friendly, and witty AI assistant.' },
                  { role: 'user', content: command }
                ]
              })
            });
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
              return { success: true, message: data.choices[0].message.content };
            } else {
              console.log('[Friday] Groq LLM returned no result, falling back to Gemini...');
              // Fallback to Gemini
              const geminiApiKey = process.env.GEMINI_API_KEY;
              if (!geminiApiKey) return { success: false, message: 'Gemini API key not set.' };
              const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey;
              const body = { contents: [{ parts: [{ text: command }] }] };
              const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const geminiData = await res.json();
              if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts[0].text) {
                return { success: true, message: geminiData.candidates[0].content.parts[0].text };
              }
              return { success: false, message: 'Could not get a response from Groq or Gemini.' };
            }
          } catch (llmError) {
            console.error('[Friday] LLM fallback error:', llmError);
            return { success: false, message: 'LLM fallback error: ' + String(llmError) };
          }
        }
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error,
          intent: result.intent,
          executionTime: result.executionTime,
          confidence: result.confidence
        };
      } catch (error: any) {
        console.error('❌ Friday command processing error:', error);
        return { 
          success: false, 
          error: error.message,
          message: 'Failed to process command'
        };
      }
    });

    // Friday plugin management
    ipcMain.handle('friday-get-plugins', async () => {
      try {
        if (!this.fridayInitialized) {
          return { plugins: [], manifests: [], stats: {} };
        }
        return {
          plugins: friday.getAvailablePlugins(),
          manifests: friday.getPluginManifests(),
          stats: friday.getRegistryStats()
        };
      } catch (error: any) {
        console.error('❌ Error getting plugins:', error);
        return { plugins: [], manifests: [], stats: {} };
      }
    });

    ipcMain.handle('friday-reload-plugin', async (event, pluginName: string) => {
      try {
        if (!this.fridayInitialized) {
          return { success: false, error: 'Friday AI is not initialized' };
        }
        await friday.reloadPlugin(pluginName);
        return { success: true, message: `Plugin ${pluginName} reloaded` };
      } catch (error: any) {
        console.error('❌ Error reloading plugin:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('friday-reload-all-plugins', async () => {
      try {
        if (!this.fridayInitialized) {
          return { success: false, error: 'Friday AI is not initialized' };
        }
        await friday.reloadAllPlugins();
        return { success: true, message: 'All plugins reloaded' };
      } catch (error: any) {
        console.error('❌ Error reloading all plugins:', error);
        return { success: false, error: error.message };
      }
    });

    // Friday stats and context
    ipcMain.handle('friday-get-stats', async () => {
      try {
        if (!this.fridayInitialized) {
          return { stats: null };
        }
        return { stats: friday.getStats() };
      } catch (error: any) {
        console.error('❌ Error getting stats:', error);
        return { stats: null };
      }
    });

    ipcMain.handle('friday-get-context', async () => {
      try {
        if (!this.fridayInitialized) {
          return { context: null };
        }
        return { context: await friday.getCurrentContext() };
      } catch (error: any) {
        console.error('❌ Error getting context:', error);
        return { context: null };
      }
    });

    ipcMain.handle('friday-get-status', async () => {
      try {
        return { 
          initialized: this.fridayInitialized,
          stats: this.fridayInitialized ? friday.getStats() : null
        };
      } catch (error: any) {
        console.error('❌ Error getting status:', error);
        return { initialized: false, stats: null };
      }
    });

    // Modular DELO automation handler (fallback)
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
        return { success: false, error: (error as Error).message };
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
        platform: process.platform,
        fridayInitialized: this.fridayInitialized
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
      return 'Error summarizing clipboard: ' + (e as Error).message;
    }
  }

  private startAudioPipeline() {
    // Start always-hearing audio pipeline and forward events to renderer
    try {
      startStream();
      // Listen for transcript, wake, chat, suggestion events from capturer
      const capturer = require('../audio/capturer');
      // Listen for events on global (window) in Node
      const eventTypes = ['transcript', 'wake', 'chat', 'suggestion'];
      eventTypes.forEach(type => {
        // Node.js doesn't have window, so use process or EventEmitter if needed
        // Here, we patch capturer to emit events on process
        process.on(type, (data) => {
          if (this.mainWindow) {
            this.mainWindow.webContents.send(type, data);
          }
        });
      });
    } catch (err) {
      console.error('Error starting audio pipeline:', err);
    }
  }
}

// Initialize the app
new GlassChatApp(); 