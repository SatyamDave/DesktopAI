import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ChatBarProps {
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      moveWindow: (x: number, y: number) => void;
    };
  }
}

const ChatBar: React.FC<ChatBarProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Focus input on open
  useEffect(() => {
    const inputEl = document.getElementById('chatbar-input') as HTMLInputElement;
    if (inputEl) inputEl.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages((msgs) => [...msgs, { role: 'ai', text: 'AI is thinking...' }]);
    }, 400);
  };

  // Drag logic (move window)
  const handleDragStart = (event: any, info: any) => {
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(window.screenX, window.screenY);
    dragOffset.current = {
      x: info.point.x,
      y: info.point.y,
    };
  };
  const handleDrag = (event: any, info: any) => {
    const dx = info.point.x - dragOffset.current.x;
    const dy = info.point.y - dragOffset.current.y;
    const newX = window.screenX + dx;
    const newY = window.screenY + dy;
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(newX, newY);
  };

  return (
    <motion.div
      ref={barRef}
      className="fixed bottom-6 right-6 z-[1000] w-[340px] sm:w-[420px] max-w-[98vw] rounded-2xl bg-white/60 dark:bg-gray-900/70 backdrop-blur-md border border-white/30 shadow-2xl flex flex-col pointer-events-auto"
      initial={{ opacity: 0, scale: 0.8, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 40 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      drag
      dragMomentum={false}
      dragElastic={0.18}
      dragConstraints={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      style={{ touchAction: 'none' }}
      aria-label="AI Assistant Chat Bar"
      tabIndex={0}
    >
      {/* Header with close */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-semibold text-lg text-gray-800 dark:text-violet-100 select-none">Doppel Assistant</span>
        <button
          onClick={onClose}
          aria-label="Close chat bar"
          className="ml-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {/* Chat log */}
      <div className="flex-1 px-4 pb-2 overflow-y-auto max-h-40">
        {messages.length === 0 && (
          <div className="text-gray-400 dark:text-gray-500 text-sm text-center mt-4 select-none">Say hi to your AI assistant!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`my-1 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <span className={`px-3 py-1 rounded-xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-violet-500 text-white' : 'bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border border-violet-100 dark:border-violet-900'}`}>{msg.text}</span>
          </div>
        ))}
      </div>
      {/* Input row */}
      <form
        className="flex items-center gap-2 px-4 pb-3 pt-1"
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        autoComplete="off"
      >
        <input
          id="chatbar-input"
          className="flex-1 rounded-lg px-3 py-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm shadow-sm"
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          aria-label="Type a message"
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-semibold shadow-md hover:from-violet-600 hover:to-fuchsia-600 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </motion.div>
  );
};

export default ChatBar; 