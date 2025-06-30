# DELO - Advanced AI Orb Perception Layer

## Overview

DELO (Desktop Environment Learning and Observation) is an advanced AI Orb that implements a comprehensive perception layer for seamless desktop copilot functionality. It continuously observes and understands the user's screen and audio environment in real-time, providing intelligent context-aware assistance.

## 🧩 Core Features

### 1. Screen Perception (`ScreenPerception.ts`)
- **Cross-platform screen content reading** using Accessibility APIs
- **OCR fallback** with Tesseract/Apple Vision/Windows GDI support
- **Smart diff-based updates** to minimize resource usage
- **App filtering system** with whitelist/blacklist capabilities
- **Content hash tracking** for change detection

**Key Methods:**
```typescript
// Start/stop screen monitoring
await screenPerception.start();
await screenPerception.stop();

// Get recent snapshots
const snapshots = await screenPerception.getRecentSnapshots(20);

// Add app filters
await screenPerception.addAppFilter({
  app_name: 'Chrome',
  is_whitelisted: true,
  is_blacklisted: false,
  window_patterns: ['Gmail', 'Google Docs']
});
```

### 2. Audio Perception (`AudioPerception.ts`)
- **Continuous audio monitoring** of system audio and microphone
- **Whisper integration** for real-time speech transcription
- **Smart silence detection** and session management
- **Audio source filtering** with volume thresholds
- **Transcript search** and history management

**Key Methods:**
```typescript
// Start/stop audio monitoring
await audioPerception.start();
await audioPerception.stop();

// Get audio sessions
const sessions = await audioPerception.getRecentSessions(20);

// Search transcripts
const results = await audioPerception.searchTranscripts('meeting notes');

// Add audio filters
await audioPerception.addAudioFilter({
  source_name: 'Spotify',
  is_blacklisted: true,
  volume_threshold: 0.1,
  keywords: ['music', 'song']
});
```

### 3. Context Manager (`ContextManager.ts`)
- **Intelligent context analysis** combining screen and audio data
- **User intent detection** using AI models
- **Pattern-based automation** triggers
- **Quiet hours** and privacy controls
- **Context snapshots** with vector embeddings

**Key Methods:**
```typescript
// Start/stop context management
await contextManager.start();
await contextManager.stop();

// Get context snapshots
const snapshots = await contextManager.getRecentContext(20);

// Add context patterns
await contextManager.addContextPattern({
  pattern_name: 'Coding Session',
  app_name: 'VSCode',
  window_pattern: '.js',
  audio_keywords: ['debug', 'error'],
  screen_keywords: ['function', 'class'],
  trigger_actions: ['suggest_fix', 'open_documentation']
});

// Set quiet hours
contextManager.setQuietHours(22, 6); // 10 PM to 6 AM
```

## 🚀 Getting Started

### 1. Environment Configuration

Update your `.env` file with DELO-specific settings:

```bash
# DELO Perception Layer Configuration
DISABLE_SCREEN_PERCEPTION=false
DISABLE_AUDIO_PERCEPTION=false
DISABLE_CONTEXT_MANAGER=false

# Performance Configuration
PERFORMANCE_MONITORING_INTERVAL=60000
ULTRA_LIGHTWEIGHT=false
```

### 2. Starting DELO Services

The DELO perception layer is automatically initialized when the app starts. Services are loaded on-demand for optimal performance:

```typescript
// Services are automatically initialized when needed
// You can manually start them if desired:

// Start all perception services
await contextManager.start(); // This starts screen and audio perception too

// Or start individually
await screenPerception.start();
await audioPerception.start();
```

### 3. User Interface

#### Floating Orb Indicators
The DELO orb provides visual feedback about perception layer status:

- **Green orb**: Perception layer active
- **Orange orb**: Whisper mode active
- **Blue orb**: Default state
- **Pulsing animation**: Active perception
- **Status dots**: Individual service indicators

#### Context Menu
Right-click the orb to access:
- DELO Settings panel
- Service status indicators
- Quick controls

#### Settings Panel
Access comprehensive DELO configuration through the settings panel:
- **Overview**: Service status and recent activity
- **Screen Perception**: App filters and monitoring controls
- **Audio Perception**: Audio filters and transcription settings
- **Context Manager**: Pattern management and quiet hours
- **Patterns & Filters**: Advanced automation rules

## 🎯 Advanced Features

### 1. Smart Filtering

#### App Filtering
```typescript
// Blacklist sensitive applications
await screenPerception.addAppFilter({
  app_name: 'Chrome',
  is_blacklisted: true,
  window_patterns: ['incognito', 'private']
});

// Whitelist specific applications
await screenPerception.addAppFilter({
  app_name: 'VSCode',
  is_whitelisted: true,
  window_patterns: ['.js', '.ts', '.py']
});
```

#### Audio Filtering
```typescript
// Filter out music applications
await audioPerception.addAudioFilter({
  source_name: 'Spotify',
  is_blacklisted: true,
  volume_threshold: 0.1,
  keywords: ['music', 'song', 'playlist']
});

// Monitor specific audio sources
await audioPerception.addAudioFilter({
  source_name: 'Zoom',
  is_whitelisted: true,
  volume_threshold: 0.3,
  keywords: ['meeting', 'call', 'presentation']
});
```

### 2. Context Patterns

Define intelligent automation patterns:

```typescript
// Email composition pattern
await contextManager.addContextPattern({
  pattern_name: 'Email Composition',
  app_name: 'Gmail',
  window_pattern: 'compose',
  audio_keywords: ['email', 'send', 'draft'],
  screen_keywords: ['subject', 'recipient', 'message'],
  trigger_actions: ['suggest_subject', 'check_grammar', 'find_attachments']
});

// Coding session pattern
await contextManager.addContextPattern({
  pattern_name: 'Coding Session',
  app_name: 'VSCode',
  window_pattern: '.js',
  audio_keywords: ['debug', 'error', 'function'],
  screen_keywords: ['console.log', 'function', 'class'],
  trigger_actions: ['suggest_fix', 'open_documentation', 'run_tests']
});
```

### 3. Privacy Controls

#### Quiet Hours
```typescript
// Set quiet hours (10 PM to 6 AM)
contextManager.setQuietHours(22, 6);

// During quiet hours, perception is paused
// Users can still manually activate services
```

#### Emergency Stop
```typescript
// Stop all perception immediately
await screenPerception.stop();
await audioPerception.stop();
await contextManager.stop();

// Or use the emergency shutdown
await emergencyShutdown();
```

## 🔧 Technical Architecture

### Service Dependencies
```
ContextManager
├── ScreenPerception
├── AudioPerception
├── AIProcessor
└── DatabaseManager
```

### Database Schema

#### Screen Snapshots
```sql
CREATE TABLE screen_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  app_name TEXT NOT NULL,
  window_title TEXT NOT NULL,
  content_text TEXT,
  content_hash TEXT NOT NULL,
  ocr_confidence REAL DEFAULT 0.0,
  accessibility_available INTEGER DEFAULT 0,
  metadata TEXT
);
```

#### Audio Sessions
```sql
CREATE TABLE audio_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration INTEGER,
  transcript TEXT,
  confidence REAL DEFAULT 0.0,
  audio_source TEXT NOT NULL,
  is_system_audio INTEGER DEFAULT 0,
  is_microphone INTEGER DEFAULT 0,
  metadata TEXT
);
```

#### Context Snapshots
```sql
CREATE TABLE context_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  screen_snapshot_id INTEGER,
  audio_session_id INTEGER,
  app_name TEXT NOT NULL,
  window_title TEXT NOT NULL,
  screen_content TEXT,
  audio_transcript TEXT,
  user_intent TEXT,
  confidence REAL DEFAULT 0.0,
  metadata TEXT
);
```

### Performance Optimization

#### Throttling
- **Screen perception**: 30-120 second intervals
- **Audio perception**: 1-5 second intervals
- **Context analysis**: 15-60 second intervals

#### Resource Management
- **Lazy initialization**: Services start on-demand
- **Memory optimization**: Automatic cleanup of old data
- **CPU throttling**: Adaptive intervals based on system load

#### Emergency Mode
- **Automatic activation** when system resources are low
- **Service suspension** to prevent system overload
- **Gradual restart** when conditions improve

## 🎨 User Experience

### Visual Feedback
- **Orb color changes** based on active services
- **Pulsing animation** during active perception
- **Status indicators** for individual services
- **Context menu** for quick access to controls

### Privacy Transparency
- **Clear indicators** when services are active
- **Easy controls** to stop/start services
- **Quiet hours** for automatic privacy
- **Emergency stop** for immediate privacy

### Onboarding
- **Simple toggles** for service activation
- **Filter configuration** for privacy control
- **Pattern creation** for automation
- **Performance monitoring** for optimization

## 🔒 Privacy & Security

### Data Storage
- **Local storage only**: All data stays on your device
- **Encrypted databases**: Sensitive data is encrypted
- **Automatic cleanup**: Old data is automatically removed
- **User control**: Full control over data retention

### Privacy Controls
- **App filtering**: Choose which apps to monitor
- **Audio filtering**: Control audio source monitoring
- **Quiet hours**: Automatic privacy during specified times
- **Emergency stop**: Immediate privacy activation

### Transparency
- **Clear indicators**: Always know when services are active
- **Data access**: View and export your data
- **Service control**: Start/stop services at any time
- **Configuration**: Full control over all settings

## 🚀 Future Enhancements

### Planned Features
- **Vector embeddings** for semantic search
- **Advanced AI models** for better intent detection
- **Cross-device sync** for multi-device context
- **API integration** for third-party services
- **Advanced automation** with custom workflows

### Performance Improvements
- **GPU acceleration** for OCR and AI processing
- **Streaming processing** for real-time analysis
- **Distributed processing** for heavy workloads
- **Caching optimization** for faster responses

## 📚 API Reference

### IPC Methods

#### Screen Perception
```typescript
// Start/stop screen perception
ipcMain.handle('start-screen-perception', async () => {});
ipcMain.handle('stop-screen-perception', async () => {});

// Get snapshots and add filters
ipcMain.handle('get-screen-snapshots', async (event, limit) => {});
ipcMain.handle('add-screen-filter', async (event, filter) => {});
```

#### Audio Perception
```typescript
// Start/stop audio perception
ipcMain.handle('start-audio-perception', async () => {});
ipcMain.handle('stop-audio-perception', async () => {});

// Get sessions and search transcripts
ipcMain.handle('get-audio-sessions', async (event, limit) => {});
ipcMain.handle('search-audio-transcripts', async (event, query) => {});
```

#### Context Manager
```typescript
// Start/stop context manager
ipcMain.handle('start-context-manager', async () => {});
ipcMain.handle('stop-context-manager', async () => {});

// Get snapshots and add patterns
ipcMain.handle('get-context-snapshots', async (event, limit) => {});
ipcMain.handle('add-context-pattern', async (event, pattern) => {});
```

## 🐛 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check environment variables
echo $DISABLE_SCREEN_PERCEPTION
echo $DISABLE_AUDIO_PERCEPTION
echo $DISABLE_CONTEXT_MANAGER

# Check logs for errors
tail -f ~/.doppel/logs/app.log
```

#### Performance Issues
```bash
# Enable ultra-lightweight mode
export ULTRA_LIGHTWEIGHT=true

# Disable specific services
export DISABLE_SCREEN_PERCEPTION=true
export DISABLE_AUDIO_PERCEPTION=true
```

#### Privacy Concerns
```typescript
// Stop all services immediately
await contextManager.stop();

// Set quiet hours
contextManager.setQuietHours(0, 24); // Always quiet

// Clear all data
await databaseManager.clearAllData();
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG_MODE=true

# Check service status
curl http://localhost:3000/api/status
```

## 📄 License

This implementation is part of the Doppel AI Assistant project and is licensed under the MIT License.

## 🤝 Contributing

Contributions to the DELO perception layer are welcome! Please see the main project README for contribution guidelines.

---

**DELO** - Your intelligent desktop copilot that sees, hears, and understands your digital environment. 