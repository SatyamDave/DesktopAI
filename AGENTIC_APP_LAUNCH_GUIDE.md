# Agentic App-Launching System for Dello

## Overview

The Agentic App-Launching System is a sophisticated, AI-powered application launcher that provides intelligent intent recognition, fallback logic, and user preference learning. When a user says something like "open Chrome," the system intelligently handles the request with multiple layers of fallback and user interaction.

## Key Features

### 🎯 Intent Recognition
- **Natural Language Processing**: Understands user intent from natural language commands
- **Category Detection**: Automatically categorizes requests (browser, email, terminal, etc.)
- **Context Awareness**: Considers user context and previous interactions

### 🔍 App Detection
- **Local Installation Check**: Verifies if requested apps are installed
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Path Resolution**: Automatically finds correct app paths for each platform

### 🔄 Fallback Logic
- **Smart Alternatives**: Suggests appropriate alternatives when primary app isn't available
- **Category-Based Fallbacks**: Offers apps from the same category
- **User Preference Learning**: Remembers user choices for future interactions

### 🧠 Memory & Preferences
- **User Choice Storage**: Saves fallback preferences in `~/.doppel/app-preferences.json`
- **Learning System**: Adapts suggestions based on user behavior
- **Persistent Memory**: Maintains preferences across sessions

### 🤖 Agentic Design
- **Clarifying Questions**: Asks for clarification when multiple apps match
- **Error Handling**: Graceful error handling with helpful suggestions
- **Dynamic Adaptation**: Adapts behavior based on user responses

### 🔧 Extensibility
- **Modular Design**: Easy to add new app categories and configurations
- **Intent Mapping**: Configurable intent-action mapping system
- **Decision Trees**: Flexible fallback decision logic

## Usage Examples

### Basic App Launching
```bash
"open Chrome"           # Launches Chrome browser
"start Notepad"         # Opens Notepad text editor
"launch Terminal"       # Opens terminal application
```

### Intent-Based Launching
```bash
"open browser"          # Launches default browser (Chrome, Edge, Firefox)
"open email"            # Opens email client (Outlook, Gmail, Thunderbird)
"open terminal"         # Opens terminal (Windows Terminal, CMD, PowerShell)
```

### Fallback Scenarios
```bash
# If Chrome is not installed:
User: "open Chrome"
Dello: "Chrome is not installed. Would you like me to open Edge, Firefox, or Brave instead?"

# If multiple browsers are detected:
User: "open browser"
Dello: "I found multiple browsers: Chrome, Edge, Firefox. Which one would you prefer?"
```

### Category-Based Commands
```bash
"open text editor"      # Opens text editor (Notepad, Notepad++, VSCode)
"open file manager"     # Opens file explorer
"open music player"     # Opens music application
```

## Implementation Details

### App Configuration Structure
```typescript
interface AppConfig {
  name: string;           // App name
  aliases: string[];      // Alternative names/aliases
  category: string;       // App category (browser, email, terminal, etc.)
  windowsPath?: string;   // Windows installation path
  macPath?: string;       // macOS installation path
  linuxPath?: string;     // Linux installation path
  url?: string;          // Web app URL (for web-based apps)
  fallbacks?: string[];  // Preferred fallback apps
  priority: number;      // Launch priority (lower = higher priority)
}
```

### Intent Mapping System
```typescript
interface IntentMapping {
  intent: string;                    // Intent name
  keywords: string[];               // Keywords that trigger this intent
  categories: string[];             // Related app categories
  fallbackStrategy: 'category' | 'specific' | 'web';
}
```

### User Preference Storage
```typescript
interface UserPreference {
  originalRequest: string;    // Original user request
  fallbackChoice: string;     // User's fallback choice
  timestamp: number;          // When the choice was made
  success: boolean;           // Whether the choice was successful
}
```

## Supported App Categories

### 🌐 Browsers
- **Chrome**: Google Chrome browser
- **Edge**: Microsoft Edge browser
- **Firefox**: Mozilla Firefox browser
- **Brave**: Brave browser
- **Opera**: Opera browser

### 📧 Email Clients
- **Outlook**: Microsoft Outlook
- **Gmail**: Google Mail (web-based)
- **Thunderbird**: Mozilla Thunderbird

### 💻 Terminals
- **Windows Terminal**: Modern Windows terminal
- **CMD**: Command Prompt
- **PowerShell**: Windows PowerShell

### 📝 Text Editors
- **Notepad**: Windows Notepad
- **Notepad++**: Advanced text editor
- **VSCode**: Visual Studio Code

### 📁 File Managers
- **Explorer**: Windows File Explorer
- **Finder**: macOS Finder
- **Nautilus**: Linux file manager

## API Reference

### Core Methods

#### `launchApp(input: string): Promise<LaunchResult>`
Main method for launching apps with full agentic capabilities.

```typescript
const result = await appLaunchService.launchApp('open Chrome');
// Returns: { success: boolean, message: string, launchedApp?: string, fallbackUsed?: boolean }
```

#### `handleUserChoice(input: string, choice: string): Promise<LaunchResult>`
Handles user's choice when multiple options are presented.

```typescript
const result = await appLaunchService.handleUserChoice('open browser', 'edge');
```

#### `getAppSuggestions(input: string): string[]`
Returns app suggestions based on user input.

```typescript
const suggestions = appLaunchService.getAppSuggestions('browser');
// Returns: ['chrome', 'edge', 'firefox', 'brave']
```

#### `getCategoryApps(category: string): AppConfig[]`
Returns all apps in a specific category.

```typescript
const browsers = appLaunchService.getCategoryApps('browser');
```

#### `getAllCategories(): string[]`
Returns all available app categories.

```typescript
const categories = appLaunchService.getAllCategories();
// Returns: ['browser', 'email', 'terminal', 'text-editor', 'file-manager']
```

## Configuration Files

### App Preferences (`~/.doppel/app-preferences.json`)
Stores user preferences and fallback choices:
```json
[
  {
    "originalRequest": "open chrome",
    "fallbackChoice": "edge",
    "timestamp": 1703123456789,
    "success": true
  }
]
```

## Integration with CommandExecutor

The AppLaunchService is integrated into the existing CommandExecutor:

```typescript
// In CommandExecutor.ts
private async handleAppLaunch(input: string): Promise<CommandResult> {
  try {
    const result = await this.appLaunchService.launchApp(input);
    
    if (result.success) {
      this.addToHistory(input, true, `Launched ${result.launchedApp || 'app'}`);
    } else {
      this.addToHistory(input, false, result.message);
    }
    
    return {
      success: result.success,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to launch app.',
      error: String(error)
    };
  }
}
```

## Testing

Run the test suite to verify functionality:

```bash
node test-app-launch-system.js
```

The test suite covers:
- Basic app launching
- Intent recognition
- Fallback logic
- User choice handling
- App suggestions
- Category management

## Extending the System

### Adding New Apps
1. Add app configuration to `initializeAppConfigs()` method
2. Include proper paths for all supported platforms
3. Set appropriate category and fallback options
4. Test the new app configuration

### Adding New Categories
1. Create new category in app configurations
2. Add intent mapping in `initializeIntentMappings()`
3. Update fallback logic if needed
4. Test category-specific functionality

### Custom Fallback Logic
1. Modify `generateFallbackOptions()` method
2. Implement custom decision trees
3. Add category-specific fallback strategies
4. Test fallback scenarios

## Best Practices

### For Users
- Use natural language commands
- Provide feedback on fallback choices
- Be specific when multiple apps match
- Trust the system's learning capabilities

### For Developers
- Follow the modular design pattern
- Add comprehensive error handling
- Test cross-platform compatibility
- Document new app configurations
- Maintain user preference privacy

## Troubleshooting

### Common Issues

**App not found**
- Check if app is installed in expected location
- Verify app configuration paths
- Test with alternative app names

**Fallback not working**
- Check fallback app configurations
- Verify user preference storage
- Test category-based fallbacks

**Platform-specific issues**
- Verify platform-specific paths
- Check file permissions
- Test with different OS versions

### Debug Mode
Enable debug mode to see detailed logs:
```bash
DEBUG_MODE=true node your-app.js
```

## Future Enhancements

### Planned Features
- **AI-powered intent recognition**: More sophisticated NLP
- **App usage analytics**: Track app usage patterns
- **Smart suggestions**: ML-based app recommendations
- **Voice integration**: Voice command support
- **App state management**: Track running applications
- **Automation integration**: Combine with task automation

### Potential Integrations
- **System monitoring**: Track app performance
- **Cloud sync**: Sync preferences across devices
- **Team collaboration**: Share app preferences
- **Workflow automation**: Chain app launches with actions

## Conclusion

The Agentic App-Launching System provides a powerful, intelligent foundation for application management in Dello. With its modular design, extensive fallback logic, and user preference learning, it offers a seamless and adaptive user experience that improves over time.

The system is designed to be extensible, maintainable, and user-friendly, making it an ideal solution for modern desktop automation and productivity enhancement. 