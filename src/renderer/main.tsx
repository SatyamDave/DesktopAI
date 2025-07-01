import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
<<<<<<< HEAD
import Overlay from './Overlay';
import './index.css';

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {path === '/overlay' ? <Overlay /> : <App />}
=======
import OrbApp from './OrbApp';
import './index.css';

// Check if this is the floating orb window by checking the URL or window name
const isOrbWindow = window.location.search.includes('orb=true') || window.name === 'orb';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isOrbWindow ? <OrbApp /> : <App />}
>>>>>>> origin/main
  </React.StrictMode>
); 