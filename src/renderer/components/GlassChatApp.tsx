import React, { useState, useEffect } from 'react';
import GlassChat from './GlassChat';
import '../App.css';

const GlassChatApp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [deloMode, setDeloMode] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Load visibility preference from localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem('glasschat-visible');
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility));
    }
  }, []);

  // Save visibility preference to localStorage
  useEffect(() => {
    localStorage.setItem('glasschat-visible', JSON.stringify(isVisible));
  }, [isVisible]);

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    // Add user message to chat
    setMessages(prev => [...prev, { id: Date.now().toString(), text: message, type: 'user', timestamp: new Date() }]);
    try {
      if (deloMode) {
        // Send command to main process for automation
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Processing automation...', type: 'system', timestamp: new Date(), isTyping: true }]);
        // const response = await window.electron.ipcRenderer.invoke('delo-command', { command: message });
        // Replaced with electronAPI.processAiInput for type safety and consistency
        const response = await window.electronAPI.processAiInput(message);
        setMessages(prev => [
          ...prev.filter(m => !m.isTyping),
          {
            id: (Date.now() + 2).toString(),
            text: response.success ? response.result : `❌ ${response.error || 'Command failed.'}`,
            type: response.success ? 'assistant' : 'system',
            timestamp: new Date()
          }
        ]);
      } else {
        // Fallback to normal chat/AI
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Thinking...', type: 'system', timestamp: new Date(), isTyping: true }]);
        const response = await window.electronAPI.processAiInput(message);
        setMessages(prev => [
          ...prev.filter(m => !m.isTyping),
          {
            id: (Date.now() + 2).toString(),
            text: response.success ? response.result : `❌ ${response.error || 'AI failed.'}`,
            type: response.success ? 'assistant' : 'system',
            timestamp: new Date()
          }
        ]);
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev.filter(m => !m.isTyping),
        {
          id: (Date.now() + 3).toString(),
          text: `❌ ${error.message || error}`,
          type: 'system',
          timestamp: new Date()
        }
      ]);
    }
  };

  const handleToggleDELO = (enabled: boolean) => {
    setDeloMode(enabled);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Global hotkey support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + D to toggle visibility
      if (e.altKey && e.code === 'KeyD') {
        e.preventDefault();
        handleToggleVisibility();
        return;
      }

      // Escape to close
      if (e.code === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      className="glasschat-app" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <GlassChat
        onSendMessage={handleSendMessage}
        onToggleDELO={handleToggleDELO}
        onClose={handleClose}
        isVisible={isVisible}
        onToggleVisibility={handleToggleVisibility}
      />
    </div>
  );
};

export default GlassChatApp; 