import React, { useState, useEffect } from 'react';
import FloatingOrb from './components/FloatingOrb';
import GlassmorphicOverlay from './components/GlassmorphicOverlay';
import './App.css';

interface OrbAppProps {
  isUltraLightweight?: boolean;
  emergencyMode?: boolean;
}

const OrbApp: React.FC<OrbAppProps> = ({ 
  isUltraLightweight = false, 
  emergencyMode = false 
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Handle orb click to show overlay
  const handleOrbClick = (position: { x: number; y: number }) => {
    console.log('🪟 Orb clicked at:', position);
    setShowOverlay(true);
  };

  // Handle overlay close
  const handleOverlayClose = () => {
    setShowOverlay(false);
    setIsListening(false);
  };

  // Handle command execution
  const handleCommand = async (command: string) => {
    console.log('🪟 Executing command:', command);
    
    // Simulate command processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Here you would integrate with your actual command system
    // For now, we'll just log the command
    console.log('✅ Command executed:', command);
    
    // Close overlay after successful command
    setTimeout(() => {
      setShowOverlay(false);
      setIsListening(false);
    }, 500);
  };

  // Handle listening toggle
  const handleToggleListening = () => {
    setIsListening(!isListening);
    console.log('🎤 Listening toggled:', !isListening);
  };

  // Global hotkey support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + D to toggle overlay
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        setShowOverlay(!showOverlay);
        return;
      }

      // Escape to close overlay
      if (e.code === 'Escape' && showOverlay) {
        e.preventDefault();
        handleOverlayClose();
        return;
      }

      // Ctrl/Cmd + L to toggle listening
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyL') {
        e.preventDefault();
        handleToggleListening();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverlay]);

  return (
    <div className="orb-app" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      background: 'transparent',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      <FloatingOrb 
        onClick={handleOrbClick}
        isUltraLightweight={isUltraLightweight}
        emergencyMode={emergencyMode}
      />
      
      <GlassmorphicOverlay
        isVisible={showOverlay}
        onClose={handleOverlayClose}
        onCommand={handleCommand}
        isListening={isListening}
        onToggleListening={handleToggleListening}
        isUltraLightweight={isUltraLightweight}
      />
    </div>
  );
};

export default OrbApp; 