import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send } from 'lucide-react';

interface DELOAssistantPanelProps {
  isVisible: boolean;
  status?: string;
  suggestions?: string[];
  onClose: () => void;
  onSubmit: (command: string) => void;
  onVoice?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  isProcessing?: boolean;
  darkMode?: boolean;
}

const DEFAULT_SUGGESTIONS = ['Summarize', 'Open Notion', 'Translate'];

const DELOAssistantPanel: React.FC<DELOAssistantPanelProps> = ({
  isVisible,
  status = 'Listening...',
  suggestions = DEFAULT_SUGGESTIONS,
  onClose,
  onSubmit,
  onVoice,
  onSuggestionClick,
  isProcessing = false,
  darkMode = false,
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when assistant panel appears
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isVisible]);

  // Dismiss on Esc or outside click
  useEffect(() => {
    if (!isVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).id === 'delo-panel-overlay') onClose();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [isVisible, onClose]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSubmit(input.trim());
    setInput('');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="delo-panel-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <motion.div
            key="assistant"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="transition-opacity transition-transform duration-500 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl px-6 py-6 max-w-[600px] w-full h-auto flex flex-col items-center"
            style={{ boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Status label */}
            <div className="text-sm text-blue-300 animate-pulse text-center mb-3">
              {status}
            </div>
            {/* Input row */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={onVoice}
                className="p-2 bg-white/10 rounded-lg border border-white/20"
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask DELO anything..."
                className="flex-grow px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none"
                disabled={isProcessing}
                autoFocus
              />
              <button
                type="submit"
                disabled={isProcessing || !input.trim()}
                className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
            {/* Pill buttons */}
            {suggestions && suggestions.length > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => onSuggestionClick?.(s)}
                    className="bg-white/10 border border-white/20 text-sm px-3 py-1 rounded-full hover:bg-white/20 transition"
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DELOAssistantPanel; 