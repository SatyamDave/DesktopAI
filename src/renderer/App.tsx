import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import GlassmorphicOverlay from './components/GlassmorphicOverlay';

const App: React.FC = () => {
  // No state for modes, overlays, or dragging
  // Only state for listening if needed
  const [isListening, setIsListening] = useState(false);

  // Always render the glassmorphic overlay fullscreen
  return (
    <GlassmorphicOverlay
      isVisible={true}
      onClose={() => {}}
      onCommand={async (command: string) => {
        console.log('Sending to Friday:', command);
        if (window.friday && window.friday.processCommand) {
          const result = await window.friday.processCommand(command);
          console.log('Friday result:', result);
          return result;
        } else {
          console.error('Friday API not available');
          return { success: false, message: 'Friday API not available' };
        }
      }}
      isListening={isListening}
      onToggleListening={() => setIsListening((prev) => !prev)}
      isUltraLightweight={false}
    />
  );
};

export default App; 