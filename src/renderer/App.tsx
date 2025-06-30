import React, { useState, useEffect } from 'react';
import FloatingOrb from './components/FloatingOrb';
import ChatBar from './components/ChatBar';
import RealTimeOverlay from './components/RealTimeOverlay';
import { AnimatePresence } from 'framer-motion';
import './index.css';

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
      onEmergencyMode: (callback: (isEmergency: boolean) => void) => void;
      getEmailDraftHistory: (limit?: number) => Promise<{ success: boolean; history?: any[]; error?: string }>;
      moveWindow: (x: number, y: number) => void;
      resizeWindow: (width: number, height: number) => void;
      // Real-time AI assistant methods
      processRealTimeCommand: (command: string) => Promise<{
        success: boolean;
        intent: string;
        confidence: number;
        action: string;
        response: string;
        latency: number;
      }>;
      getSystemStatus: () => Promise<{
        cpu: number;
        memory: number;
        activeModel: string;
        queueLength: number;
      }>;
      toggleVoiceListening: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getVoiceStatus: () => Promise<{ isListening: boolean; error?: string }>;
      // DELO-specific methods
      startScreenPerception: () => Promise<{ success: boolean; message: string }>;
      stopScreenPerception: () => Promise<{ success: boolean; message: string }>;
      getScreenSnapshots: (limit?: number) => Promise<{ success: boolean; snapshots: any[] }>;
      addScreenFilter: (filter: any) => Promise<{ success: boolean; message: string }>;
      startAudioPerception: () => Promise<{ success: boolean; message: string }>;
      stopAudioPerception: () => Promise<{ success: boolean; message: string }>;
      getAudioSessions: (limit?: number) => Promise<{ success: boolean; sessions: any[] }>;
      searchAudioTranscripts: (query: string) => Promise<{ success: boolean; results: any[] }>;
      addAudioFilter: (filter: any) => Promise<{ success: boolean; message: string }>;
      startContextManager: () => Promise<{ success: boolean; message: string }>;
      stopContextManager: () => Promise<{ success: boolean; message: string }>;
      getContextSnapshots: (limit?: number) => Promise<{ success: boolean; snapshots: any[] }>;
      addContextPattern: (pattern: any) => Promise<{ success: boolean; message: string }>;
      setQuietHours: (startHour: number, endHour: number) => Promise<{ success: boolean; message: string }>;
    };
  }
}

console.log('🚀 Renderer App.tsx loading...');

function App() {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isUltraLightweight, setIsUltraLightweight] = useState(false);
  const [showChatBar, setShowChatBar] = useState(false);
  const [showRealTimeOverlay, setShowRealTimeOverlay] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  useEffect(() => {
    if (showChatBar) {
      window.electronAPI?.resizeWindow?.(420, 120);
    } else if (showRealTimeOverlay) {
      window.electronAPI?.resizeWindow?.(800, 600);
    } else {
      window.electronAPI?.resizeWindow?.(100, 100);
    }
  }, [showChatBar, showRealTimeOverlay]);

  useEffect(() => {
    console.log('✅ App component mounted');
    
    // Check for ultra-lightweight mode
    const checkUltraLightweight = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isUltra = urlParams.get('ultra-lightweight') === 'true' || 
                     import.meta.env.VITE_ULTRA_LIGHTWEIGHT === 'true';
      setIsUltraLightweight(isUltra);
      
      if (isUltra) {
        console.log('⚡ ULTRA-LIGHTWEIGHT MODE: Using minimal UI');
      }
    };
    
    checkUltraLightweight();
    
    // Set up event listeners
    if (window.electronAPI) {
      // Listen for emergency mode
      window.electronAPI.onEmergencyMode?.((isEmergency: boolean) => {
        console.log(`🚨 Emergency mode: ${isEmergency}`);
        setEmergencyMode(isEmergency);
      });

      // Initialize voice status
      initializeVoiceStatus();
    }
    
    return () => {
      console.log('🔄 App component unmounting');
    };
  }, []);

  const initializeVoiceStatus = async () => {
    try {
      const status = await window.electronAPI?.getVoiceStatus?.();
      if (status) {
        setIsVoiceListening(status.isListening);
      }
    } catch (error) {
      console.error('❌ Error getting voice status:', error);
    }
  };

  const handleOrbClick = () => {
    if (isUltraLightweight) {
      // In ultra-lightweight mode, show real-time overlay
      setShowRealTimeOverlay(true);
    } else {
      // In normal mode, show chat bar
      setShowChatBar(true);
    }
  };

  const handleRealTimeCommand = async (command: string) => {
    try {
      const result = await window.electronAPI?.processRealTimeCommand?.(command);
      return result || {
        success: false,
        intent: 'error',
        confidence: 0,
        action: 'error',
        response: 'Real-time command processing not available',
        latency: 0
      };
    } catch (error) {
      console.error('❌ Error processing real-time command:', error);
      return {
        success: false,
        intent: 'error',
        confidence: 0,
        action: 'error',
        response: `Error: ${error}`,
        latency: 0
      };
    }
  };

  const handleToggleVoiceListening = async () => {
    try {
      const newState = !isVoiceListening;
      const result = await window.electronAPI?.toggleVoiceListening?.(newState);
      if (result?.success) {
        setIsVoiceListening(newState);
      }
    } catch (error) {
      console.error('❌ Error toggling voice listening:', error);
    }
  };

  const handleCloseRealTimeOverlay = () => {
    setShowRealTimeOverlay(false);
  };

  console.log('🎨 Rendering App component');

  return (
    <div className="app">
      <AnimatePresence>
        {!showChatBar && !showRealTimeOverlay && (
          <FloatingOrb 
            key="orb" 
            isUltraLightweight={isUltraLightweight} 
            emergencyMode={emergencyMode} 
            onClick={handleOrbClick}
          />
        )}
        {showChatBar && (
          <ChatBar key="chatbar" onClose={() => setShowChatBar(false)} />
        )}
        {showRealTimeOverlay && (
          <RealTimeOverlay
            key="realtime"
            isVisible={showRealTimeOverlay}
            onClose={handleCloseRealTimeOverlay}
            onCommand={handleRealTimeCommand}
            isListening={isVoiceListening}
            onToggleListening={handleToggleVoiceListening}
            isUltraLightweight={isUltraLightweight}
          />
        )}
      </AnimatePresence>
      
      {/* Show ultra-lightweight mode indicator */}
      {isUltraLightweight && (
        <div className="ultra-lightweight-indicator">
          ⚡ Ultra-Lightweight Mode
        </div>
      )}
      
      {/* Show emergency mode indicator */}
      {emergencyMode && (
        <div className="emergency-mode-indicator">
          🚨 Emergency Mode
        </div>
      )}
    </div>
  );
}

export default App; 