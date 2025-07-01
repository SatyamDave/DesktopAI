import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mic, Keyboard, Search, Sparkles, History, Zap, 
  AlertTriangle, CheckCircle, Clock, Settings, Lightbulb,
  ChevronDown, ChevronUp, RotateCcw, Target, Brain,
  Mail, Code
} from 'lucide-react';
const { ipcRenderer } = window.require('electron');

interface CommandInputProps {
  onClose: () => void;
  isListening?: boolean;
  setIsListening?: (listening: boolean) => void;
  performanceMode?: boolean;
}

interface CommandSuggestion {
  text: string;
  confidence: number;
  category: string;
  context: string;
}

interface FallbackOption {
  text: string;
  service: string;
  reason: string;
}

interface SmartTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  usageCount: number;
}

const EnhancedCommandInput: React.FC<CommandInputProps> = ({ 
  onClose, 
  isListening = false, 
  setIsListening,
  performanceMode = false 
}) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackOptions, setFallbackOptions] = useState<FallbackOption[]>([]);
  const [smartTemplates, setSmartTemplates] = useState<SmartTemplate[]>([]);
  const [commandHistory, setCommandHistory] = useState<Array<{command: string, success: boolean, timestamp: number, type: string}>>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1);
  const [processingStage, setProcessingStage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load command history
      const historyResponse = await ipcRenderer.invoke('get-command-history', performanceMode ? 5 : 10);
      if (historyResponse?.success) {
        setCommandHistory(historyResponse.history || []);
      }

      // Load smart templates - use mock data for now
      setSmartTemplates([
        {
          id: 'email_template',
          name: 'Email Composition',
          template: 'Write a {tone} email to {recipient} about {subject}',
          category: 'communication',
          usageCount: 15
        },
        {
          id: 'code_review',
          name: 'Code Review',
          template: 'Review this {language} code for {aspects}',
          category: 'development',
          usageCount: 8
        },
        {
          id: 'meeting_notes',
          name: 'Meeting Notes',
          template: 'Create meeting notes for {topic} with key points',
          category: 'productivity',
          usageCount: 12
        }
      ]);

      // Load analytics - use mock data for now
      setAnalytics({
        successRate: 87.5,
        totalCommands: 156,
        averageProcessingTime: 234
      });
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  // Handle keyboard shortcuts with debouncing for performance mode
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (e.key === 'Escape') {
          onClose();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'W') {
          e.preventDefault();
          setIsListening?.(!isListening);
        }
        if (e.key === 'Tab' && suggestions.length > 0) {
          e.preventDefault();
          handleSuggestionSelect(e.shiftKey ? 'prev' : 'next');
        }
      }, performanceMode ? 100 : 50);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [onClose, isListening, setIsListening, performanceMode, suggestions]);

  // Get suggestions as user types with increased debounce in performance mode
  useEffect(() => {
    const getSuggestions = async () => {
      if (input.trim().length > (performanceMode ? 3 : 2)) {
        try {
          // Use existing API for now - enhanced API will be added later
          const response = await ipcRenderer.invoke('get-habit-suggestions', input);
          if (response?.success) {
            // Convert simple suggestions to enhanced format
            const enhancedSuggestions: string[] = (response.suggestions || []).map((suggestion: string, index: number) => suggestion);
            setSuggestions(enhancedSuggestions);
            setSelectedSuggestion(-1);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    };

    const timeoutId = setTimeout(getSuggestions, performanceMode ? 500 : 300);
    return () => clearTimeout(timeoutId);
  }, [input, performanceMode]);

  const handleSuggestionSelect = (direction: 'next' | 'prev') => {
    if (suggestions.length === 0) return;
    
    if (direction === 'next') {
      setSelectedSuggestion(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
    } else {
      setSelectedSuggestion(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult(null);
    setSuggestions([]);
    setProcessingStage('Analyzing command...');

    try {
      const res = await ipcRenderer.invoke('delo-user-input', input);
      setResult(res.message);
    } catch (err) {
      setResult('Error: ' + err);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleHistoryClick = (command: string) => {
    setInput(command);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleTemplateClick = (template: SmartTemplate) => {
    setInput(template.template);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  const handleFallbackClick = async (fallback: FallbackOption) => {
    setShowFallback(false);
    setInput(fallback.text);
    inputRef.current?.focus();
  };

  const handleRetry = async () => {
    if (input.trim()) {
      await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication': return <Mail size={14} />;
      case 'development': return <Code size={14} />;
      case 'productivity': return <Target size={14} />;
      case 'information': return <Search size={14} />;
      case 'creation': return <Sparkles size={14} />;
      default: return <Brain size={14} />;
    }
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
        className="w-[600px] max-w-[95vw] rounded-3xl shadow-2xl border border-white/20 bg-white/10 backdrop-blur-2xl p-0 flex flex-col relative overflow-hidden"
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
              <h2 className="text-xl font-semibold text-gray-900">Enhanced Assistant</h2>
              <p className="text-sm text-gray-600">Intelligent task automation & AI assistance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {performanceMode && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                <Zap size={12} />
                <span>Performance Mode</span>
              </div>
            )}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-red-500/20 transition-all duration-200 text-gray-600 hover:text-red-500"
              onClick={onClose}
              title="Close"
              aria-label="Close command input"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-0 p-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="What would you like me to help you with?"
              className="w-full bg-white/20 backdrop-blur-sm text-gray-900 text-xl font-medium placeholder-gray-500 outline-none border border-white/20 rounded-2xl py-4 px-6 pr-12 transition-all duration-200 focus:border-blue-500/50 focus:bg-white/30"
              disabled={isProcessing}
              aria-label="Command input"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {isProcessing && (
                <motion.div
                  className="flex items-center gap-2 text-sm text-blue-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>{processingStage}</span>
                </motion.div>
              )}
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-gray-700"
              >
                <History size={14} />
                <span>History</span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-gray-700"
              >
                <Lightbulb size={14} />
                <span>Templates</span>
                {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Execute</span>
                </>
              )}
            </button>
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-sm font-medium text-gray-700">Suggestions</h3>
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => {
                      setInput(suggestion);
                      setSuggestions([]);
                      setSelectedSuggestion(-1);
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedSuggestion === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white/50 hover:bg-white/70'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(suggestion.split(' ')[0])}
                        <span className="text-gray-900">{suggestion}</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Command History */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-sm font-medium text-gray-700">Recent Commands</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {commandHistory.map((cmd, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleHistoryClick(cmd.command)}
                      className="w-full text-left p-2 rounded-lg hover:bg-white/20 transition-colors text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 truncate">{cmd.command}</span>
                        <div className="flex items-center gap-2">
                          {cmd.success ? (
                            <CheckCircle size={12} className="text-green-500" />
                          ) : (
                            <AlertTriangle size={12} className="text-red-500" />
                          )}
                          <span className="text-xs text-gray-500">{cmd.type}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart Templates */}
          <AnimatePresence>
            {showTemplates && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-sm font-medium text-gray-700">Smart Templates</h3>
                <div className="grid grid-cols-1 gap-2">
                  {smartTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateClick(template)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 bg-white/50 hover:bg-white/70 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.template}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{template.category}</span>
                          <span className="text-xs text-blue-600">{template.usageCount} uses</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          {result && (
            <motion.div
              className="mt-4 p-4 rounded-lg border"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderColor: result.includes('Error') ? '#fecaca' : '#d1fae5',
                backgroundColor: result.includes('Error') ? '#fef2f2' : '#f0fdf4'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {result.includes('Error') ? (
                    <AlertTriangle size={16} className="text-red-500" />
                  ) : (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                  <span className={result.includes('Error') ? 'text-red-700' : 'text-green-700'}>
                    {result}
                  </span>
                </div>
                {result.includes('Error') && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Analytics Summary */}
          {analytics && (
            <motion.div
              className="mt-4 p-3 rounded-lg bg-white/20 border border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Success Rate: {analytics.successRate}%</span>
                <span>Total Commands: {analytics.totalCommands}</span>
                <span>Avg Time: {analytics.averageProcessingTime}ms</span>
              </div>
            </motion.div>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedCommandInput;

