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
      // Performance monitoring methods
      getPerformanceMetrics: () => Promise<{ 
        success: boolean; 
        metrics?: any; 
        systemInfo?: any; 
        dbStats?: any; 
        clipboardStats?: any; 
        behaviorStats?: any; 
        error?: string 
      }>;
      optimizePerformance: (mode: 'low' | 'high') => Promise<{ success: boolean; mode?: string; error?: string }>;
      getPerformanceHistory: () => Promise<{ success: boolean; metrics?: any[]; error?: string }>;
      // Emergency mode methods
      getEmergencyStatus: () => Promise<{ 
        success: boolean; 
        status?: {
          isEmergencyMode: boolean;
          currentMemory: number;
          currentCpu: number;
          currentDiskIO: number;
        }; 
        error?: string 
      }>;
      forceEmergencyMode: () => Promise<{ success: boolean; error?: string }>;
      // Listen for emergency mode events
      onEmergencyMode: (callback: (isEmergency: boolean) => void) => void;
      getEmailDraftHistory: (limit?: number) => Promise<{ success: boolean; history?: any[]; error?: string }>;

      // DELOSettings Perception/Context Methods
      getScreenSnapshots: (limit?: number) => Promise<{ success: boolean; snapshots: any[] }>;
      getAudioSessions: (limit?: number) => Promise<{ success: boolean; sessions: any[] }>;
      getContextSnapshots: (limit?: number) => Promise<{ success: boolean; snapshots: any[] }>;
      startScreenPerception: () => Promise<{ success: boolean; message: string }>;
      stopScreenPerception: () => Promise<{ success: boolean; message: string }>;
      startAudioPerception: () => Promise<{ success: boolean; message: string }>;
      stopAudioPerception: () => Promise<{ success: boolean; message: string }>;
      startContextManager: () => Promise<{ success: boolean; message: string }>;
      stopContextManager: () => Promise<{ success: boolean; message: string }>;
      addScreenFilter: (filter: any) => Promise<{ success: boolean; message: string }>;
      addAudioFilter: (filter: any) => Promise<{ success: boolean; message: string }>;
      addContextPattern: (pattern: any) => Promise<{ success: boolean; message: string }>;
      setQuietHours: (startHour: number, endHour: number) => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};
 