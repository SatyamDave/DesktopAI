import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, X } from 'lucide-react';

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
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 transition-opacity transition-transform duration-500 opacity-100 scale-100 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl px-6 py-6 max-w-xl w-full h-auto flex flex-col items-center gap-4"
            style={{ boxSizing: "border-box" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 transition-all duration-200 z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Status label */}
            <div className="text-center text-sm font-semibold text-blue-400 drop-shadow-md animate-pulse mb-2 select-none">
              <span className="glow-blue">{status}</span>
            </div>
            {/* Input row */}
            <form onSubmit={handleSubmit} className="flex flex-row items-center gap-4 w-full">
              <Mic className="w-6 h-6 text-blue-400 opacity-80" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask DELO anything..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 backdrop-blur-md transition-all duration-200"
                disabled={isProcessing}
                autoFocus
              />
              <button
                type="submit"
                disabled={isProcessing || !input.trim()}
                className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-600/90 transition-colors duration-200 shadow-md"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
            {/* Pill buttons */}
            {suggestions && suggestions.length > 0 && (
              <div className="flex flex-row gap-3 mt-2">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => onSuggestionClick?.(s)}
                    className="px-4 py-1 rounded-full bg-white/20 border border-white/20 text-white text-xs font-medium shadow-sm hover:bg-white/30 transition-colors duration-150 backdrop-blur-md"
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