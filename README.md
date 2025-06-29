# Doppel - AI Desktop Assistant

A smart, floating AI desktop assistant that learns your habits and automates tasks. Built with Electron, React, and TypeScript for cross-platform compatibility.

## 🌟 Features

### Core Functionality
- **Floating Interface**: A beautiful, animated orb that docks to your screen corner
- **Global Hotkey**: Access Doppel from anywhere with `Cmd/Ctrl + Shift + .`
- **Natural Language Commands**: Type commands like "Open my Zoom notes from yesterday"
- **Smart Clipboard**: Intelligent clipboard history with context-aware suggestions
- **Behavior Learning**: Tracks your usage patterns to provide personalized assistance

### Whisper Mode (Interview Helper)
- **Meeting Detection**: Automatically detects when you're in Zoom/Teams/Meet
- **Contextual Tips**: Shows relevant project info, metrics, and talking points
- **Screen-Share Safe**: Invisible to screen sharing for discreet assistance
- **Real-time Assistance**: Provides tips during interviews and meetings

### Privacy-First Design
- **Local Processing**: All AI processing happens locally on your device
- **No Cloud Dependencies**: Your data stays private and secure
- **Incognito Mode**: Toggle to stop all tracking and learning
- **Data Export**: Full control over your data with export/clear options

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/doppel.git
   cd doppel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run dist
   ```

## 📱 Usage

### Basic Commands
- **Click the orb** to open the main interface
- **Press `Cmd/Ctrl + Shift + .`** to open command input from anywhere
- **Type natural language** commands like:
  - "Open my Zoom notes from yesterday"
  - "Find the file I used in my last email"
  - "Paste the clipboard item I copied two hours ago"
  - "Search for Logan Paul's funniest vlog"
  - "Open browser and send email to manager asking for leave"

### Whisper Mode
- **Automatic Activation**: Whisper mode activates when you join a meeting
- **Manual Toggle**: Enable/disable in settings
- **Quick Tips**: Press `Ctrl+Shift+W` during meetings for instant tips
- **Custom Tips**: Add your own project info and talking points

### Settings
- **Privacy Controls**: Manage data collection and tracking
- **Hotkey Customization**: Change the global shortcut
- **Theme Options**: Light, dark, or auto themes
- **Feature Toggles**: Enable/disable specific features

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Electron + Node.js
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: SQLite (local storage)

### Project Structure
```
doppel/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── services/         # Core services
│   │   │   ├── AIProcessor.ts
│   │   │   ├── BehaviorTracker.ts
│   │   │   ├── ClipboardManager.ts
│   │   │   └── WhisperMode.ts
│   │   └── main.ts
│   └── renderer/             # React renderer process
│       ├── components/       # React components
│       │   ├── FloatingOrb.tsx
│       │   ├── CommandInput.tsx
│       │   └── Settings.tsx
│       ├── App.tsx
│       └── main.tsx
├── dist/                     # Built files
├── assets/                   # Icons and resources
└── package.json
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run dist` - Create distributable packages
- `npm run dev:main` - Build and run main process only
- `npm run dev:renderer` - Start Vite dev server for renderer

### Adding New Commands
1. Extend the `AIProcessor` class in `src/main/services/AIProcessor.ts`
2. Add command patterns to the `commandPatterns` Map
3. Implement the command logic in the `executeCommand` method
4. Update the suggestions in `CommandInput.tsx`

### Customizing the UI
- Modify `src/renderer/index.css` for global styles
- Update `tailwind.config.js` for theme customization
- Edit component files in `src/renderer/components/`

## 🎯 Roadmap

### MVP Features (Current)
- ✅ Floating orb interface
- ✅ Global hotkey launcher
- ✅ Basic command execution
- ✅ Clipboard history
- ✅ Settings interface

### Upcoming Features
- 🔄 Advanced AI command parsing
- 🔄 Plugin system for extensibility
- 🔄 Cloud sync (optional)
- 🔄 Mobile companion app
- 🔄 Team collaboration features

### Plugin Modules
- **Dev Mode**: Auto-setup coding environments
- **PM Mode**: Load dashboards and project docs
- **Student Mode**: Course material detection and summarization
- **Life Mode**: Calendar integration and health reminders

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Raycast, Humane AI Pin, and Cursor
- Built with modern web technologies
- Designed for privacy and productivity

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/doppel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/doppel/discussions)
- **Email**: support@doppel.ai

---

**Doppel** - Your memory, your flow, your second brain. 🧠✨ 