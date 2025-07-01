# DELO - Production Ready AI Desktop Assistant

DELO is a context-aware, intelligent desktop assistant that learns your habits and automates your workflow. Built with Electron, TypeScript, and Google Gemini AI.

## 🚀 Features

### Core Capabilities
- **Real Context Awareness**: Monitors clipboard, active windows, files, and screen content
- **Gemini AI Integration**: Advanced intent classification and natural language processing
- **Habit Learning**: Remembers your actions and suggests workflows
- **Non-redundancy**: Prevents duplicate actions with session memory
- **Modular Commands**: Plug-and-play command architecture

### Advanced Commands
- **File Operations**: Create, open, search files
- **App Control**: Launch, close applications
- **Web Automation**: Open URLs, search web
- **System Control**: Screenshots, volume control, system info
- **Workflow Macros**: Morning routine, coding setup

### UI Components
- **Floating Orb**: Draggable, context-aware assistant
- **Real-time Overlay**: Live context and suggestions
- **Modern Interface**: Beautiful animations and responsive design

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key
- Windows 10/11 (primary support)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AgentMarket
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

4. **Get Gemini API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

## 🏗️ Development

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build:production
```

### Create Distributable Packages
```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

## 🎯 Usage

### Basic Commands
- **"Open Chrome"** - Launches browser
- **"Take screenshot"** - Captures screen
- **"Search for files"** - Searches file system
- **"Morning routine"** - Opens email, calendar, notepad
- **"Coding setup"** - Opens GitHub, Stack Overflow, VS Code

### Advanced Features
- **Context Awareness**: DELO automatically understands what you're working on
- **Habit Learning**: Suggests actions based on your patterns
- **Workflow Automation**: Execute complex multi-step tasks

## 🏭 Production Deployment

### 1. Build Process
```bash
# Clean build
npm run build:production

# Create installer
npm run dist:win
```

### 2. Distribution Files
- Windows: `release/Doppel Setup.exe`
- macOS: `release/Doppel.dmg`
- Linux: `release/Doppel.AppImage`

### 3. Code Signing (Recommended)
- Windows: Use a valid code signing certificate
- macOS: Apple Developer certificate
- Linux: GPG signing

### 4. Auto-updates
Configure auto-updates in `electron-builder` configuration:
```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
GEMINI_API_KEY=your_api_key

# Optional
DELO_PERFORMANCE_MODE=ultra-lightweight
DELO_OCR_ENABLED=true
DELO_SCREENSHOT_INTERVAL=10000
```

### Performance Modes
- **Normal**: Full feature set
- **Ultra-lightweight**: Minimal services for low-end systems

## 🧪 Testing

### Run Tests
```bash
npm run test:performance
```

### Manual Testing Checklist
- [ ] Context services start correctly
- [ ] Gemini API responds to commands
- [ ] UI components render properly
- [ ] Commands execute successfully
- [ ] Session memory persists
- [ ] Error handling works

## 📊 Monitoring

### Logs
- Application logs: `%APPDATA%/Doppel/logs/`
- Error logs: Console output
- Performance metrics: Built-in monitoring

### Metrics to Track
- Command success rate
- API response times
- Memory usage
- User engagement

## 🔒 Security

### Best Practices
- API keys stored in environment variables
- No sensitive data in logs
- Regular dependency updates
- Code signing for distribution

### Privacy
- All processing happens locally
- No data sent to external servers (except Gemini API)
- User data stored locally only

## 🚀 Marketing Features

### What Makes DELO Special
1. **Real Context Awareness**: Unlike other assistants, DELO actually understands what you're doing
2. **Habit Learning**: Gets smarter with use
3. **Non-intrusive**: Floating orb design doesn't interrupt workflow
4. **Modular**: Easy to extend with new commands
5. **Production Ready**: Built for real-world use

### Target Audience
- Power users and developers
- Productivity enthusiasts
- Teams looking for automation
- Anyone who wants a smarter desktop experience

## 📈 Roadmap

### v1.1
- [ ] Voice commands
- [ ] Cloud sync
- [ ] Team collaboration
- [ ] Plugin marketplace

### v1.2
- [ ] Mobile companion app
- [ ] Advanced workflows
- [ ] Integration APIs
- [ ] Enterprise features

## 🤝 Support

### Documentation
- [API Reference](docs/api.md)
- [Command Reference](docs/commands.md)
- [Troubleshooting](docs/troubleshooting.md)

### Community
- GitHub Issues
- Discord Community
- Email Support

## 📄 License

MIT License - see LICENSE file for details

---

**DELO** - Your intelligent desktop companion. 🚀 