import React, { useEffect, useState } from 'react';
import './App.css';
import GlassmorphicOverlay from './components/GlassmorphicOverlay';
import MicIndicator from '../ui/MicIndicator';
import { ToastHost } from './components/makeToast';
import ScreenHooks from './components/ScreenHooks';

const App: React.FC = () => {
  const [isMicLive, setIsMicLive] = useState(false);

  useEffect(() => {
    // Listen for wake and transcript events from the main process or capturer
    // This is a placeholder: replace with your actual event bus or IPC
    function onWake() { setIsMicLive(true); }
    function onTranscript() { setIsMicLive(false); }
    window.addEventListener('wake', onWake);
    window.addEventListener('transcript', onTranscript);
    return () => {
      window.removeEventListener('wake', onWake);
      window.removeEventListener('transcript', onTranscript);
    };
  }, []);

  return (
    <div style={{ width: '400px', height: '72px', background: 'transparent', margin: 0, padding: 0, overflow: 'hidden' }}>
      <ToastHost />
      <ScreenHooks />
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
        isFridayInitialized={false}
        plugins={[]}
        stats={null}
      />
      <MicIndicator live={isMicLive} />
    </div>
  );
};

export default App; 