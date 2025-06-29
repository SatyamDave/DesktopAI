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
  getEmailDraftHistory: (limit?: number) => ipcRenderer.invoke('get-email-draft-history', limit),
}); 