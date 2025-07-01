import { contextBridge, ipcRenderer } from 'electron';

// Simplified API for the basic orb functionality
// contextBridge.exposeInMainWorld('electronAPI', {
//   // Basic command execution
//   executeCommand: (command: string) => ipcRenderer.invoke('execute-command', command),
//   
//   // AI processing
//   processAiInput: (input: string) => ipcRenderer.invoke('process-ai-input', input),
//   
//   // Basic system info
//   getAppStatus: () => ipcRenderer.invoke('get-app-status'),
// });

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      executeCommand: (command: string) => Promise<any>;
      processAiInput: (input: string) => Promise<any>;
      toggleOrb: () => Promise<void>;
      getAppStatus: () => Promise<any>;
    };
  }
} 