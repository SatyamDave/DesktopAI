import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Clock, Search, Zap, History } from 'lucide-react';

interface CommandInputProps {
  onClose: () => void;
}

interface CommandHistory {
  command: string;
  timestamp: number;
  success: boolean;
  result: string;
}

const CommandInput: React.FC<CommandInputProps> = ({ onClose }) => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load command history on mount
    loadCommandHistory();
    
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Get suggestions as user types
    if (command.trim().length > 0) {
      getSuggestions(command);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [command]);

  const loadCommandHistory = async () => {
    try {
      const response = await window.electronAPI?.getCommandHistory(10);
      if (response?.success && response.history) {
        setCommandHistory(response.history);
      }
    } catch (error) {
      console.error('Error loading command history:', error);
    }
  };

  const getSuggestions = async (input: string) => {
    try {
      const response = await window.electronAPI?.getCommandSuggestions(input);
      if (response?.success && response.suggestions) {
        setSuggestions(response.suggestions);
        setShowSuggestions(response.suggestions.length > 0);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsProcessing(true);
    setResult('');
    setShowSuggestions(false);

    try {
      const response = await window.electronAPI?.executeCommand(command);
      if (response?.success) {
        setResult(response.result || 'Command executed successfully');
        showToast('Command executed successfully!', 'success');
        
        // Reload history after successful command
        await loadCommandHistory();
      } else {
        setResult(`Error: ${response?.error || 'Unknown error'}`);
        showToast(`Error: ${response?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`Error: ${errorMessage}`);
      showToast(`Error: ${errorMessage}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleHistoryClick = (historyItem: CommandHistory) => {
    setCommand(historyItem.command);
    setShowHistory(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      // Handle suggestion navigation
    } else if (e.key === 'ArrowUp' && showHistory && commandHistory.length > 0) {
      e.preventDefault();
      // Handle history navigation
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[80vh] overflow-hidden"
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Doppel Command</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                  title="Command History"
                >
                  <History size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your command..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProcessing}
                />
                
                {/* Suggestions */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Search size={14} className="text-gray-400" />
                          <span className="text-sm">{suggestion}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* History */}
                <AnimatePresence>
                  {showHistory && commandHistory.length > 0 && (
                    <motion.div
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {commandHistory.map((historyItem, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleHistoryClick(historyItem)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <Clock size={14} className="text-gray-400" />
                            <span className="text-sm truncate">{historyItem.command}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              historyItem.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {historyItem.success ? '✓' : '✗'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(historyItem.timestamp)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !command.trim()}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Execute Command</span>
                  </>
                )}
              </button>
            </form>

            {result && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <h3 className="font-semibold mb-2">Result:</h3>
                <p className="text-sm text-gray-700">{result}</p>
              </div>
            )}

            {/* Quick Commands */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Quick Commands:</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Open Chrome', 'Search React', 'YouTube tutorial', 'Email manager'].map((quickCmd) => (
                  <button
                    key={quickCmd}
                    type="button"
                    onClick={() => setCommand(quickCmd)}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {quickCmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CommandInput; 