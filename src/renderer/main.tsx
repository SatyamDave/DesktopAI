import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Overlay from './Overlay';
import OrbApp from './OrbApp';
import './index.css';

const path = window.location.pathname;
const isOrbWindow = window.location.search.includes('orb=true') || window.name === 'orb';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {path === '/overlay' ? <Overlay /> : isOrbWindow ? <OrbApp /> : <App />}
  </React.StrictMode>
); 