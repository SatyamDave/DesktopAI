import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ChatBar from './components/ChatBar';
import CommandInput from './components/CommandInput';
import { DELOInterface } from './components/DELOInterface';
import Settings from './components/Settings';
import FloatingOrb from './components/FloatingOrb';
import RealTimeOverlay from './components/RealTimeOverlay';
import GlassmorphicOverlay from './components/GlassmorphicOverlay';

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
  showGlassmorphic: boolean;
  currentMode: 'chat' | 'command' | 'delo' | 'realtime' | 'glassmorphic';
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
    showGlassmorphic: false,
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
    
    try {
      // Use the real DELO command system
      const response = await window.electronAPI.processDeloCommand(command);
      
      if (response.success) {
        // Add success message to chat
        const successMessage: Message = {
          id: Date.now().toString(),
          text: `✅ ${response.message}`,
          type: 'assistant',
          timestamp: new Date()
        };
        
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, successMessage]
        }));
        
        // If there's a next action, suggest it
        if (response.nextAction) {
          const nextMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `💡 Next: ${response.nextAction}`,
            type: 'system',
            timestamp: new Date()
          };
          
          setState(prev => ({
            ...prev,
            messages: [...prev.messages, nextMessage]
          }));
        }
      } else {
        // Add error message to chat
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: `❌ ${response.message}`,
          type: 'system',
          timestamp: new Date()
        };
        
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, errorMessage]
        }));
      }
    } catch (error) {
      console.error('DELO command error:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `❌ Failed to execute DELO command: ${error}`,
        type: 'system',
        timestamp: new Date()
      };
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
    }
  };

  const toggleMode = (mode: AppState['currentMode']) => {
    setState(prev => ({
      ...prev,
      currentMode: mode,
      showSettings: false,
      showDELO: mode === 'delo',
      showRealTime: mode === 'realtime',
      showGlassmorphic: mode === 'glassmorphic'
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
          <button 
            className={`mode-button ${state.currentMode === 'glassmorphic' ? 'active' : ''}`}
            onClick={() => toggleMode('glassmorphic')}
          >
            ✨
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {state.theme === 'light' ? '🌞' : state.theme === 'dark' ? '🌙' : '🌓'}
          </button>
        </div>
      </div>
      {/* Main content area */}
      <div className="app-content">
        {state.currentMode === 'chat' && (
          <div className="chat-container">
            <div className="messages-container">
              {state.messages.map((message) => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {state.isProcessing && (
                <div className="message assistant">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatBar onClose={() => toggleMode('command')} />
          </div>
        )}
        {state.currentMode === 'command' && (
          <div className="command-container">
            <CommandInput onClose={() => toggleMode('chat')} />
          </div>
        )}
        {state.currentMode === 'delo' && (
          <DELOInterface />
        )}
        {state.currentMode === 'realtime' && (
          <div className="realtime-container">
            <RealTimeOverlay 
              isVisible={state.showRealTime}
              onClose={() => setState(prev => ({ ...prev, showRealTime: false }))}
              onCommand={handleCommand}
              isListening={state.isListening}
              onToggleListening={() => setState(prev => ({ ...prev, isListening: !prev.isListening }))}
              isUltraLightweight={false}
            />
          </div>
        )}

        {state.currentMode === 'glassmorphic' && (
          <GlassmorphicOverlay 
            isVisible={true}
            onClose={() => toggleMode('chat')}
            onCommand={handleDELOCommand}
            isListening={state.isListening}
            onToggleListening={() => setState(prev => ({ ...prev, isListening: !prev.isListening }))}
            isUltraLightweight={false}
          />
        )}

        {state.showSettings && (
          <div className="settings-overlay">
            <Settings />
          </div>
        )}
      </div>
    </div>
  );
};

export default App; 