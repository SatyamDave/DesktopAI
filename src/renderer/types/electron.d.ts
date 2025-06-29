declare global {
  interface Window {
    electronAPI: {
      executeCommand: (command: string) => Promise<{ success: boolean; result?: string; error?: string; data?: any }>;
      processAiInput: (input: string, context?: any) => Promise<{ success: boolean; result?: string; error?: string }>;
      getCommandHistory: (limit?: number) => Promise<{ success: boolean; history?: any[]; error?: string }>;
      getCommandSuggestions: (input: string) => Promise<{ success: boolean; suggestions?: string[]; error?: string }>;
      executeCommandQueue: (commands: string[]) => Promise<{ success: boolean; results?: any[]; error?: string }>;
      getClipboardHistory: () => Promise<any[]>;
      pasteFromHistory: (index: number) => Promise<boolean>;
      getUserContext: () => Promise<{
        currentApp: string;
        timeOfDay: string;
        dayOfWeek: string;
        recentApps: string[];
        isInMeeting: boolean;
      }>;
      toggleWhisperMode: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getAppStatus: () => Promise<{ success: boolean; status?: any; error?: string }>;
    };
  }
}

export {};
 