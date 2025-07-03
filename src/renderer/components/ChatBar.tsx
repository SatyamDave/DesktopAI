import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ChatBarProps {
  onClose: () => void;
}

const ChatBar: React.FC<ChatBarProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai' | 'system'; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Focus input on open
  useEffect(() => {
    const inputEl = document.getElementById('chatbar-input') as HTMLInputElement;
    if (inputEl) inputEl.focus();
  }, []);

  useEffect(() => {
    function onTranscript(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.text || e.detail.message || e.detail)) || '';
      setMessages((msgs: { role: 'user' | 'ai' | 'system'; text: string }[]) => [...msgs, { role: 'user', text }]);
    }
    function onSuggestion(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.answer || e.detail.suggestion || e.detail.text || e.detail.message || e.detail)) || '';
      setMessages((msgs: { role: 'user' | 'ai' | 'system'; text: string }[]) => [...msgs, { role: 'ai', text }]);
    }
    function onChat(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.text || e.detail.message || e.detail)) || '';
      setMessages((msgs: { role: 'user' | 'ai' | 'system'; text: string }[]) => [...msgs, { role: 'system', text }]);
    }
    window.addEventListener('transcript', onTranscript as EventListener);
    window.addEventListener('suggestion', onSuggestion as EventListener);
    window.addEventListener('chat', onChat as EventListener);
    return () => {
      window.removeEventListener('transcript', onTranscript as EventListener);
      window.removeEventListener('suggestion', onSuggestion as EventListener);
      window.removeEventListener('chat', onChat as EventListener);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage = input.trim();
    setMessages((msgs) => [...msgs, { role: 'user', text: userMessage }]);
    setInput('');
    setIsProcessing(true);
    
    try {
      // Send command to main process via IPC
      const result = await window.electronAPI?.executeCommand(userMessage);
      if (result?.success) {
        const aiResponse = result.result || 'Command executed successfully!';
        setMessages((msgs) => [...msgs, { role: 'ai', text: aiResponse }]);
      } else {
        setMessages((msgs) => [...msgs, { role: 'ai', text: `Error: ${result?.error || 'Unknown error'}` }]);
      }
    } catch (error) {
      setMessages((msgs) => [...msgs, { role: 'ai', text: 'Sorry, there was an error processing your command.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag logic (move window)
  const handleDragStart = (_event: any, info: any) => {
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(window.screenX, window.screenY);
    dragOffset.current = {
      x: info.point.x,
      y: info.point.y,
    };
  };
  const handleDrag = (_event: any, info: any) => {
    const dx = info.point.x - dragOffset.current.x;
    const dy = info.point.y - dragOffset.current.y;
    const newX = window.screenX + dx;
    const newY = window.screenY + dy;
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(newX, newY);
  };

  return (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed top-4 right-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-2xl w-[480px] h-[600px] flex flex-col overflow-hidden group"
      style={{ zIndex: 1000 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
    >
      {/* Header with minimal design */}
      <div className="relative p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            ×
          </button>
        </div>
      </div>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'ai' ? 'justify-start' : 'justify-center'}`}>
            <div className={`rounded-lg px-4 py-2 max-w-[70%] ${msg.role === 'user' ? 'bg-violet-500 text-white' : msg.role === 'ai' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 animate-pulse">
              ...
            </div>
          </div>
        )}
      </div>
      {/* Input area */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm flex items-center space-x-2">
        <input
          id="chatbar-input"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:bg-gray-900 dark:text-white"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          disabled={isProcessing}
        />
        <button
          className="bg-violet-500 hover:bg-violet-600 text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          onClick={handleSend}
          disabled={isProcessing || !input.trim()}
        >
          Send
        </button>
      </div>
    </motion.div>
  );
};

export default ChatBar; 