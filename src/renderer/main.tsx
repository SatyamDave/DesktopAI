import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import FloatingOrb from './components/FloatingOrb';
import CommandInput from './components/CommandInput';
import Settings from './components/Settings';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<FloatingOrb />} />
        <Route path="/command" element={<CommandInput />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  </React.StrictMode>
); 