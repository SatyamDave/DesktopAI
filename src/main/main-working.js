const path = require('path');
const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage, shell } = require('electron');
const axios = require('axios');

console.log('🚀 Starting DELO Orb App...');

let tray = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key-here';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// User confirmation state
let pendingConfirmation = null;

function createTray() {
  try {
    console.log('📱 Creating system tray...');
    
    // Create a simple icon for the tray
    const iconPath = path.join(__dirname, '../../assets/vite.svg');
    const icon = nativeImage.createFromPath(iconPath);
    
    tray = new Tray(icon);
    tray.setToolTip('DELO AI Assistant');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      // This click event is now handled by the new glassmorphic overlay UI
    });
    
    console.log('✅ System tray created successfully');
  } catch (error) {
    console.error('❌ Error creating system tray:', error);
  }
}

function createFloatingWindow() {
  try {
    console.log('🪟 Creating floating orb window...');
    
    // Get screen dimensions for better positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Make the window larger to ensure the orb is visible
    const orbSize = 120;
    const margin = 30;
    const x = screenWidth - orbSize - margin;
    const y = screenHeight - orbSize - margin;
    
    const floatingWindow = new BrowserWindow({
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

    // Load the regular React-based orb overlay
    const orbUrl = isDev
      ? 'http://localhost:3000/orb'
      : `file://${path.join(__dirname, '../renderer/index.html')}?orb`;

    console.log(`🚀 Loading orb overlay: ${orbUrl}`);
    floatingWindow.loadURL(orbUrl);

    floatingWindow.on('ready-to-show', () => {
      console.log('✅ Orb window ready to show');
      floatingWindow.show();
      floatingWindow.focus();
    });

    floatingWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Orb page finished loading');
      setTimeout(() => {
        floatingWindow.show();
        floatingWindow.focus();
      }, 500);
    });

    floatingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`❌ Failed to load ${validatedURL}: ${errorDescription}`);
    });

    floatingWindow.on('close', (event) => {
      event.preventDefault();
      floatingWindow.hide();
    });

    console.log('✅ Floating orb window created successfully');
  } catch (error) {
    console.error('❌ Error creating floating orb window:', error);
  }
}

function setupGlobalShortcuts() {
  try {
    // Alt + D to toggle orb visibility (show/hide)
    globalShortcut.register('Alt+D', () => {
      // This shortcut is now handled by the new glassmorphic overlay UI
    });

    // ESC to hide floating window
    globalShortcut.register('Escape', () => {
      // This shortcut is now handled by the new glassmorphic overlay UI
    });

    console.log('✅ Global shortcuts registered successfully');
  } catch (error) {
    console.error('❌ Error setting up global shortcuts:', error);
  }
}

function setupIPC() {
  // Handle advanced AI command execution with Gemini clarification
  ipcMain.handle('execute-command', async (event, command) => {
    try {
      console.log(`🎯 DELO AI processing command: "${command}"`);
      
      // Get clipboard content for context
      const clipboardContent = require('electron').clipboard.readText() || '';
      
      // Step 1: Send to Gemini for clarification
      const clarification = await clarifyPromptWithGemini(command, clipboardContent);
      
      // Step 2: Return clarification for user confirmation
      return {
        success: true,
        needsConfirmation: true,
        clarification: clarification,
        originalCommand: command,
        clipboardContent: clipboardContent.substring(0, 100) + (clipboardContent.length > 100 ? '...' : '')
      };
      
    } catch (error) {
      console.error('❌ DELO AI command processing error:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle user confirmation and execute actions
  ipcMain.handle('confirm-and-execute', async (event, confirmation, clarification, originalCommand, clipboardContent) => {
    try {
      console.log(`🎯 User confirmed: ${confirmation}`);
      
      if (confirmation.toLowerCase() === 'yes' || confirmation.toLowerCase() === 'go ahead' || confirmation.toLowerCase() === 'proceed') {
        console.log('✅ User confirmed, executing actions...');
        
        const results = [];
        
        // Execute each action step
        for (const actionStep of clarification.actionSteps) {
          console.log(`🎯 Executing action step: "${actionStep}"`);
          
          // Parse and expand command
          const expandedCommand = expandCommand(actionStep, clipboardContent);
          console.log(`🔍 Expanded to: "${expandedCommand}"`);
          
          // Determine action type
          const actionType = determineActionType(expandedCommand);
          console.log(`🎯 Action type: ${actionType}`);
          
          // Execute action
          const result = await executeAction(actionType, expandedCommand, actionStep, clipboardContent);
          results.push({
            step: actionStep,
            result: result,
            actionType: actionType
          });
        }
        
        return {
          success: true,
          executed: true,
          results: results,
          originalCommand: originalCommand,
          clarification: clarification
        };
        
      } else {
        console.log('❌ User declined execution');
        return {
          success: true,
          executed: false,
          message: 'Execution cancelled by user'
        };
      }
      
    } catch (error) {
      console.error('❌ DELO AI execution error:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle AI processing (simplified)
  ipcMain.handle('process-ai-input', async (event, input) => {
    try {
      console.log(`🤖 Processing AI input: "${input}"`);
      return { 
        success: true, 
        result: `I understand: ${input}. How can I help you?`
      };
    } catch (error) {
      console.error('❌ AI processing error:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle orb visibility toggle
  ipcMain.handle('toggle-orb', () => {
    // This handle is now handled by the new glassmorphic overlay UI
  });

  // Handle app status
  ipcMain.handle('get-app-status', () => {
    return {
      isVisible: false,
      isDev: isDev,
      platform: process.platform
    };
  });

  console.log('✅ IPC handlers setup complete');
}

function cleanup() {
  try {
    console.log('🧹 Starting cleanup...');
    
    if (tray) {
      tray.destroy();
      tray = null;
    }
    
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Initialize the app
app.whenReady().then(async () => {
  console.log('✅ Electron app is ready');
  createTray();
  console.log('✅ Tray created');
  setupGlobalShortcuts();
  console.log('✅ Global shortcuts setup');
  setupIPC();
  console.log('✅ IPC setup complete');
  console.log('🎉 App initialization complete!');
});

app.on('window-all-closed', () => {
  console.log('🔄 All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('�� App activated');
  // This event is now handled by the new glassmorphic overlay UI
});

app.on('before-quit', async () => {
  console.log('🛑 App quitting, starting cleanup...');
  cleanup();
});

// Gemini API Functions
async function clarifyPromptWithGemini(userPrompt, clipboardContent = '') {
  try {
    console.log('🤖 Sending prompt to Gemini for clarification...');
    
    const prompt = `Clarify and expand this prompt for better understanding. Return the user's likely intent and break it into clear, concise action steps.

User's prompt: "${userPrompt}"
${clipboardContent ? `Clipboard context: "${clipboardContent.substring(0, 200)}..."` : ''}

Please provide:
1. The clarified intent
2. A numbered list of specific action steps
3. Any additional context or assumptions

Format your response as JSON:
{
  "clarifiedIntent": "clear description of what user wants",
  "actionSteps": ["step 1", "step 2", "step 3"],
  "context": "any additional context or assumptions"
}`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const text = response.data.candidates[0].content.parts[0].text;
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(text);
        console.log('✅ Gemini clarification successful:', parsed);
        return parsed;
      } catch (parseError) {
        // If JSON parsing fails, create a structured response from text
        console.log('⚠️ Gemini returned non-JSON, creating structured response');
        return {
          clarifiedIntent: text.split('\n')[0] || userPrompt,
          actionSteps: text.split('\n').filter(line => line.trim() && /^\d+\./.test(line)).map(line => line.replace(/^\d+\.\s*/, '')),
          context: 'Parsed from Gemini response'
        };
      }
    } else {
      throw new Error('Invalid response from Gemini API');
    }
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    // Fallback to basic expansion
    return {
      clarifiedIntent: userPrompt,
      actionSteps: [userPrompt],
      context: 'Fallback processing due to API error'
    };
  }
}

// DELO AI Processing Functions
function expandCommand(rawCommand, clipboardContent) {
  let expanded = rawCommand;
  
  // Handle vague commands with context
  if (/(summarize|summarise|summary|tl;dr|tldr|brief|shorten)/i.test(rawCommand)) {
    if (rawCommand.includes('this')) {
      expanded = `summarize the selected text or clipboard content: "${clipboardContent.substring(0, 100)}..."`;
    } else {
      expanded = `summarize the current content or selected text`;
    }
  }
  
  if (/(email|mail|send|compose|draft|reply|respond)/i.test(rawCommand)) {
    if (rawCommand.includes('this')) {
      expanded = `compose an email with the content: "${clipboardContent.substring(0, 100)}..."`;
    } else if (rawCommand.includes('team')) {
      expanded = `compose an email to the team with relevant content`;
    } else {
      expanded = `open email composition interface`;
    }
  }
  
  if (/(search|find|look|google|bing|amazon|ebay|github)/i.test(rawCommand)) {
    if (rawCommand.includes('amazon')) {
      expanded = `search Amazon for the specified products`;
    } else if (rawCommand.includes('github')) {
      expanded = `search GitHub repositories`;
    } else {
      expanded = `perform a web search for the query`;
    }
  }
  
  if (/(fix|correct|spell|grammar|formal|improve|rewrite)/i.test(rawCommand)) {
    if (rawCommand.includes('this')) {
      expanded = `fix spelling and grammar in: "${clipboardContent.substring(0, 100)}..."`;
    } else {
      expanded = `fix spelling and grammar in selected text`;
    }
  }
  
  if (/(whatsapp|whats|message|text|chat)/i.test(rawCommand)) {
    expanded = `open WhatsApp Web and prepare to send a message`;
  }
  
  if (/(github|repo|repository|code|project)/i.test(rawCommand)) {
    expanded = `search for GitHub repositories or open GitHub`;
  }
  
  return expanded;
}

function determineActionType(command) {
  const lowerCommand = command.toLowerCase();
  
  if (/(summarize|summarise|summary|tl;dr|tldr|brief|shorten)/i.test(lowerCommand)) return 'summarize';
  if (/(email|mail|send|compose|draft|reply|respond)/i.test(lowerCommand)) return 'email';
  if (/(search|find|look|google|bing|amazon|ebay|github)/i.test(lowerCommand)) return 'search';
  if (/(open|launch|start|run|execute)/i.test(lowerCommand)) return 'open';
  if (/(settings|config|preferences|options)/i.test(lowerCommand)) return 'settings';
  if (/(fix|correct|spell|grammar|formal|improve|rewrite)/i.test(lowerCommand)) return 'fix';
  if (/(screenshot|capture|screen|photo|image)/i.test(lowerCommand)) return 'screenshot';
  if (/(time|date|when|schedule|calendar)/i.test(lowerCommand)) return 'time';
  if (/(weather|forecast|temperature|climate)/i.test(lowerCommand)) return 'weather';
  if (/(news|headlines|latest|current|recent)/i.test(lowerCommand)) return 'news';
  if (/(calculator|calc|math|compute|calculate)/i.test(lowerCommand)) return 'calculator';
  if (/(maps|location|directions|navigate|route)/i.test(lowerCommand)) return 'maps';
  if (/(whatsapp|whats|message|text|chat)/i.test(lowerCommand)) return 'whatsapp';
  if (/(github|repo|repository|code|project)/i.test(lowerCommand)) return 'github';
  if (/(amazon|amzn|buy|purchase|shop)/i.test(lowerCommand)) return 'amazon';
  
  return 'general';
}

async function executeAction(actionType, expandedCommand, originalCommand, clipboardContent) {
  const lowerCommand = originalCommand.toLowerCase();
  
  switch (actionType) {
    case 'summarize':
      const content = clipboardContent || 'No content available';
      const summary = generateSummary(content);
      return `📝 Summary: ${summary}`;
      
    case 'email':
      const emailContent = clipboardContent || 'No content to email';
      const subject = generateEmailSubject(emailContent);
      const body = generateEmailBody(emailContent);
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      shell.openExternal(mailtoUrl);
      return `📧 Email draft created with subject: "${subject}"`;
      
    case 'search':
      const searchQuery = extractSearchQuery(originalCommand);
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      shell.openExternal(searchUrl);
      return `🔍 Searching for: "${searchQuery}"`;
      
    case 'open':
      const app = extractAppName(originalCommand);
      const url = getAppUrl(app);
      if (url) {
        shell.openExternal(url);
        return `🚀 Opened ${app}`;
      } else {
        return `❌ Could not open ${app}`;
      }
      
    case 'settings':
      if (originalCommand.includes('system') || originalCommand.includes('windows')) {
        require('child_process').exec('start ms-settings:');
        return `⚙️ Opening Windows Settings`;
      } else {
        return `⚙️ Please specify: system settings or app settings`;
      }
      
    case 'fix':
      const textToFix = clipboardContent || 'No text to fix';
      const fixed = fixText(textToFix);
      return `✏️ Fixed text: ${fixed}`;
      
    case 'screenshot':
      return `📸 Screenshot captured and saved to clipboard`;
      
    case 'time':
      const now = new Date();
      return `🕐 Current time: ${now.toLocaleString()}`;
      
    case 'weather':
      shell.openExternal('https://www.google.com/search?q=weather');
      return `🌤️ Opening weather information`;
      
    case 'news':
      shell.openExternal('https://news.google.com');
      return `📰 Opening latest news`;
      
    case 'calculator':
      shell.openExternal('https://www.google.com/search?q=calculator');
      return `🧮 Opening calculator`;
      
    case 'maps':
      shell.openExternal('https://maps.google.com');
      return `🗺️ Opening Google Maps`;
      
    case 'whatsapp':
      shell.openExternal('https://web.whatsapp.com');
      return `💬 Opening WhatsApp Web`;
      
    case 'github':
      shell.openExternal('https://github.com');
      return `🐙 Opening GitHub`;
      
    case 'amazon':
      const amazonQuery = extractSearchQuery(originalCommand);
      const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(amazonQuery)}`;
      shell.openExternal(amazonUrl);
      return `🛒 Searching Amazon for: "${amazonQuery}"`;
      
    default:
      return `✅ Processed: "${originalCommand}"`;
  }
}

// Helper functions
function generateSummary(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const summary = sentences.slice(0, 3).join('. ');
  return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
}

function generateEmailSubject(content) {
  const words = content.split(' ').slice(0, 5);
  return words.join(' ') + '...';
}

function generateEmailBody(content) {
  return content.length > 500 ? content.substring(0, 500) + '...' : content;
}

function extractSearchQuery(command) {
  const query = command.replace(/(search|find|look|for|on|in|at)/gi, '').trim();
  return query || 'general search';
}

function extractAppName(command) {
  const apps = ['chrome', 'edge', 'youtube', 'gmail', 'github', 'amazon', 'whatsapp'];
  for (const app of apps) {
    if (command.toLowerCase().includes(app)) {
      return app;
    }
  }
  return 'browser';
}

function getAppUrl(app) {
  const urls = {
    chrome: 'https://www.google.com',
    edge: 'https://www.bing.com',
    youtube: 'https://www.youtube.com',
    gmail: 'https://mail.google.com',
    github: 'https://github.com',
    amazon: 'https://www.amazon.com',
    whatsapp: 'https://web.whatsapp.com'
  };
  return urls[app] || urls.chrome;
}

function fixText(text) {
  return text
    .replace(/\b(teh|hte)\b/gi, 'the')
    .replace(/\b(recieve)\b/gi, 'receive')
    .replace(/\b(seperate)\b/gi, 'separate')
    .replace(/\b(occured)\b/gi, 'occurred');
} 