# DELO - Intelligent Desktop Automation System

## 🧠 Overview

DELO is an intelligent desktop automation assistant built with Electron + Vite + TypeScript that enables natural language task automation across your desktop. It's not just a UI — it's an intelligent automation layer that understands context and gets things done.

## ✨ Key Features

### 1. **Clipboard + Screen Context Input**
- Automatically detects clipboard changes
- Reads screen text using OCR
- Understands what you're working on (email, PDF, terminal, etc.)
- Context-aware suggestions based on current content

### 2. **Natural Language Task Parsing**
- Parses commands like:
  - "Summarize this"
  - "Translate to Spanish"
  - "Send this as an email"
  - "Create a task from this"
- Uses AI to classify intent and extract arguments
- Fallback to keyword matching for reliability

### 3. **Command Execution Engine**
- Routes intent to the right plugin:
  - `summarize()` - Creates bullet-point summaries
  - `translate()` - Translates content to any language
  - `draft_email()` - Composes and opens email drafts
  - `schedule_event()` - Creates tasks and reminders
  - `search()` - Opens web searches
  - `open_app()` - Launches applications
  - `screenshot()` - Takes screenshots
  - `system_control()` - Volume, brightness, lock, etc.

### 4. **Cross-App Automation**
- Detects current app/context
- Opens applications via shell or browser
- Auto-fills content using prior text
- Awaits user approval before sending

### 5. **Session Memory + Non-Redundancy**
- Stores short-term memory of actions
- Prevents duplicate task execution
- Content hash tracking for efficiency
- Pattern recognition for workflow optimization

### 6. **Proactive Suggestions**
- Detects repeat patterns (e.g., summarize + email after meetings)
- Offers smart nudges like: "You just copied meeting notes. Want to send a recap?"
- Context-aware quick actions
- Productivity insights and recommendations

## 🚀 Quick Start

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AgentMarket
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your API keys
```

4. **Start the application**
```bash
npm run dev
```

### Basic Usage

1. **Launch DELO**
   - Click the floating orb to open the DELO interface
   - Or use the global hotkey (Ctrl+Shift+D)

2. **Natural Language Commands**
   ```
   "summarize this"           # Summarize clipboard content
   "translate to Spanish"     # Translate clipboard content
   "send as email to team"    # Create email draft
   "create task from this"    # Create task from content
   "search for AI news"       # Web search
   "open Gmail"              # Launch application
   "take screenshot"         # Capture screen
   "volume up"               # System control
   ```

3. **Context-Aware Workflows**
   ```
   Copy meeting notes → "summarize this and email to Sarah"
   Copy article → "translate to French"
   Copy task list → "create tasks from this"
   ```

## 🏗️ Architecture

### Core Components

#### 1. **DELOCommandSystem** (`src/main/services/DELOCommandSystem.ts`)
- Main orchestrator for all automation features
- Manages command registration and execution
- Handles session memory and pattern recognition
- Provides context-aware suggestions

#### 2. **Command Interface**
```typescript
interface DeloCommand {
  name: string;
  description: string;
  match(input: string, context: DeloContext): boolean;
  execute(context: DeloContext, args?: any): Promise<DeloCommandResult>;
  getSuggestions?(context: DeloContext): string[];
}
```

#### 3. **Context Management**
```typescript
interface DeloContext {
  clipboardContent: string;
  activeApp: string;
  windowTitle: string;
  screenText?: string;
  recentCommands: string[];
  sessionDuration: number;
  userIntent?: string;
  extractedArgs?: any;
}
```

### Service Integration

- **ClipboardManager**: Monitors clipboard changes
- **ScreenOCRService**: Extracts text from screen
- **ActiveWindowService**: Tracks active application
- **LocalLLMService**: Natural language processing
- **EmailService**: Email composition and sending
- **AppLaunchService**: Application launching
- **SessionMemoryManager**: Session tracking and insights

## 📝 Command Examples

### Text Processing
```bash
"summarize this document"     # Creates bullet-point summary
"translate to French"         # Translates clipboard content
"extract key points"          # Extracts main ideas
"format as bullet points"     # Reformats text
```

### Communication
```bash
"send as email to john@example.com"    # Creates email draft
"email this to the team"               # Team email with content
"compose reply to this"                # Reply to current email
"schedule meeting about this"          # Creates calendar event
```

### Task Management
```bash
"create task from this"       # Creates task from content
"add to todo list"           # Adds to task list
"set reminder for tomorrow"  # Creates reminder
"schedule follow-up"         # Schedules follow-up task
```

### System Control
```bash
"open Gmail"                 # Launches Gmail
"take screenshot"           # Captures screen
"volume up"                 # Increases volume
"lock computer"             # Locks system
"brightness down"           # Decreases brightness
```

### Web & Search
```bash
"search for this"           # Web search
"look up definition"        # Dictionary search
"find similar articles"     # Related content search
"open in browser"           # Opens URL in browser
```

## 🔧 Configuration

### Environment Variables
```bash
# AI Services
GEMINI_API_KEY=your_gemini_key
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=your_endpoint

# Performance
DEBUG_MODE=true
ULTRA_LIGHTWEIGHT=false
DISABLE_CLIPBOARD_TRACKING=false
DISABLE_BEHAVIOR_TRACKING=false

# Features
ENABLE_DELO_AUTOMATION=true
ENABLE_SCREEN_OCR=true
ENABLE_VOICE_COMMANDS=true
```

### Custom Commands

Add custom commands by implementing the `DeloCommand` interface:

```typescript
class CustomCommand implements DeloCommand {
  name = 'custom';
  description = 'Custom automation command';

  match(input: string, context: DeloContext): boolean {
    return input.toLowerCase().includes('custom');
  }

  async execute(context: DeloContext, args?: any): Promise<DeloCommandResult> {
    // Your custom logic here
    return {
      success: true,
      message: 'Custom command executed',
      action: 'custom_executed'
    };
  }
}

// Register the command
deloCommandSystem.registerCommand(new CustomCommand());
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
node test-delo-system.js
```

The test suite covers:
- Basic command processing
- Clipboard context detection
- Natural language parsing
- Command execution
- Session memory
- Proactive suggestions
- Cross-app automation
- Error handling
- Performance
- Integration workflows

## 📊 Session Insights

DELO provides productivity insights:

- **Productivity Score**: Based on successful command execution
- **User Habits**: Pattern recognition for common workflows
- **Recent Tasks**: History of recent automation actions
- **Suggestions**: AI-powered recommendations for efficiency

## 🔄 Example Workflows

### Meeting Follow-up Workflow
1. Copy meeting notes to clipboard
2. Say: "summarize this and email to team"
3. DELO creates summary and opens email client
4. Review and send

### Content Translation Workflow
1. Copy foreign language text
2. Say: "translate to English"
3. DELO translates and copies to clipboard
4. Paste translated content

### Task Creation Workflow
1. Copy task list or action items
2. Say: "create tasks from this"
3. DELO parses content and creates structured tasks
4. Tasks saved to file and copied to clipboard

### Research Workflow
1. Copy research topic
2. Say: "search for this and summarize"
3. DELO opens search and creates summary
4. Results ready for use

## 🚨 Troubleshooting

### Common Issues

1. **Commands not recognized**
   - Check if LocalLLMService is initialized
   - Verify API keys are set correctly
   - Try more specific commands

2. **Clipboard not detected**
   - Ensure clipboard permissions are granted
   - Check if ClipboardManager is running
   - Restart the application

3. **Performance issues**
   - Enable ultra-lightweight mode
   - Disable unnecessary services
   - Check system resources

4. **Email composition fails**
   - Verify EmailService configuration
   - Check default email client
   - Ensure internet connection

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG_MODE=true npm run dev
```

## 🔮 Future Enhancements

- **Voice Commands**: Speech-to-text integration
- **Advanced OCR**: Better text extraction from images
- **Workflow Templates**: Pre-defined automation sequences
- **Plugin System**: Third-party command extensions
- **Cloud Sync**: Cross-device synchronization
- **Advanced AI**: More sophisticated intent recognition

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the test suite for examples

---

**DELO** - Making desktop automation as natural as conversation. 🧠✨ 