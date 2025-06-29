declare global {
  interface Window {
    electronAPI: {
      executeCommand: (command: string) => Promise<{ success: boolean; result?: string; error?: string }>;
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
    };
  }
}

export {};
 