import { useState } from 'react';
import FloatingOrb from './components/FloatingOrb';
import { FeatureTest } from './components/FeatureTest';
import './index.css';

function App() {
  return (
    <div className="App">
      <FloatingOrb />
      <FeatureTest />
    </div>
  );
}

export default App; 