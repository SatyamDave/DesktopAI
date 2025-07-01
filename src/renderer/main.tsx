import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Overlay from './Overlay';
import OrbApp from './OrbApp';
import GlassChatApp from './GlassChatApp';
import './index.css';

// Check which app to render based on URL parameters
const isOrbWindow = window.location.search.includes('orb=true') || window.name === 'orb';
const isGlassChatWindow = window.location.search.includes('glasschat=true') || window.name === 'glasschat';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isGlassChatWindow ? <GlassChatApp /> : isOrbWindow ? <OrbApp /> : window.location.pathname === '/overlay' ? <Overlay /> : <App />}
  </React.StrictMode>
); 