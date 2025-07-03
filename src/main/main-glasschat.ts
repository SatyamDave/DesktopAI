import { app, BrowserWindow, screen, globalShortcut, ipcMain, shell, clipboard } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import screenshot from 'screenshot-desktop';
import Tesseract from 'tesseract.js';
import { Window as NodeWindow } from 'node-screenshots';
require('dotenv').config();

// Import Friday core
import { Friday } from './core/friday';
// import { ScreenPerception } from './services/ScreenPerception';
const friday = new Friday();

class GlassChatApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev: boolean;
  private fridayInitialized: boolean = false;
  // private screenPerception: ScreenPerception;
  private latestScreenText: string = '';
  private latestScreenTimestamp: number = 0;
  private ocrInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('GlassChatApp: constructor start');
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    process.env.DEBUG_MODE = 'true';
    console.log('GlassChatApp: isDev set, DEBUG_MODE set');
    
    app.disableHardwareAcceleration();
    
    app.whenReady().then(async () => {
      console.log('GlassChatApp: app.whenReady');
      await this.initializeFriday();
      console.log('GlassChatApp: Friday initialized');
      this.createMainWindow();
      console.log('GlassChatApp: Main window created');
      this.setupGlobalShortcuts();
      console.log('GlassChatApp: Global shortcuts set up');
      this.setupIPC();
      console.log('GlassChatApp: IPC set up');
      // Disabled automatic background OCR - only scan when user requests it
      // this.startBackgroundScreenOCR();
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

    // this.screenPerception = new ScreenPerception();
    // this.screenPerception.init();
    console.log('GlassChatApp: constructor end');
  }

  private async initializeFriday() {
    try {
      console.log('Initializing Friday AI Assistant...');
      await friday.initialize();
      this.fridayInitialized = true;
      console.log('Friday initialized successfully');
    } catch (error) {
      console.error('Error initializing Friday:', error);
      this.fridayInitialized = false;
    }
  }

  private createMainWindow() {
    try {
      console.log('Creating GlassChat main window...');
      
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
          // Use join to ensure correct path in production (dist/main)
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

      console.log('GlassChat main window created');
    } catch (error) {
      console.error('Error creating GlassChat window:', error);
    }
  }

  private setupGlobalShortcuts() {
    try {
      console.log('Setting up global shortcuts...');
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

      console.log('Global shortcuts registered successfully');
    } catch (error) {
      console.error('Error setting up global shortcuts:', error);
    }
  }

  private setupIPC() {
    console.log('Setting up IPC handlers...');
    // IPC handlers to hide/show DELO overlay
    ipcMain.handle('hide-delo-overlay', async () => {
      if (this.mainWindow) {
        this.mainWindow.hide();
        return { success: true };
      }
      return { success: false, error: 'No main window' };
    });
    ipcMain.handle('show-delo-overlay', async () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        return { success: true };
      }
      return { success: false, error: 'No main window' };
    });
    // Handle screen reading request
    ipcMain.handle('read-screen-text', async () => {
      try {
        console.log('📖 Reading screen text...');
        const { screenOCRService } = require('./services/ScreenOCRService');
        
        // Initialize the service if not already done
        if (!screenOCRService.isInitialized) {
          await screenOCRService.initialize();
        }
        
        const text = await screenOCRService.forceCapture();
        console.log('📖 Screen text extracted:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        return { success: true, text };
      } catch (error) {
        console.error('❌ Error reading screen text:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Handle screenshot capture with region selection
    ipcMain.handle('capture-screen-region', async (event, region: { x: number, y: number, width: number, height: number }) => {
      try {
        const MIN_REGION_WIDTH = 10;
        const MIN_REGION_HEIGHT = 10;
        if (!region || region.width < MIN_REGION_WIDTH || region.height < MIN_REGION_HEIGHT) {
          return { success: false, error: `Selected region is too small to scan. Please select at least ${MIN_REGION_WIDTH}x${MIN_REGION_HEIGHT} pixels.` };
        }
        console.log('📸 Capturing screen region:', region);
        const screenshot = await this.getRegionScreenshot(region);
        if (!screenshot) {
          return { success: false, error: 'Failed to capture screenshot' };
        }
        
        // Run OCR on the screenshot
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(screenshot);
        await worker.terminate();
        
        if (!text.trim()) {
          return { success: false, error: 'No text found in selected region' };
        }
        
        // Process with LLM for summary and suggestions
        const summary = await this.processScreenContent(text);
        
        return { 
          success: true, 
          summary: summary.summary,
          suggestions: summary.suggestions,
          text: text.trim()
        };
      } catch (error) {
        console.error('❌ Screen region capture error:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Handle full screen capture and analysis
    ipcMain.handle('capture-full-screen', async () => {
      try {
        console.log('📸 Capturing full screen');
        const screenshot = await this.getRegionScreenshot();
        if (!screenshot) {
          return { success: false, error: 'Failed to capture screenshot' };
        }
        
        // Run OCR on the screenshot
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(screenshot);
        await worker.terminate();
        
        if (!text.trim()) {
          return { success: false, error: 'No text found on screen' };
        }
        
        // Process with LLM for summary and suggestions
        const summary = await this.processScreenContent(text);
        
        return { 
          success: true, 
          summary: summary.summary,
          suggestions: summary.suggestions,
          text: text.trim()
        };
      } catch (error) {
        console.error('❌ Full screen capture error:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

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
    const DELO_SYSTEM_PROMPT = `
You are DELO, a friendly, helpful AI assistant who talks to the user like a smart, supportive friend.
Be warm, conversational, and encouraging. Use natural, human language.
If you suggest actions, explain them in a way that feels like you're personally helping the user.
Always be positive and supportive, and make the user feel like they have a helpful companion.

Analyze the screen content and provide:
1. A friendly, conversational summary of what's visible
2. 3-5 helpful suggestions for what the user might want to do next
3. Focus only on the actual screen content, not UI elements or overlays

Format your response as JSON:
{
  "summary": "friendly summary here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
`;
    ipcMain.handle('process-ai-input', async (event, input) => {
      try {
        const provider = process.env.LLM_PROVIDER || 'groq';
        if (provider === 'openai') {
          const openaiApiKey = process.env.OPENAI_API_KEY;
          if (!openaiApiKey) {
            return { success: false, error: 'OpenAI API key not set.' };
          }
          const client = new OpenAI({ apiKey: openaiApiKey });
          const response = await client.chat.completions.create({
            model: 'gpt-4.0',
            messages: [
              { role: 'system', content: DELO_SYSTEM_PROMPT },
              { role: 'user', content: input }
            ]
          });
          const text = response.choices?.[0]?.message?.content || '';
          return { success: true, result: text };
        } else {
          // Use Groq API (OpenAI-compatible)
          const apiKey = process.env.GROQ_API_KEY || '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';
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3-70b-8192',
              messages: [
                { role: 'system', content: DELO_SYSTEM_PROMPT },
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
            const apiKey = process.env.GROQ_API_KEY || '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';
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama-3-70b-8192',
                messages: [
                  { role: 'system', content: DELO_SYSTEM_PROMPT },
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

    ipcMain.handle('getDeloSuggestions', async () => {
      try {
        // Lightweight: get active window title and app name only
        let appName = 'Unknown';
        let windowTitle = 'Unknown';
        if (process.platform === 'win32') {
          // Use built-in Electron API for Windows
          const { execSync } = require('child_process');
          try {
            // Use single quotes for PowerShell command and escape double quotes inside
            windowTitle = execSync('powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \"\" } | Sort-Object StartTime -Descending | Select-Object -First 1).MainWindowTitle"', { encoding: 'utf8' }).trim();
            appName = execSync('powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \"\" } | Sort-Object StartTime -Descending | Select-Object -First 1).ProcessName"', { encoding: 'utf8' }).trim();
          } catch (e) {
            // fallback: leave as Unknown
          }
        } else if (process.platform === 'darwin') {
          // Use AppleScript for macOS
          const { execSync } = require('child_process');
          try {
            const script = `tell application \"System Events\"\nset frontApp to name of first application process whose frontmost is true\nset frontWindow to name of first window of (first process whose frontmost is true)\nend tell\nreturn frontApp & \"|\" & frontWindow`;
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
            [appName, windowTitle] = result.trim().split('|');
          } catch (e) {}
        } else {
          // Linux fallback
          appName = process.title;
          windowTitle = process.title;
        }
        let prompt = '';
        if (appName !== 'Unknown' && windowTitle !== 'Unknown') {
          prompt = `Given the app name and window title, suggest helpful actions for the user.\nApp: ${appName}\nTitle: ${windowTitle}`;
        } else {
          prompt = 'Suggest helpful actions for a desktop user based on common productivity tasks.';
        }
        // Call LLM (OpenRouter or fallback)
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return { success: false, suggestions: [], error: 'OpenRouter API key not set.' };
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [
              { role: 'system', content: 'You are a helpful desktop assistant. Given the app name and window title, suggest helpful actions as a bullet list.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 64,
            temperature: 0.4
          })
        });
        const data = await response.json();
        let suggestions: string[] = [];
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          // Parse bullet points from LLM output
          const raw = data.choices[0].message.content;
          suggestions = raw.split(/\n|\r/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
        }
        if (suggestions.length === 0) {
          suggestions = ['Try searching the web', 'Summarize clipboard', 'Draft an email', 'Open a recent app'];
        }
        return { success: true, suggestions };
      } catch (error) {
        return { success: true, suggestions: ['Try searching the web', 'Summarize clipboard', 'Draft an email', 'Open a recent app'], error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Helper: get active window info (app name, window title)
    ipcMain.handle('getActiveWindowInfo', () => {
      let appName = 'Unknown';
      let windowTitle = 'Unknown';
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        try {
          windowTitle = execSync('powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \"\" } | Sort-Object StartTime -Descending | Select-Object -First 1).MainWindowTitle"', { encoding: 'utf8' }).trim();
          appName = execSync('powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \"\" } | Sort-Object StartTime -Descending | Select-Object -First 1).ProcessName"', { encoding: 'utf8' }).trim();
        } catch (e) {}
      } else if (process.platform === 'darwin') {
        const { execSync } = require('child_process');
        try {
          const script = `tell application \"System Events\"\nset frontApp to name of first application process whose frontmost is true\nset frontWindow to name of first window of (first process whose frontmost is true)\nend tell\nreturn frontApp & \"|\" & frontWindow`;
          const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
          [appName, windowTitle] = result.trim().split('|');
        } catch (e) {}
      } else {
        appName = process.title;
        windowTitle = process.title;
      }
      return { appName, windowTitle };
    });

    // Multi-window OCR: get text from all visible, non-minimized windows (excluding overlays)
    ipcMain.handle('getDeloScreenSummary', async (event, region) => {
      try {
        let ocrText = '';
        if (region) {
          const imgBuffer = await this.getRegionScreenshot(region);
          const preprocessed = await this.preprocessImageForOCR(imgBuffer);
          const { data: { text } } = await Tesseract.recognize(preprocessed, 'eng');
          ocrText = text;
        } else {
          ocrText = await this.getAllWindowsOCRText();
          if (!ocrText) {
            if (Date.now() - this.latestScreenTimestamp < 15000 && this.latestScreenText) {
              ocrText = this.latestScreenText;
            } else {
              ocrText = await this.getFreshScreenText();
            }
          }
        }
        // Contextual awareness: clipboard, app name, window title
        const clipboardText = clipboard.readText() || '';
        const { appName, windowTitle } = this.getActiveWindowInfo();
        let contextBlock = '';
        if (clipboardText) contextBlock += `\n\nClipboard: ${clipboardText.substring(0, 500)}`;
        if (appName && windowTitle) contextBlock += `\n\nActive App: ${appName}\nActive Window: ${windowTitle}`;
        const prompt = `You are DELO, a floating AI desktop assistant.\n\nHere is the visible text from the user's screen:\n\n${ocrText}${contextBlock}\n\nYour task:\n1. Summarize what is happening on screen.\n2. Infer what the user is trying to do or needs help with.\n3. Suggest 1–3 helpful actions (e.g., summarize, translate, reply, search, automate, open app).\n4. Categorize the type of activity (e.g., email, coding, form filling, browsing, meeting, research, writing).\n\nReturn your output **only** in the following JSON format:\n\n\u0060\u0060\u0060json\n{\n  "summary": "<what's happening>",\n  "intent": "<inferred user goal>",\n  "suggestedActions": ["<Action 1>", "<Action 2>", "<Action 3>"],\n  "intentCategory": "<one-word category>"\n}\n\u0060\u0060\u0060`;
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return { success: false, summary: '', suggestions: [], error: 'OpenRouter API key not set.' };
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [
              { role: 'system', content: DELO_SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            max_tokens: 256,
            temperature: 0.4
          })
        });
        const data = await response.json();
        let summary = '';
        let suggestions: string[] = [];
        let intent = '';
        let intentCategory = '';
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          const raw = data.choices[0].message.content;
          // Try to extract JSON from the response
          const match = raw.match(/```json([\s\S]*?)```/);
          let jsonStr = '';
          if (match && match[1]) {
            jsonStr = match[1];
          } else {
            // fallback: try to find first { ... }
            const braceMatch = raw.match(/\{[\s\S]*\}/);
            if (braceMatch) jsonStr = braceMatch[0];
          }
          try {
            const parsed = JSON.parse(jsonStr);
            summary = parsed.summary || '';
            intent = parsed.intent || '';
            suggestions = parsed.suggestedActions || [];
            intentCategory = parsed.intentCategory || '';
          } catch (e) {
            summary = raw;
            suggestions = [];
          }
        }
        return { success: true, summary, suggestions, intent, intentCategory };
      } catch (error) {
        return { success: false, summary: '', suggestions: [], error: error instanceof Error ? error.message : String(error) };
      }
    });

    console.log('IPC handlers setup complete');
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

  // Helper: get the best window for scanning (skip DELO/GlassChat/AgentMarket/empty)
  private getBestScanWindow() {
    const windows = require('node-screenshots').Window.all();
    // Known DELO/overlay names to skip
    const skipPatterns = [/glasschat/i, /delo/i, /agentmarket/i, /^$/i];
    // Filter out overlay/self windows
    const candidates = windows.filter(w => {
      const title = (w.title || '').toLowerCase();
      const app = (w.appName || '').toLowerCase();
      return !skipPatterns.some(p => p.test(title) || p.test(app));
    });
    // Prefer maximized, not minimized, non-empty title
    let best = candidates.find(w => !w.isMinimized && w.isMaximized && w.title && w.title.trim().length > 0);
    if (!best && candidates.length > 0) best = candidates[0];
    return best;
  }

  // Improved screen capture with cross-platform support
  private async getRegionScreenshot(region?: { x: number, y: number, width: number, height: number }) {
    const MIN_REGION_WIDTH = 10;
    const MIN_REGION_HEIGHT = 10;
    
    try {
      const { screen } = require('electron');
      const { desktopCapturer } = require('electron');
      
      // Get all displays
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      
      // Use Electron's desktopCapturer for better cross-platform support
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }
      
      // Get the primary screen source
      const source = sources.find(s => s.display_id === primaryDisplay.id.toString()) || sources[0];
      
      if (!source.thumbnail) {
        throw new Error('Failed to capture screen thumbnail');
      }
      
      // Convert to buffer
      const imageBuffer = source.thumbnail.toPNG();
      
      if (region) {
        if (region.width < MIN_REGION_WIDTH || region.height < MIN_REGION_HEIGHT) {
          return null;
        }
        
        // Simple cropping without sharp - return original buffer for now
        // TODO: Implement proper image cropping without sharp dependency
        console.warn('Image cropping not available without sharp dependency');
        return imageBuffer;
      } else {
        return imageBuffer;
      }
    } catch (error) {
      console.error('❌ Screen capture error:', error);
      
      // Fallback to node-screenshots
      try {
        const { Window } = require('node-screenshots');
        const best = this.getBestScanWindow();
        if (best) {
          const image = await best.captureImage();
          if (region) {
            if (region.width < MIN_REGION_WIDTH || region.height < MIN_REGION_HEIGHT) {
              return null;
            }
            const cropped = await image.crop(region.x, region.y, region.width, region.height);
            return await cropped.toPng();
          } else {
            return await image.toPng();
          }
        } else {
          // Final fallback: screenshot-desktop
          const screenshot = require('screenshot-desktop');
          const imgBuffer = await screenshot();
          if (region) {
            if (region.width < MIN_REGION_WIDTH || region.height < MIN_REGION_HEIGHT) {
              return null;
            }
            // Simple cropping without sharp - return original buffer for now
            console.warn('Image cropping not available without sharp dependency');
            return imgBuffer;
          } else {
            return imgBuffer;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback screen capture also failed:', fallbackError);
        throw new Error('Screen capture failed on all methods');
      }
    }
  }

  // Background OCR removed - only scan when user requests it
  // private startBackgroundScreenOCR() {
  //   // This method is no longer used
  // }

  private async getFreshScreenText() {
    try {
      const { screenOCRService } = require('./services/ScreenOCRService');
      const text = await screenOCRService.forceCapture();
      this.latestScreenText = text;
      this.latestScreenTimestamp = Date.now();
      return text;
    } catch (e) {
      console.error('Error getting fresh screen text:', e);
      return this.latestScreenText || '';
    }
  }

  // Multi-window OCR: get text from all visible, non-minimized windows (excluding overlays)
  private async getAllWindowsOCRText() {
    const windows = require('node-screenshots').Window.all();
    const skipPatterns = [/glasschat/i, /delo/i, /agentmarket/i, /^$/i];
    const candidates = windows.filter(w => {
      const title = (w.title || '').toLowerCase();
      const app = (w.appName || '').toLowerCase();
      return !w.isMinimized && !skipPatterns.some(p => p.test(title) || p.test(app));
    });
    let allText = '';
    for (const win of candidates) {
      try {
        const image = await win.captureImage();
        const preprocessed = await this.preprocessImageForOCR(await image.toPng());
        const { data: { text } } = await Tesseract.recognize(preprocessed, 'eng');
        if (text && text.trim().length > 0) {
          allText += `\n[${win.title || win.appName}]:\n${text}\n`;
        }
      } catch (e) {
        // Ignore errors for individual windows
      }
    }
    return allText.trim();
  }

  // Helper: preprocess image buffer for OCR (simplified without sharp)
  private async preprocessImageForOCR(imgBuffer: Buffer): Promise<Buffer> {
    // Return original buffer - Tesseract can handle most image formats directly
    return imgBuffer;
  }

  private getActiveWindowInfo() {
    let appName = 'Unknown';
    let windowTitle = 'Unknown';
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        windowTitle = execSync('powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \"\" } | Sort-Object StartTime -Descending | Select-Object -First 1).MainWindowTitle"', { encoding: 'utf8' }).trim();
        appName = execSync('powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne \"\" } | Sort-Object StartTime -Descending | Select-Object -First 1).ProcessName"', { encoding: 'utf8' }).trim();
      } catch (e) {}
    } else if (process.platform === 'darwin') {
      const { execSync } = require('child_process');
      try {
        const script = `tell application \"System Events\"\nset frontApp to name of first application process whose frontmost is true\nset frontWindow to name of first window of (first process whose frontmost is true)\nend tell\nreturn frontApp & \"|\" & frontWindow`;
        const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
        [appName, windowTitle] = result.trim().split('|');
      } catch (e) {}
    } else {
      appName = process.title;
      windowTitle = process.title;
    }
    return { appName, windowTitle };
  }

  private async processScreenContent(text: string) {
    try {
      const DELO_SYSTEM_PROMPT = `
You are DELO, a friendly, helpful AI assistant who talks to the user like a smart, supportive friend.
Be warm, conversational, and encouraging. Use natural, human language.
If you suggest actions, explain them in a way that feels like you're personally helping the user.
Always be positive and supportive, and make the user feel like they have a helpful companion.

Analyze the screen content and provide:
1. A friendly, conversational summary of what's visible
2. 3-5 helpful suggestions for what the user might want to do next
3. Focus only on the actual screen content, not UI elements or overlays

Format your response as JSON:
{
  "summary": "friendly summary here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
`;

      const provider = process.env.LLM_PROVIDER || 'groq';
      if (provider === 'openai') {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return { summary: 'OpenAI API key not set.', suggestions: [] };
        }
        const client = new OpenAI({ apiKey: openaiApiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4.0',
          messages: [
            { role: 'system', content: DELO_SYSTEM_PROMPT },
            { role: 'user', content: `Analyze this screen content: ${text}` }
          ]
        });
        const result = response.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(result);
          return { summary: parsed.summary, suggestions: parsed.suggestions || [] };
        } catch {
          return { summary: result, suggestions: [] };
        }
      } else {
        // Use Groq API (OpenAI-compatible)
        const apiKey = process.env.GROQ_API_KEY || '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';
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3-70b-8192',
            messages: [
              { role: 'system', content: DELO_SYSTEM_PROMPT },
              { role: 'user', content: `Analyze this screen content: ${text}` }
            ]
          })
        });
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          const result = data.choices[0].message.content;
          try {
            const parsed = JSON.parse(result);
            return { summary: parsed.summary, suggestions: parsed.suggestions || [] };
          } catch {
            return { summary: result, suggestions: [] };
          }
        } else {
          return { summary: 'No response from LLM.', suggestions: [] };
        }
      }
    } catch (error) {
      console.error('❌ Screen content processing error:', error);
      return { 
        summary: 'Sorry, I had trouble analyzing the screen content. Please try again!', 
        suggestions: [] 
      };
    }
  }
}

// Initialize the app
new GlassChatApp(); 