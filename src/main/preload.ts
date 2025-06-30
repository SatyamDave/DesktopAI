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
}); 