# Doppel - AI Desktop Assistant

A powerful, intelligent desktop assistant that automates your daily tasks with natural language commands. Built with Electron, React, and TypeScript.

![Doppel AI Assistant](https://img.shields.io/badge/Doppel-AI%20Assistant-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-27.1.3-47848F?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?style=for-the-badge&logo=typescript)

## 🚀 Features

### Core Automation
- **App Launcher**: Open applications with natural language commands
- **Web Search**: Search Google and YouTube with voice/text commands
- **Email Drafting**: Compose emails with smart templates
- **Command History**: Track and reuse previous commands
- **Smart Suggestions**: AI-powered autocomplete for commands
- **Sequential Execution**: Run multiple commands in sequence

### User Interface
- **Floating Orb**: Beautiful, always-on-top interface with glassmorphism effects
- **Global Shortcuts**: Quick access with keyboard shortcuts
- **Command Input**: Modal interface for typing commands
- **Toast Notifications**: Real-time feedback for actions
- **Responsive Design**: Works across different screen sizes

### Advanced Features
- **Clipboard Manager**: Track and manage clipboard history
- **Behavior Tracking**: Monitor app usage patterns
- **Whisper Mode**: Voice recognition for hands-free operation
- **Database Persistence**: Local storage for all data
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 🎯 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/doppel.git
cd doppel

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. **Launch Doppel**: The floating orb will appear on your screen
2. **Open Command Input**: Press `Ctrl+Shift+.` (or `Cmd+Shift+.` on Mac)
3. **Type Commands**: Use natural language to control your computer

## 📝 Command Examples

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

#### ClipboardManager (`src/main/services/ClipboardManager.ts`)
- Tracks clipboard history automatically
- Provides search functionality
- Manages clipboard data persistence

#### BehaviorTracker (`src/main/services/BehaviorTracker.ts`)
- Monitors application usage patterns
- Tracks user behavior for context
- Provides insights for better suggestions

#### WhisperMode (`src/main/services/WhisperMode.ts`)
- Handles voice recognition (simulated)
- Manages voice-to-text conversion
- Provides voice command support

### Frontend Components

#### FloatingOrb (`src/renderer/components/FloatingOrb.tsx`)
- Main floating interface with glassmorphism effects
- Expandable command interface
- Real-time user context display
- Quick action buttons

#### CommandInput (`src/renderer/components/CommandInput.tsx`)
- Modal command input interface
- Autocomplete suggestions
- Command history display
- Toast notifications

#### FeatureTest (`src/renderer/components/FeatureTest.tsx`)
- Comprehensive test suite
- Real-time feature validation
- Performance metrics
- Error reporting

## 🎨 UI/UX Features

### Glassmorphism Design
- Beautiful blur effects and transparency
- Smooth animations with Framer Motion
- Responsive hover states
- Modern gradient backgrounds

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management

### Performance
- Lazy loading of components
- Efficient state management
- Optimized animations
- Minimal resource usage

## 🔑 Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+.` | Open command input |
| `Escape` | Hide floating window |
| `Ctrl+Shift+W` | Toggle whisper mode |
| `Ctrl+Shift+V` | Voice paste (whisper mode) |

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