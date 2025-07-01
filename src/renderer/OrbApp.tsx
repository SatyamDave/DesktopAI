import React, { useState, useEffect } from 'react';
import FloatingOrb from './components/FloatingOrb';
import CommandInterface from './components/CommandInterface';
import './App.css';

const OrbApp: React.FC = () => {
  const [isUltraLightweight, setIsUltraLightweight] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showCommandInterface, setShowCommandInterface] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.log('🪟 OrbApp component mounted');
    console.log('🪟 URL params:', window.location.search);
    console.log('🪟 Window name:', window.name);
    
    // Check for ultra-lightweight mode
    const checkMode = () => {
      const isUltra = process.env.ULTRA_LIGHTWEIGHT === 'true';
      const isEmergency = process.env.EMERGENCY_MODE === 'true';
      setIsUltraLightweight(isUltra);
      setEmergencyMode(isEmergency);
      console.log('🔧 OrbApp mode:', { isUltra, isEmergency });
    };

    checkMode();
  }, []);

  const handleOrbClick = (position: { x: number; y: number }) => {
    console.log('🪟 Orb clicked at position:', position);
    setOrbPosition(position);
    setShowCommandInterface(true);
  };

  const handleCloseCommandInterface = () => {
    setShowCommandInterface(false);
  };

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
      
      <CommandInterface
        isVisible={showCommandInterface}
        onClose={handleCloseCommandInterface}
        position={orbPosition}
      />
    </div>
  );
};

export default OrbApp; 