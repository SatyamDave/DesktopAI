import React, { useState, useEffect } from 'react';
import FloatingOrb from './components/FloatingOrb';
import ChatBar from './components/ChatBar';
import { AnimatePresence } from 'framer-motion';
import './index.css';

declare global {
  interface Window {
    electronAPI: {
      moveWindow: (x: number, y: number) => void;
      resizeWindow: (width: number, height: number) => void;
    };
  }
}

console.log('🚀 Renderer App.tsx loading...');

function App() {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isUltraLightweight, setIsUltraLightweight] = useState(false);
  const [showChatBar, setShowChatBar] = useState(false);

  useEffect(() => {
    if (showChatBar) {
      window.electronAPI?.resizeWindow?.(420, 120);
    } else {
      window.electronAPI?.resizeWindow?.(100, 100);
    }
  }, [showChatBar]);

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
    
    // Only set up event listeners if not in ultra-lightweight mode
    if (!isUltraLightweight && window.electronAPI) {
      // Listen for emergency mode
      window.electronAPI.onEmergencyMode?.((isEmergency: boolean) => {
        console.log(`🚨 Emergency mode: ${isEmergency}`);
        setEmergencyMode(isEmergency);
      });
    }
    
    return () => {
      console.log('🔄 App component unmounting');
    };
  }, [isUltraLightweight]);

  console.log('🎨 Rendering App component');

  return (
    <div className="app">
      <AnimatePresence>
        {!showChatBar && (
          <FloatingOrb key="orb" isUltraLightweight={isUltraLightweight} emergencyMode={emergencyMode} onClick={() => setShowChatBar(true)} />
        )}
        {showChatBar && (
          <ChatBar key="chatbar" onClose={() => setShowChatBar(false)} />
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