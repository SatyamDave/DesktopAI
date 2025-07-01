# Doppel - High-Efficiency Real-Time AI Desktop Assistant

A powerful, intelligent desktop assistant that runs locally with minimal latency and provides real-time system control capabilities. Built with Electron, React, TypeScript, and local AI models.

![Doppel AI Assistant](https://img.shields.io/badge/Doppel-AI%20Assistant-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-27.1.3-47848F?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=for-the-badge&logo=typescript)
![Local AI](https://img.shields.io/badge/Local%20AI-Ollama%20%7C%20Transformers-green?style=for-the-badge)

## 🚀 Features

### 🤖 Real-Time AI Processing
- **Local LLM Support**: Ollama (Phi, Mistral, Llama2) + Transformers.js
- **Intent Recognition**: Natural language command interpretation
- **Action Routing**: Automatic command-to-action mapping
- **Confidence Scoring**: AI confidence levels for execution
- **Response Caching**: Intelligent caching for faster execution

### 🖥️ System Control & Automation
- **Real-time System Monitoring**: CPU, memory, disk, processes
- **Window Management**: Active window detection and control
- **Input Automation**: Mouse, keyboard, clipboard control
- **Application Launching**: Smart app detection across platforms
- **Screenshot & OCR**: Screen capture with text extraction

### ⚡ High-Performance Interface
- **GPU-Accelerated Overlay**: Smooth animations and effects
- **Minimal Latency**: Optimized for real-time interaction
- **Global Hotkeys**: Ctrl+K (focus), Ctrl+L (voice), Esc (close)
- **Voice Commands**: Integrated voice recognition
- **Auto Mode**: Execute commands without confirmation

### 🎯 Core Automation
- **App Launcher**: Open applications with natural language commands
- **Web Search**: Search Google and YouTube with voice/text commands
- **Email Drafting**: Compose emails with smart templates
- **Command History**: Track and reuse previous commands
- **Smart Suggestions**: AI-powered autocomplete for commands
- **Sequential Execution**: Run multiple commands in sequence

### 🎨 User Interface
- **Floating Orb**: Beautiful, always-on-top interface with glassmorphism effects
- **Real-Time Overlay**: High-performance command interface
- **System Status Display**: Real-time performance metrics
- **Settings Panel**: Easy configuration and customization
- **Responsive Design**: Works across different screen sizes

### 🔧 Advanced Features
- **Clipboard Manager**: Track and manage clipboard history
- **Behavior Tracking**: Monitor app usage patterns
- **Whisper Mode**: Voice recognition for hands-free operation
- **Database Persistence**: Local storage for all data
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Plugin System**: Extensible action handlers
- **Performance Optimization**: Multi-threading and caching

## 🎯 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/doppel.git
cd doppel

# Install dependencies
npm install

# Install Ollama (optional, for local LLM)
npm run install:ollama

# Pull AI models
npm run pull:models

# Start development server
npm run dev
```

### Running as Desktop Application

The application is designed to run as a desktop application using Electron. Here are the different ways to run it:

#### Development Mode (Desktop)
```bash
# Run both renderer and main process for desktop development
npm run dev
```

#### Ultra-Lightweight Mode (Low Performance)
```bash
# Run with minimal services for older hardware
npm run start:laptop-safe
```

#### Emergency Mode (Very Low Performance)
```bash
# Run with emergency optimizations
npm run start:emergency
```

#### Production Mode (Desktop)
```bash
# Build the application first
npm run build

# Run the desktop application
npx electron .

# Or use the provided batch file (Windows)
run-desktop.bat
```

### Testing the Real-Time AI Assistant

```bash
# Run the test suite
node test-realtime-ai.js

# Start Ollama server (optional)
npm run start:ollama

# In another terminal, pull models
ollama pull phi
ollama pull mistral
ollama pull llama2
```

### Usage

1. **Launch Doppel**: The floating orb will appear on your screen
2. **Open Real-Time Overlay**: Press `Ctrl+K` or click the orb
3. **Type Commands**: Use natural language to control your computer
4. **Voice Commands**: Press `Ctrl+L` to toggle voice listening
5. **Auto Mode**: Enable in settings for instant execution

## 📝 Command Examples

### Real-Time System Control
```bash
"Open Chrome"           # Launches Google Chrome
"Take a screenshot"     # Captures screen with OCR
"Search for AI news"    # Opens web search
"Write an email"        # Opens email composition
"Copy to clipboard"     # Manages clipboard
"Lock my computer"      # System control
"Move mouse to center"  # Mouse automation
"Type hello world"      # Keyboard automation
```

### App Launching
```bash
"Open Chrome"           # Launches Google Chrome
"Launch Notepad"        # Opens Windows Notepad
"Start Calculator"      # Opens system calculator
"Open Figma"           # Opens Figma in browser
"Launch Zoom"          # Opens Zoom application
```

### Web Search
```bash
"Search React tutorial"           # Google search for React tutorials
"Find TypeScript documentation"   # Search for TypeScript docs
"YouTube Logan Paul"              # Search YouTube for Logan Paul
"Video React tutorial"            # Search YouTube for React videos
```

### Email Drafting
```bash
"Send email to manager asking for time off"
"Email team about meeting tomorrow"
"Mail client requesting vacation"
```

### Sequential Commands
```bash
"Open Zoom and then Notion"       # Opens both apps in sequence
"Search React and then YouTube"   # Performs both searches
```

## 🔧 Technical Architecture

### Core Services

#### LocalLLMService (`src/main/services/LocalLLMService.ts`)
- Local AI processing with Ollama and Transformers.js
- Multiple model support (Phi, Mistral, Llama2)
- Intelligent response caching
- Confidence scoring and intent detection

#### SystemControlService (`src/main/services/SystemControlService.ts`)
- Real-time system monitoring and control
- Window management and input automation
- Screenshot capture with OCR
- Process management and application launching

#### RealTimeCommandProcessor (`src/main/services/RealTimeCommandProcessor.ts`)
- Orchestrates all services for command execution
- Command queue management
- Modular action handler system
- Context gathering and error handling

#### RealTimeOverlay (`src/renderer/components/RealTimeOverlay.tsx`)
- High-performance overlay interface
- GPU-accelerated animations
- Real-time status display
- Voice control integration

#### CommandExecutor (`src/main/services/CommandExecutor.ts`)
- Handles all command execution with error handling
- Manages app configurations for different platforms
- Provides command history and suggestions
- Supports sequential command execution

#### AIProcessor (`src/main/services/AIProcessor.ts`)
- Processes natural language input
- Detects user intent from commands
- Integrates with CommandExecutor for execution
- Maintains conversation history

### Frontend Components

#### FloatingOrb (`src/renderer/components/FloatingOrb.tsx`)
- Main floating interface with glassmorphism effects
- Expandable command interface
- Real-time user context display
- Quick action buttons

#### RealTimeOverlay (`src/renderer/components/RealTimeOverlay.tsx`)
- High-performance command interface
- GPU-accelerated background effects
- Voice control integration
- System status monitoring

## 🎨 UI/UX Features

### Glassmorphism Design
- Beautiful blur effects and transparency
- Smooth animations with Framer Motion
- Responsive hover states
- Modern gradient backgrounds

### Real-Time Performance
- GPU-accelerated canvas animations
- Minimal latency command processing
- Efficient state management
- Optimized rendering pipeline

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management

## 🔑 Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open real-time overlay |
| `Ctrl+L` | Toggle voice listening |
| `Ctrl+↑/↓` | Navigate command history |
| `Escape` | Close overlay |
| `Ctrl+Shift+.` | Open command input (legacy) |
| `Ctrl+Shift+W` | Toggle whisper mode |

## 🗄️ Data Storage

### Database Files
- `ai.sqlite`: AI conversations and commands
- `clipboard.sqlite`: Clipboard history
- `whisper.sqlite`: Voice recognition sessions
- `command-history.json`: Command execution history

### Data Location
```
Windows: C:\Users\{username}\.doppel\
macOS: /Users/{username}/.doppel/
Linux: /home/{username}/.doppel/
```

## 🧪 Testing

### Automated Tests
```bash
# Run the comprehensive test suite
node test-features.js

# Start the app and use the Test Features button
npm run dev
```

### Test Coverage
- ✅ App status and service health
- ✅ Command execution and error handling
- ✅ App launching functionality
- ✅ Web search integration
- ✅ Email drafting features
- ✅ Command history and suggestions
- ✅ Clipboard management
- ✅ AI processing capabilities
- ✅ Behavior tracking
- ✅ Whisper mode functionality
- ✅ Global shortcuts
- ✅ Database operations
- ✅ Sequential command execution

## 🚀 Development

### Project Structure
```
doppel/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main app entry point
│   │   └── services/        # Core services
│   └── renderer/            # React frontend
│       ├── App.tsx          # Main app component
│       └── components/      # UI components
├── assets/                  # Static assets
├── dist/                    # Build output
└── package.json            # Dependencies and scripts
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run dist         # Create distributable
npm run type-check   # TypeScript type checking
```

### Environment Setup
- Node.js 18+ required
- npm or yarn package manager
- Git for version control

## 🔒 Security

### Data Privacy
- All data stored locally on your machine
- No cloud synchronization
- No data collection or telemetry
- Open source for transparency

### Permissions
- File system access for database storage
- Clipboard access for history tracking
- Global shortcuts for quick access
- Network access for web searches

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add comments for complex logic
- Test all new features thoroughly

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- Database by [SQL.js](https://sql.js.org/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/doppel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/doppel/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/doppel/wiki)

---

**Doppel** - Your intelligent desktop companion. 🚀 