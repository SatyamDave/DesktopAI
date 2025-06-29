import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Keyboard, Search, Sparkles, History, Zap } from 'lucide-react';

interface CommandInputProps {
  onClose: () => void;
  isListening?: boolean;
  setIsListening?: (listening: boolean) => void;
}

const CommandInput: React.FC<CommandInputProps> = ({ onClose, isListening = false, setIsListening }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [commandHistory, setCommandHistory] = useState<Array<{command: string, success: boolean, timestamp: number}>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setIsListening?.(!isListening);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isListening, setIsListening]);

  // Load command history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await window.electronAPI?.getCommandHistory(10);
        if (response?.success) {
          setCommandHistory(response.history || []);
        }
      } catch (error) {
        console.error('Failed to load command history:', error);
      }
    };
    loadHistory();
  }, []);

  // Get suggestions as user types
  useEffect(() => {
    const getSuggestions = async () => {
      if (input.trim().length > 2) {
        try {
          const response = await window.electronAPI?.getCommandSuggestions(input);
          if (response?.success) {
            setSuggestions(response.suggestions || []);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      } else {
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(getSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult('');
    setSuggestions([]);

    try {
      const response = await window.electronAPI?.executeCommand(input);
      if (response?.success) {
        setResult(response.result || 'Command executed successfully!');
        setInput('');
        // Reload history
        const historyResponse = await window.electronAPI?.getCommandHistory(10);
        if (historyResponse?.success) {
          setCommandHistory(historyResponse.history || []);
        }
      } else {
        setResult(response?.error || 'Failed to execute command.');
      }
    } catch (error) {
      setResult('An error occurred while processing your command.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (command: string) => {
    setInput(command);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <motion.div
        className="w-[500px] max-w-[95vw] rounded-3xl shadow-2xl border border-white/20 bg-white/10 backdrop-blur-2xl p-0 flex flex-col relative overflow-hidden"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Doppel Assistant</h2>
              <p className="text-sm text-gray-600">What would you like me to do?</p>
            </div>
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-red-500/20 transition-all duration-200 text-gray-600 hover:text-red-500"
            onClick={onClose}
            title="Close"
            aria-label="Close command input"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-0 p-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a command or search..."
              className="w-full bg-white/20 backdrop-blur-sm text-gray-900 text-xl font-medium placeholder-gray-500 outline-none border border-white/20 rounded-2xl py-4 px-6 pr-12 transition-all duration-200 focus:border-blue-500/50 focus:bg-white/30"
              disabled={isProcessing}
              aria-label="Command input"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {isListening && (
                <motion.div
                  className="w-2 h-2 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              <button
                type="button"
                onClick={() => setIsListening?.(!isListening)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title={isListening ? "Stop listening" : "Start voice input"}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic size={16} className={isListening ? "text-red-500" : "text-gray-600"} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/20 rounded-lg transition-colors"
                title="Show command history"
              >
                <History size={14} />
                History
              </button>
              <span className="text-xs text-gray-500">
                Ctrl+Shift+W for voice • Esc to close
              </span>
            </div>
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Processing...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Execute
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              className="px-6 pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="w-full text-left py-3 px-4 text-lg text-gray-800 hover:bg-white/30 cursor-pointer transition-colors duration-150 border-b border-white/10 last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3">
                      <Search size={16} className="text-gray-500" />
                      {suggestion}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              className="px-6 pb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="text-sm font-medium text-gray-700">Recent Commands</h3>
                </div>
                {commandHistory.length > 0 ? (
                  commandHistory.map((item, i) => (
                    <button
                      key={i}
                      className="w-full text-left py-3 px-4 text-sm text-gray-800 hover:bg-white/30 cursor-pointer transition-colors duration-150 border-b border-white/10 last:border-b-0"
                      onClick={() => handleHistoryClick(item.command)}
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{item.command}</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-4 px-4 text-sm text-gray-500 text-center">
                    No command history yet
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result/Toast */}
        <AnimatePresence>
          {result && (
            <motion.div
              className="px-6 pb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">Result</span>
                </div>
                <p className="text-gray-800">{result}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default CommandInput; 