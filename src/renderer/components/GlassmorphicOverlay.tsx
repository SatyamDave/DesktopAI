import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface FridayResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  intent?: any;
  executionTime?: number;
  confidence?: number;
}

interface GlassmorphicOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onCommand: (command: string) => Promise<FridayResult>;
  isFridayInitialized: boolean;
  plugins: any[];
  stats: any;
}

// This file is a React module

const GlassmorphicOverlay: React.FC<GlassmorphicOverlayProps> = function GlassmorphicOverlay({
  isVisible,
  onClose,
  onCommand,
  isFridayInitialized,
  plugins,
  stats
}: GlassmorphicOverlayProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<FridayResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  // Listen for transcript, suggestion, and answer events
  useEffect(() => {
    function onTranscript(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.text || e.detail.message || e.detail)) || '';
      setResults((prev: FridayResult[]) => [...prev, { success: true, message: text, data: { type: 'transcript' } }]);
    }
    function onSuggestion(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.answer || e.detail.suggestion || e.detail.text || e.detail.message || e.detail)) || '';
      setResults((prev: FridayResult[]) => [...prev, { success: true, message: text, data: { type: 'suggestion' } }]);
    }
    function onChat(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.text || e.detail.message || e.detail)) || '';
      setResults((prev: FridayResult[]) => [...prev, { success: true, message: text, data: { type: 'system' } }]);
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

  const handleCommand = useCallback(async (command: string) => {
    if (!command.trim() || isProcessing) return;

    const userResult: FridayResult = {
      success: true,
      message: command,
      data: { type: 'user-input' }
    };
    setResults((prev: FridayResult[]) => [...prev, userResult]);

    setIsProcessing(true);
    setInputValue('');

    try {
      const result = await onCommand(command);
      setResults((prev: FridayResult[]) => [...prev, result]);
      // Refresh stats if Friday is available
      if (window.friday && isFridayInitialized) {
        // const statsData = await window.friday.getStats(); // Removed unused statsData
      }
    } catch (error) {
      const errorResult: FridayResult = {
        success: false,
        message: `Error: ${error}`,
        error: String(error)
      };
      setResults((prev: FridayResult[]) => [...prev, errorResult]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isFridayInitialized, onCommand]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommand(inputValue);
    }
  };

  const formatExecutionTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  if (!isVisible) return null;

  // Drag logic
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setDragging(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
    document.body.style.userSelect = "none";
  };
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x - window.innerWidth / 2 + 250, // 250 = half width
        y: e.clientY - dragOffset.current.y - window.innerHeight / 2 + 150, // 150 = approx half height
      });
    };
    const onMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
        style={{ left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)`, transform: 'translate(-50%, -50%)' }}
      >
        {/* Glow effect (moves with card) */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-blue-400/20 blur-xl rounded-2xl pointer-events-none" />
        <div
          className="relative w-[500px] max-h-[70vh] rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/25 shadow-xl shadow-black/30 flex flex-col"
        >
          {/* Drag bar (top section) */}
          <div className="flex items-center justify-between p-4 cursor-move select-none" onMouseDown={onMouseDown}>
            {/* Left: Friday Assistant title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/90 font-medium text-lg">Friday AI Assistant</span>
                <span className="text-white/60 text-sm">
                  {isFridayInitialized ? 'AI-Powered Desktop Copilot' : 'Initializing...'}
                </span>
              </div>
            </div>
            {/* Close button */}
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Content area */}
          <div className="max-h-96 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col"
              >
                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
                  {results.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        result.data?.type === 'user-input'
                          ? 'bg-blue-500/20 border border-blue-500/30'
                        : result.data?.type === 'transcript'
                          ? 'bg-gray-500/10 border border-gray-400/20'
                        : result.data?.type === 'suggestion'
                          ? 'bg-violet-500/10 border border-violet-400/20'
                        : result.success
                          ? 'bg-green-500/20 border border-green-500/30'
                          : 'bg-red-500/20 border border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {result.data?.type === 'user-input' ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">U</span>
                          </div>
                        ) : result.data?.type === 'transcript' ? (
                          <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">T</span>
                          </div>
                        ) : result.data?.type === 'suggestion' ? (
                          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">S</span>
                          </div>
                        ) : result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white/90 text-sm">{result.message}</p>
                          
                          {result.intent && (
                            <div className="text-xs text-white/60 mt-1">
                              <span className="font-medium">Intent:</span> {result.intent.functionName}
                              {result.confidence && (
                                <span className="ml-1">({(result.confidence * 100).toFixed(0)}%)</span>
                              )}
                            </div>
                          )}
                          
                          {result.executionTime && (
                            <div className="text-xs text-white/50 mt-1">
                              {formatExecutionTime(result.executionTime)}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30"
                    >
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                        <p className="text-white/90 text-sm">Processing command...</p>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={resultsEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Friday to do something... (e.g., 'open notepad', 'search for AI tools', 'compose an email')"
                      className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white/90 placeholder-white/50 focus:outline-none focus:border-white/40 text-sm"
                      disabled={isProcessing}
                    />
                    <button
                      onClick={() => handleCommand(inputValue)}
                      disabled={!inputValue.trim() || isProcessing}
                      className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                key="plugins"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 overflow-y-auto max-h-80"
              >
                <div className="space-y-3">
                  {plugins.map((plugin, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-white/5 border border-white/10 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-white mb-1">{plugin.name}</h3>
                          <p className="text-xs text-white/60">{plugin.description}</p>
                        </div>
                        
                        {window.friday && (
                          <button
                            onClick={() => window.friday.reloadPlugin(plugin.name)}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Reload Plugin"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 overflow-y-auto max-h-80"
              >
                {stats ? (
                  <div className="space-y-4">
                    {/* Overview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="text-lg font-bold text-blue-400">{stats.totalCommands}</div>
                        <div className="text-xs text-white/60">Total Commands</div>
                      </div>
                      <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="text-lg font-bold text-green-400">{stats.successfulCommands}</div>
                        <div className="text-xs text-white/60">Successful</div>
                      </div>
                    </div>

                    {/* Most Used Plugins */}
                    {stats.mostUsedPlugins?.length > 0 && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <h3 className="text-sm font-semibold text-white mb-2">Most Used Plugins</h3>
                        <div className="space-y-1">
                          {stats.mostUsedPlugins.slice(0, 3).map((plugin: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="text-white/60">{plugin.name}</span>
                              <span className="text-blue-400 font-semibold">{plugin.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlassmorphicOverlay; 