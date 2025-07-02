const { contextBridge, ipcRenderer } = require('electron');

// REMOVE: // Simplified API for the basic orb functionality

// Basic system info
contextBridge.exposeInMainWorld('electronAPI', {
  // Basic command execution
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  
  // Gemini confirmation and execution
  confirmAndExecute: (confirmation, clarification, originalCommand, clipboardContent) => 
    ipcRenderer.invoke('confirm-and-execute', confirmation, clarification, originalCommand, clipboardContent),
  
  // AI processing
  processAiInput: (input) => ipcRenderer.invoke('process-ai-input', input),
  
  // Basic system info
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),
});

// Expose Friday API to renderer process
contextBridge.exposeInMainWorld('friday', {
  // Command processing
  processCommand: (command) => 
    ipcRenderer.invoke('friday-process-command', command),
  
  // Plugin management
  getPlugins: () => 
    ipcRenderer.invoke('friday-get-plugins'),
  
  reloadPlugin: (pluginName) => 
    ipcRenderer.invoke('friday-reload-plugin', pluginName),
  
  reloadAllPlugins: () => 
    ipcRenderer.invoke('friday-reload-all-plugins'),
  
  // Stats and context
  getStats: () => 
    ipcRenderer.invoke('friday-get-stats'),
  
  getContext: () => 
    ipcRenderer.invoke('friday-get-context'),
  
  // Status
  getStatus: () => 
    ipcRenderer.invoke('friday-get-status'),
}); 