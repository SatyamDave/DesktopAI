import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Overlay from './Overlay';
import GlassChatApp from './components/GlassChatApp';
import './index.css';

// Check which app to render based on URL parameters
const isGlassChatWindow = window.location.search.includes('glasschat=true') || window.name === 'glasschat';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isGlassChatWindow ? <GlassChatApp /> : window.location.pathname === '/overlay' ? <Overlay /> : <App />}
  </React.StrictMode>
); 