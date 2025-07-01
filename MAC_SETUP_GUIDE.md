# 🍎 Mac Setup Guide for Doppel Desktop Assistant

This guide will help you set up and run Doppel Desktop Assistant on macOS for development and testing.

## 📋 Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Mac Permissions
You may need to grant permissions for:
- **Accessibility** (for global shortcuts)
- **Notifications** (for app notifications)
- **File System Access** (for saving data)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/SatyamDave/DesktopAI.git
cd DesktopAI

# Install dependencies
npm install
```

### 2. Configure Environment
```bash
# Create .env file with your API keys
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Choose Your Startup Mode

#### 🎯 **Full Development Mode** (Recommended)
```bash
npm run start:mac
```
- All features enabled
- Full debugging
- Best for development

#### ⚡ **Ultra Lightweight Mode** (For older Macs)
```bash
npm run start:mac:ultra
```
- Minimal features
- Maximum performance
- Email functionality only

#### 💻 **Laptop-Safe Mode** (Conservative)
```bash
npm run start:mac:laptop
```
- Balanced performance
- Moderate feature set

#### 🔧 **Simple Mode** (For testing)
```bash
npm run start:mac:simple
```
- Bypasses TypeScript compilation
- Quick testing
- Basic functionality

## 📱 Mac-Specific Features

### Global Shortcuts
- **Cmd+Space** - Toggle floating window
- **Cmd+Shift+W** - Toggle Whisper mode
- **Cmd+,** - Open settings
- **Cmd+Q** - Quit app

### System Integration
- **Native Notifications** - Uses macOS notification system
- **Tray Icon** - Menu bar integration (optional)
- **Global Hotkeys** - System-wide shortcuts

## 📧 Email Functionality

### Setup
1. Get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Testing
```bash
# Test email service
node test-email-service.js

# Test in app
# Type: "compose email to test@example.com about meeting"
```

## 🔧 Troubleshooting

### Permission Issues
If you get permission errors:

1. **System Preferences > Security & Privacy > Privacy**
   - Add Terminal/VS Code to **Accessibility**
   - Add Terminal/VS Code to **Input Monitoring**

2. **System Preferences > Security & Privacy > Privacy > Notifications**
   - Enable notifications for Terminal/VS Code

### Build Errors
If TypeScript compilation fails:

1. **Use Simple Mode**: `npm run start:mac:simple`
2. **Check Dependencies**: `npm install`
3. **Clear Cache**: `rm -rf node_modules && npm install`

### Performance Issues
If the app is slow:

1. **Use Ultra Lightweight Mode**: `npm run start:mac:ultra`
2. **Disable Features**: Set environment variables in `.env`:
   ```bash
   DISABLE_CLIPBOARD_TRACKING=true
   DISABLE_BEHAVIOR_TRACKING=true
   DISABLE_WHISPER_MODE=true
   DISABLE_PERFORMANCE_MONITORING=true
   DISABLE_DATABASE=true
   ```

### Global Shortcuts Not Working
1. Grant **Accessibility** permissions to Terminal/VS Code
2. Restart the app
3. Try the shortcuts again

## 🧪 Testing

### Run Setup Test
```bash
node test-mac-setup.js
```

### Test Email Service
```bash
node test-email-service.js
```

### Test Performance
```bash
node test-performance.js
```

## 📁 File Structure

```
DesktopAI/
├── src/
│   ├── main/           # Electron main process
│   │   ├── services/   # Backend services
│   │   └── main.ts     # Main entry point
│   └── renderer/       # React frontend
├── start-mac-*.sh      # Mac startup scripts
├── test-*.js          # Test scripts
└── .env               # Environment configuration
```

## 🎯 Development Workflow

1. **Start Development**: `npm run start:mac`
2. **Make Changes**: Edit files in `src/`
3. **Test Features**: Use the floating window
4. **Debug**: Check console output
5. **Restart**: Use Cmd+Q and restart

## 🔍 Debugging

### Enable Debug Mode
```bash
export DEBUG_MODE=true
export LOG_LEVEL=debug
```

### View Logs
- Check Terminal output
- Check Console.app for system logs
- Check `~/.doppel/` for app logs

### Common Issues

#### App Won't Start
```bash
# Check Node.js version
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Global Shortcuts Not Working
```bash
# Check permissions
ls -la /System/Library/PreferencePanes/Security.prefPane

# Grant accessibility permissions manually
```

#### Email Not Working
```bash
# Test API key
node test-email-service.js

# Check .env file
cat .env | grep GEMINI_API_KEY
```

## 🚀 Production Build

### Build for Mac
```bash
npm run build
npm run dist
```

### Install Dependencies
```bash
npm run postinstall
```

## 📞 Support

If you encounter issues:

1. **Check the logs** in Terminal
2. **Run setup test**: `node test-mac-setup.js`
3. **Try different modes**: Start with `simple` mode
4. **Check permissions**: System Preferences > Security & Privacy

## 🎉 Success!

Once everything is working:

- ✅ Floating window appears with Cmd+Space
- ✅ Email composition works with Gemini AI
- ✅ Global shortcuts function properly
- ✅ App integrates with macOS

Happy coding! 🚀 