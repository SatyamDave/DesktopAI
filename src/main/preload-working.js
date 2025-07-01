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