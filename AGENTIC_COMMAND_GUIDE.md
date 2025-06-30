# Agentic Command System Guide

## Overview

The Agentic Command System is a new, intelligent command processor that understands natural language and automatically takes the right actions with graceful fallbacks. It replaces the previous circular dependency issues with a clean, extensible architecture.

## Core Features

### 🎯 Command Understanding
- Accepts high-level natural language commands
- Infers intent and required actions automatically
- No need for specific syntax or exact commands

### 🤖 Agentic Execution
- Automatically takes the right action
- Offers smart alternatives when primary options fail
- Never says "I can't do that" - always tries to help

### 🔄 Intelligent Fallbacks
- Web-based alternatives for missing apps
- Browser fallbacks for desktop applications
- Smart suggestions for alternatives

## Supported Commands

### App Launch Commands
```
"Open Spotify"
"Launch Chrome"
"Start Notepad"
"Open YouTube"
```

**Fallback Behavior:**
- If app isn't found locally → Opens web version
- If web version available → Opens in browser
- If no web version → Searches for alternatives

### Search Commands
```
"Search for React tutorial"
"Find Logan Paul videos"
"Look for Python documentation"
```

**Automatic Actions:**
- Web searches → Opens Google search
- YouTube searches → Opens YouTube search
- Video searches → Opens YouTube search

### Email Commands
```
"Write an email to Sarah"
"Compose email to manager"
"Send email to team"
"Draft email to client"
```

**Fallback Behavior:**
- Tries mailto: protocol first
- Falls back to Gmail compose if mailto fails
- Always provides email composition capability

### Weather Commands
```
"Check the weather in Tokyo"
"What's the temperature in New York"
"Weather forecast for London"
```

**Automatic Actions:**
- Opens weather search in browser
- Uses Google weather search

### System Control Commands
```
"Volume up"
"Volume down"
"Lock system"
"Sleep system"
```

**Supported Controls:**
- Audio volume control
- System lock
- System sleep
- Brightness control (platform dependent)

### File Operations
```
"Open file explorer"
"Create folder Projects"
"Show my documents"
```

**Automatic Actions:**
- Opens file explorer
- Creates folders/files
- Navigates to common directories

## Architecture

### AgenticCommandProcessor
The main processor that handles all natural language commands:

```typescript
// Process any natural language command
const result = await agenticCommandProcessor.processCommand("open spotify");
console.log(result.message); // "Launched Spotify successfully" or fallback message
```

### Intent Detection
Automatically detects command intent:

- **app_launch**: "open", "launch", "start"
- **web_search**: "search for", "find"
- **youtube_search**: "youtube", "video"
- **email_composition**: "write email", "compose email"
- **weather_check**: "weather", "temperature"
- **system_control**: "volume", "lock", "sleep"
- **file_operation**: "file", "folder", "create"

### Fallback System
Three-tier fallback strategy:

1. **Primary Action**: Try the exact requested action
2. **Web Fallback**: If app not found, try web version
3. **Search Fallback**: If no web version, search for alternatives

## User Preferences

The system remembers user preferences:

```typescript
// Set default browser
agenticCommandProcessor.setUserPreference('default_browser', 'chrome');

// Get preference
const browser = agenticCommandProcessor.getUserPreference('default_browser');
```

## Integration

### With CommandExecutor
The CommandExecutor now uses the AgenticCommandProcessor:

```typescript
// Old way (caused circular dependencies)
const result = await planActions(command);

// New way (clean, no circular dependencies)
const result = await agenticCommandProcessor.processCommand(command);
```

### With AIProcessor
The AIProcessor uses the AgenticCommandProcessor for command execution:

```typescript
// Process natural language with AI context
const result = await agenticCommandProcessor.processCommand(input);
const aiResponse = generateAIResponse(input, result);
```

## Error Handling

The system never fails completely:

```typescript
const result = await agenticCommandProcessor.processCommand("open nonexistentapp");

// Result will be:
{
  success: false,
  message: "I couldn't find nonexistentapp on your system.",
  fallback: "Try being more specific about the app name, or I can search for alternatives."
}
```

## Testing

Test the agentic commands:

```bash
# Build the project
npm run build

# Test specific commands
node test-agentic-commands.js

# Or test within the Electron app
npm run dev
```

## Extending the System

### Adding New Apps
Add to the `commonApps` map in `AgenticCommandProcessor`:

```typescript
['discord', {
  name: 'Discord',
  paths: [
    'C:\\Users\\%USERNAME%\\AppData\\Local\\Discord\\Update.exe',
    'C:\\Program Files\\Discord\\Discord.exe'
  ],
  webFallback: 'https://discord.com/app'
}]
```

### Adding New Intent Types
Extend the `detectIntent` method:

```typescript
// Add new intent detection
if (lowerInput.includes('calendar') || lowerInput.includes('schedule')) {
  return { type: 'calendar_action', data: { originalInput: input } };
}
```

### Adding New Handlers
Create new handler methods:

```typescript
private async handleCalendarAction(data: any, originalInput: string): Promise<CommandResult> {
  // Implement calendar functionality
  return await this.openWebUrl('https://calendar.google.com', 'Opened calendar');
}
```

## Benefits

### ✅ No More Circular Dependencies
- Clean architecture with clear dependencies
- No infinite loops or stack overflows
- Maintainable and extensible code

### ✅ Intelligent Fallbacks
- Always tries to help the user
- Multiple fallback strategies
- Graceful degradation

### ✅ Natural Language Understanding
- No need to learn specific commands
- Human-like interaction
- Context-aware responses

### ✅ Extensible Design
- Easy to add new commands
- Modular architecture
- Plugin-friendly structure

## Migration from Old System

The old system with circular dependencies has been replaced:

- ❌ `CommandExecutor` → `AIPlanner` → `AIProcessor` → `CommandExecutor` (circular)
- ✅ `CommandExecutor` → `AgenticCommandProcessor` (clean)

All existing functionality is preserved with better error handling and fallbacks.

## Future Enhancements

- Voice command integration
- Machine learning for better intent detection
- Plugin system for custom commands
- Cross-platform app detection
- Advanced fallback strategies
- User behavior learning 