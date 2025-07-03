import React, { useEffect, useState } from 'react';
import './App.css';
import DELOOverlay from './DELOOverlay';
import MicIndicator from '../ui/MicIndicator';

const App: React.FC = () => {
  const [isMicLive, setIsMicLive] = useState(false);

  useEffect(() => {
    // Listen for wake and transcript events from the main process or capturer
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
    <>
      <DELOOverlay />
      <MicIndicator live={isMicLive} />
    </>
  );
};

export default App; 