import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Settings, X, Send, Zap } from 'lucide-react';

interface GlassChatProps {
  onSendMessage?: (message: string) => void;
  onToggleDELO?: (enabled: boolean) => void;
  onClose?: () => void;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

interface Message {
  id: string;
  text: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

const GlassChat: React.FC<GlassChatProps> = ({
  onSendMessage,
  onToggleDELO,
  onClose,
  isVisible = true,
  onToggleVisibility
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [deloMode, setDeloMode] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component becomes visible
  useEffect(() => {
    if (isVisible && isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible, isExpanded]);

  // Global hotkey listener for Alt+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyD') {
        e.preventDefault();
        onToggleVisibility?.();
      }
      
      // Escape to close
      if (e.code === 'Escape' && isExpanded) {
        e.preventDefault();
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onToggleVisibility]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setStatus('processing');

    // Call parent handler
    onSendMessage?.(inputValue);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understand: "${userMessage.text}". How can I help you?`,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setStatus('idle');
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    setStatus(isListening ? 'idle' : 'listening');
  };

  const toggleDELO = () => {
    const newDeloMode = !deloMode;
    setDeloMode(newDeloMode);
    onToggleDELO?.(newDeloMode);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) return null;

  // macOS-inspired font stack
  const fontFamily = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.96 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50"
        style={{ pointerEvents: 'auto', fontFamily }}
      >
        <motion.div
          className="relative"
          layout
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Glassmorphic double border and inner shadow */}
          <motion.div
            className="glassmorphic"
            style={{
              borderRadius: 24,
              border: '1.5px solid rgba(255,255,255,0.35)',
              boxShadow:
                '0 8px 32px 0 rgba(31, 38, 135, 0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08), 0 0 0 2.5px rgba(255,255,255,0.10) inset',
              minWidth: isExpanded ? 440 : 320,
              maxWidth: isExpanded ? 640 : 320,
              minHeight: isExpanded ? 520 : 68,
              maxHeight: isExpanded ? '70vh' : 68,
              padding: isExpanded ? 0 : 0,
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(.4,0,.2,1)'
            }}
            whileHover={{ scale: 1.018 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Header with gradient and divider */}
            <div
              className="flex items-center justify-between px-6 py-3"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(245,245,255,0.18) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 1px 0 0 rgba(255,255,255,0.10)'
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-500 drop-shadow" />
                  <span className="font-semibold text-gray-800 text-lg tracking-tight" style={{letterSpacing: '-0.01em'}}>DELO</span>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shadow-glow ${
                      status === 'listening' ? 'bg-red-500 animate-pulse' :
                      status === 'processing' ? 'bg-yellow-400 animate-pulse' :
                      'bg-green-400'
                    }`}
                    style={{
                      boxShadow: status !== 'idle' ? '0 0 8px 2px rgba(0,180,255,0.25)' : '0 0 4px 1px rgba(0,200,100,0.10)'
                    }}
                  />
                  <span className="text-xs text-gray-600 capitalize font-medium" style={{letterSpacing: '-0.01em'}}>
                    {status}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* DELO Mode Toggle */}
                <button
                  onClick={toggleDELO}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 ${
                    deloMode
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100/70 text-gray-700 hover:bg-gray-200/80'
                  }`}
                  style={{fontFamily}}
                >
                  {deloMode ? 'DELO ON' : 'DELO OFF'}
                </button>

                {/* Expand/Collapse Button */}
                <button
                  onClick={handleExpand}
                  className="p-2 rounded-full hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                  style={{fontFamily}}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                  style={{fontFamily}}
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex-1 overflow-hidden"
                >
                  <div className="h-80 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200/60 scrollbar-track-transparent">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-8">
                        <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>Start a conversation with DELO</p>
                        <p className="text-xs mt-1">Press Alt+D to toggle visibility</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                              message.type === 'user'
                                ? 'bg-blue-500 text-white'
                                : message.type === 'assistant'
                                ? 'bg-white/80 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                            style={{fontFamily}}
                          >
                            {message.text}
                          </div>
                        </motion.div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-t from-white/10 to-transparent">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isExpanded ? "Type your message..." : "Press Alt+D to expand..."}
                    className="w-full px-5 py-2.5 bg-white/40 backdrop-blur rounded-full border border-white/30 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-transparent transition-all duration-200 shadow-inner"
                    style={{fontFamily, fontWeight: 500, fontSize: 15, letterSpacing: '-0.01em'}}
                    disabled={!isExpanded}
                  />
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* Voice Button */}
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-all duration-200 shadow focus:outline-none focus:ring-2 focus:ring-blue-400/30 ${
                      isListening
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-white/40 text-gray-600 hover:bg-white/60'
                    }`}
                    style={{fontFamily}}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send Button */}
                  {isExpanded && (
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      style={{fontFamily}}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Inner shadow overlay for depth */}
            <div
              style={{
                pointerEvents: 'none',
                position: 'absolute',
                inset: 0,
                borderRadius: 24,
                boxShadow: 'inset 0 2px 16px 0 rgba(31,38,135,0.10), inset 0 1.5px 8px 0 rgba(0,0,0,0.06)'
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlassChat; 