import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  executeCommand: (command: string) => ipcRenderer.invoke('execute-command', command),
  processAiInput: (input: string, context?: any) => ipcRenderer.invoke('process-ai-input', input, context),
  getCommandHistory: (limit?: number) => ipcRenderer.invoke('get-command-history', limit),
  getCommandSuggestions: (input: string) => ipcRenderer.invoke('get-command-suggestions', input),
  executeCommandQueue: (commands: string[]) => ipcRenderer.invoke('execute-command-queue', commands),
  getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),
  pasteFromHistory: (index: number) => ipcRenderer.invoke('paste-from-history', index),
  getUserContext: () => ipcRenderer.invoke('get-user-context'),
  toggleWhisperMode: (enabled: boolean) => ipcRenderer.invoke('toggle-whisper-mode', enabled),
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),
  // Performance monitoring methods
  getPerformanceMetrics: () => ipcRenderer.invoke('get-performance-metrics'),
  optimizePerformance: (mode: 'low' | 'high') => ipcRenderer.invoke('optimize-performance', mode),
  getPerformanceHistory: () => ipcRenderer.invoke('get-performance-history'),
  // Emergency mode methods
  getEmergencyStatus: () => ipcRenderer.invoke('get-emergency-status'),
  forceEmergencyMode: () => ipcRenderer.invoke('force-emergency-mode'),
  // Listen for emergency mode events
  onEmergencyMode: (callback: (isEmergency: boolean) => void) => {
    ipcRenderer.on('emergency-mode', (_, isEmergency) => callback(isEmergency));
  },
  moveWindow: (x: number, y: number) => ipcRenderer.send('move-window', x, y),
  resizeWindow: (width: number, height: number) => ipcRenderer.send('resize-window', width, height),
  getEmailDraftHistory: (limit?: number) => ipcRenderer.invoke('get-email-draft-history', limit),
  
  // Real-time AI assistant methods
  processRealTimeCommand: (command: string) => ipcRenderer.invoke('process-real-time-command', command),
  getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
  toggleVoiceListening: (enabled: boolean) => ipcRenderer.invoke('toggle-voice-listening', enabled),
  getVoiceStatus: () => ipcRenderer.invoke('get-voice-status'),
  
  // Local LLM management
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  setActiveModel: (modelName: string) => ipcRenderer.invoke('set-active-model', modelName),
  testModel: (modelName: string) => ipcRenderer.invoke('test-model', modelName),
  
  // System control methods
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  takeScreenshot: (region?: any) => ipcRenderer.invoke('take-screenshot', region),
  extractTextFromScreenshot: (capture?: any) => ipcRenderer.invoke('extract-text-from-screenshot', capture),
  
  // Action handler management
  getActionHandlers: () => ipcRenderer.invoke('get-action-handlers'),
  clearCommandQueue: () => ipcRenderer.invoke('clear-command-queue'),
  
  // DELO Command System methods
  processDeloCommand: (command: string) => ipcRenderer.invoke('process-delo-command', command),
  getDeloSuggestions: () => ipcRenderer.invoke('get-delo-suggestions'),
  getDeloInsights: () => ipcRenderer.invoke('get-delo-insights'),
  getScreenSnapshots: (limit?: number) => ipcRenderer.invoke('get-screen-snapshots', limit),
  getAudioSessions: (limit?: number) => ipcRenderer.invoke('get-audio-sessions', limit),
  getContextSnapshots: (limit?: number) => ipcRenderer.invoke('get-context-snapshots', limit),
  startScreenPerception: () => ipcRenderer.invoke('start-screen-perception'),
  stopScreenPerception: () => ipcRenderer.invoke('stop-screen-perception'),
  startAudioPerception: () => ipcRenderer.invoke('start-audio-perception'),
  stopAudioPerception: () => ipcRenderer.invoke('stop-audio-perception'),
  startContextManager: () => ipcRenderer.invoke('start-context-manager'),
  stopContextManager: () => ipcRenderer.invoke('stop-context-manager'),
  addScreenFilter: (filter: any) => ipcRenderer.invoke('add-screen-filter', filter),
  addAudioFilter: (filter: any) => ipcRenderer.invoke('add-audio-filter', filter),
  addContextPattern: (pattern: any) => ipcRenderer.invoke('add-context-pattern', pattern),
  setQuietHours: (startHour: number, endHour: number) => ipcRenderer.invoke('set-quiet-hours', startHour, endHour),
});

// DELO AI-Powered Features
contextBridge.exposeInMainWorld('deloAI', {
  // Voice Control
  startVoice: () => ipcRenderer.invoke('delo-start-voice'),
  stopVoice: () => ipcRenderer.invoke('delo-stop-voice'),
  getVoiceState: () => ipcRenderer.invoke('delo-get-voice-state'),
  getVoiceConfig: () => ipcRenderer.invoke('delo-get-voice-config'),
  updateVoiceConfig: (config: any) => ipcRenderer.invoke('delo-update-voice-config', config),
  
  // Workflow Management
  getWorkflows: () => ipcRenderer.invoke('delo-get-workflows'),
  createWorkflow: (workflowData: any) => ipcRenderer.invoke('delo-create-workflow', workflowData),
  executeWorkflow: (workflowId: string) => ipcRenderer.invoke('delo-execute-workflow', workflowId),
  
  // Pattern Detection & Suggestions
  getWorkflowSuggestions: () => ipcRenderer.invoke('delo-get-workflow-suggestions'),
  getUserBehavior: () => ipcRenderer.invoke('delo-get-user-behavior'),
  
  // Voice Events
  onVoiceCommand: (callback: (command: any) => void) => {
    ipcRenderer.on('voice-command', (event, command) => callback(command));
  },
  onVoiceListening: (callback: (isListening: boolean) => void) => {
    ipcRenderer.on('voice-listening', (event, isListening) => callback(isListening));
  },
  onVoiceError: (callback: (error: any) => void) => {
    ipcRenderer.on('voice-error', (event, error) => callback(error));
  }
});

// DELO Sensory Intelligence
contextBridge.exposeInMainWorld('deloSensory', {
  // Sensory Monitoring
  startMonitoring: () => ipcRenderer.invoke('delo-start-sensory-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('delo-stop-sensory-monitoring'),
  getSensoryContext: () => ipcRenderer.invoke('delo-get-sensory-context'),
  getRecentSensoryContexts: (count: number) => ipcRenderer.invoke('delo-get-recent-sensory-contexts', count),
  
  // Intelligent Suggestions
  getActiveSuggestions: () => ipcRenderer.invoke('delo-get-active-suggestions'),
  getDetectedPatterns: () => ipcRenderer.invoke('delo-get-detected-patterns'),
  
  // Configuration
  getSensoryState: () => ipcRenderer.invoke('delo-get-sensory-state'),
  getSensoryConfig: () => ipcRenderer.invoke('delo-get-sensory-config'),
  updateSensoryConfig: (config: any) => ipcRenderer.invoke('delo-update-sensory-config', config),
  
  // Sensory Events
  onSensoryContext: (callback: (context: any) => void) => {
    ipcRenderer.on('sensory-context', (event, context) => callback(context));
  },
  onSuggestion: (callback: (suggestion: any) => void) => {
    ipcRenderer.on('suggestion', (event, suggestion) => callback(suggestion));
  },
  onAnalysis: (callback: (analysis: any) => void) => {
    ipcRenderer.on('analysis', (event, analysis) => callback(analysis));
  },
  onMeeting: (callback: (data: any) => void) => {
    ipcRenderer.on('meeting', (event, data) => callback(data));
  },
  onUrgent: (callback: (data: any) => void) => {
    ipcRenderer.on('urgent', (event, data) => callback(data));
  }
}); 