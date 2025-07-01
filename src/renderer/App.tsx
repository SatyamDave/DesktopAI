import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ChatBar from './components/ChatBar';
import CommandInput from './components/CommandInput';
import { DELOInterface } from './components/DELOInterface';
import Settings from './components/Settings';
import FloatingOrb from './components/FloatingOrb';
import RealTimeOverlay from './components/RealTimeOverlay';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isTyping?: boolean;
}

interface AppState {
  messages: Message[];
  isListening: boolean;
  isProcessing: boolean;
  showSettings: boolean;
  showDELO: boolean;
  showRealTime: boolean;
  currentMode: 'chat' | 'command' | 'delo' | 'realtime';
  theme: 'light' | 'dark' | 'auto';
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    messages: [],
    isListening: false,
    isProcessing: false,
    showSettings: false,
    showDELO: false,
    showRealTime: false,
    currentMode: 'chat',
    theme: 'auto'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  useEffect(() => {
    // Detect system theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (state.theme === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    // Initial call
    if (state.theme === 'auto') {
      document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
    }

    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [state.theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      type: 'user',
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true
    }));

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understand you said: "${message}". How can I help you with that?`,
        type: 'assistant',
        timestamp: new Date()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isProcessing: false
      }));
    }, 1000);
  };

  const handleCommand = async (command: string) => {
    console.log('Executing command:', command);
    // Command execution logic here
  };

  const handleDELOCommand = async (command: string) => {
    console.log('DELO command:', command);
    // DELO command execution logic here
  };

  const toggleMode = (mode: AppState['currentMode']) => {
    setState(prev => ({
      ...prev,
      currentMode: mode,
      showSettings: false,
      showDELO: mode === 'delo',
      showRealTime: mode === 'realtime'
    }));
  };

  const toggleTheme = () => {
    setState(prev => {
      const newTheme = prev.theme === 'light' ? 'dark' : prev.theme === 'dark' ? 'auto' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      return { ...prev, theme: newTheme };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - startX,
        y: e.clientY - startY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className={`app ${state.theme} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* Apple-style header */}
      <div className="app-header" onMouseDown={handleMouseDown}>
        <div className="header-controls">
          <div className="control close"></div>
          <div className="control minimize"></div>
          <div className="control maximize"></div>
        </div>
        <div className="header-title">
          <span className="app-icon">🤖</span>
          <span className="app-name">DELO Assistant</span>
        </div>
        <div className="header-actions">
          <button 
            className={`mode-button ${state.currentMode === 'chat' ? 'active' : ''}`}
            onClick={() => toggleMode('chat')}
          >
            💬
          </button>
          <button 
            className={`mode-button ${state.currentMode === 'command' ? 'active' : ''}`}
            onClick={() => toggleMode('command')}
          >
            ⌨️
          </button>
          <button 
            className={`mode-button ${state.currentMode === 'delo' ? 'active' : ''}`}
            onClick={() => toggleMode('delo')}
          >
            🧠
          </button>
          <button 
            className={`mode-button ${state.currentMode === 'realtime' ? 'active' : ''}`}
            onClick={() => toggleMode('realtime')}
          >
            ⚡
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {state.theme === 'light' ? '🌞' : state.theme === 'dark' ? '🌙' : '🌓'}
          </button>
        </div>
      </div>
      {/* Main content area */}
      <div className="app-content">
        {state.currentMode === 'chat' && (
          <ChatBar onClose={() => {}} />
        )}
        {state.currentMode === 'command' && (
          <CommandInput onCommand={handleCommand} />
        )}
        {state.currentMode === 'delo' && (
          <DELOInterface onCommand={handleDELOCommand} />
        )}
        {state.currentMode === 'realtime' && (
          <RealTimeOverlay />
        )}
      </div>
      {/* Ultra-lightweight mode indicator (if needed) */}
      {/* <div className="ultra-lightweight-indicator">⚡ Ultra-Lightweight Mode</div> */}
    </div>
  );
};

export default App; 