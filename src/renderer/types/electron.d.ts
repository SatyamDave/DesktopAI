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
      // Window management methods
      moveWindow: (x: number, y: number) => void;
      resizeWindow: (width: number, height: number) => void;
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
      getConversationHistory: (limit?: number) => Promise<{ success: boolean; history?: any[]; error?: string }>;
      // Overlay methods
      onOverlayAria: (callback: (event: any, msg: string) => void) => void;
      offOverlayAria: (callback: (event: any, msg: string) => void) => void;
      toggleOverlay: () => Promise<void>;
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
      // DELO Command System methods
      processDeloCommand: (command: string) => Promise<{ success: boolean; message: string; action: string; data?: any; nextAction?: string; requiresConfirmation?: boolean }>;
      getDeloSuggestions: () => Promise<{ success: boolean; suggestions?: string[]; error?: string }>;
      getDeloInsights: () => Promise<{ success: boolean; insights?: any; error?: string }>;
    };
    
    // DELO AI-Powered Features
    deloAI: {
      startVoice: () => Promise<{ success: boolean; error?: string }>;
      stopVoice: () => Promise<{ success: boolean; error?: string }>;
      getVoiceState: () => Promise<{ success: boolean; state?: any; error?: string }>;
      getVoiceConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
      updateVoiceConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      getWorkflows: () => Promise<{ success: boolean; workflows?: any[]; error?: string }>;
      createWorkflow: (workflowData: any) => Promise<{ success: boolean; workflowId?: string; error?: string }>;
      executeWorkflow: (workflowId: string) => Promise<{ success: boolean; error?: string }>;
      getWorkflowSuggestions: () => Promise<{ success: boolean; suggestions?: any[]; error?: string }>;
      getUserBehavior: () => Promise<{ success: boolean; behavior?: any; error?: string }>;
      onVoiceCommand: (callback: (command: any) => void) => void;
      onVoiceListening: (callback: (isListening: boolean) => void) => void;
      onVoiceError: (callback: (error: any) => void) => void;
    };
    
    // DELO Sensory Intelligence
    deloSensory: {
      startMonitoring: () => Promise<{ success: boolean; error?: string }>;
      stopMonitoring: () => Promise<{ success: boolean; error?: string }>;
      getSensoryContext: () => Promise<{ success: boolean; context?: any; error?: string }>;
      getRecentSensoryContexts: (count: number) => Promise<{ success: boolean; contexts?: any[]; error?: string }>;
      getActiveSuggestions: () => Promise<{ success: boolean; suggestions?: any[]; error?: string }>;
      getDetectedPatterns: () => Promise<{ success: boolean; patterns?: any[]; error?: string }>;
      getSensoryState: () => Promise<{ success: boolean; state?: any; error?: string }>;
      getSensoryConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
      updateSensoryConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      onSensoryContext: (callback: (context: any) => void) => void;
      onSuggestion: (callback: (suggestion: any) => void) => void;
      onAnalysis: (callback: (analysis: any) => void) => void;
      onMeeting: (callback: (data: any) => void) => void;
      onUrgent: (callback: (data: any) => void) => void;
    };
  }
}

export {};
 