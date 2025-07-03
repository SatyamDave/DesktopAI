import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Settings, X, Play, Zap, Brain, Monitor } from 'lucide-react';

interface RealTimeOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onCommand: (command: string) => Promise<any>;
  isListening?: boolean;
  onToggleListening?: () => void;
  isUltraLightweight?: boolean;
}

interface CommandResult {
  success: boolean;
  intent: string;
  confidence: number;
  action: string;
  response: string;
  latency: number;
}

interface SystemStatus {
  cpu: number;
  memory: number;
  activeModel: string;
  queueLength: number;
}

const RealTimeOverlay: React.FC<RealTimeOverlayProps> = ({
  isVisible,
  onClose,
  onCommand,
  isListening = false,
  onToggleListening,
  isUltraLightweight = false
}: RealTimeOverlayProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [systemStatus] = useState<SystemStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // GPU-accelerated canvas for smooth animations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Enable GPU acceleration
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle background effects
      if (isVisible) {
        const time = Date.now() * 0.001;
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        
        gradient.addColorStop(0, `rgba(139, 92, 246, ${0.05 + 0.02 * Math.sin(time)})`);
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      // Escape to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Ctrl/Cmd + K to focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Ctrl/Cmd + L to toggle listening
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        onToggleListening?.();
        return;
      }

      // Arrow keys for command history
      if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        navigateHistory('up');
        return;
      }

      if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        navigateHistory('down');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose, onToggleListening]);

  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
    } else {
      newIndex = Math.max(historyIndex - 1, -1);
    }

    setHistoryIndex(newIndex);
    if (newIndex >= 0) {
      setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
    } else {
      setInputValue('');
    }
  };

  const handleSubmit = useCallback(async (command: string) => {
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputValue('');
    
    // Add to history
    const newHistory = [...commandHistory, command];
    setCommandHistory(newHistory.slice(-50)); // Keep last 50 commands
    setHistoryIndex(-1);

    try {
      const result = await onCommand(command);
      setLastResult(result);
      
      // Auto-close after successful command in auto mode
      if (autoMode && result.success) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      setLastResult({
        success: false,
        intent: 'error',
        confidence: 0,
        action: 'error',
        response: `Error: ${error}`,
        latency: 0
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onCommand, isProcessing, autoMode, onClose, commandHistory]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputValue);
    }
  };

  const getStatusColor = (value: number) => {
    if (value < 50) return 'text-green-500';
    if (value < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-500';
    if (confidence > 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  useEffect(() => {
    function onTranscript(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.text || e.detail.message || e.detail)) || '';
      setLastResult({
        success: true,
        intent: 'voice-transcript',
        confidence: 1,
        action: 'transcript',
        response: text,
        latency: 0
      });
    }
    function onSuggestion(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.answer || e.detail.suggestion || e.detail.text || e.detail.message || e.detail)) || '';
      setLastResult({
        success: true,
        intent: 'suggestion',
        confidence: 1,
        action: 'suggestion',
        response: text,
        latency: 0
      });
    }
    function onChat(e: CustomEvent<any>) {
      const text = (e.detail && (e.detail.text || e.detail.message || e.detail)) || '';
      setLastResult({
        success: true,
        intent: 'system',
        confidence: 1,
        action: 'system',
        response: text,
        latency: 0
      });
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

  if (!isVisible) return null;

  return (
    <>
      {/* GPU-accelerated background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-40"
        style={{ willChange: 'transform' }}
      />

      {/* Main overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {/* Overlay background */}
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />

        {/* Main content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-violet-600" />
                <span className="font-semibold text-gray-800">AI Assistant</span>
              </div>
              
              {/* Status indicators */}
              <div className="flex items-center space-x-2 text-sm">
                {systemStatus && (
                  <>
                    <div className={`flex items-center space-x-1 ${getStatusColor(systemStatus.cpu)}`}>
                      <Monitor className="w-3 h-3" />
                      <span>{systemStatus.cpu}%</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${getStatusColor(systemStatus.memory)}`}>
                      <Zap className="w-3 h-3" />
                      <span>{systemStatus.memory}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Auto mode toggle */}
              <button
                onClick={() => setAutoMode(!autoMode)}
                className={`p-2 rounded-lg transition-colors ${
                  autoMode 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={autoMode ? 'Auto mode enabled' : 'Auto mode disabled'}
              >
                <Play className="w-4 h-4" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Input area */}
          <div className="p-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="What would you like me to do? (Ctrl+K to focus, Ctrl+L for voice)"
                className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                disabled={isProcessing}
              />
              
              {/* Voice button */}
              {onToggleListening && (
                <button
                  onClick={onToggleListening}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-red-100 text-red-600 animate-pulse' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start listening (Ctrl+L)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-2 mt-3">
              <span className="text-sm text-gray-500">Quick:</span>
              {['Open Chrome', 'Take screenshot', 'Search web', 'Write email'].map((action) => (
                <button
                  key={action}
                  onClick={() => handleSubmit(action)}
                  disabled={isProcessing}
                  className="px-3 py-1 text-xs bg-violet-100 text-violet-700 rounded-full hover:bg-violet-200 transition-colors disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Results area */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200/50"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getConfidenceColor(lastResult.confidence)}`}>
                        {lastResult.intent}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(lastResult.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Zap className="w-3 h-3" />
                      <span>{lastResult.latency}ms</span>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    lastResult.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="text-sm text-gray-700">{lastResult.response}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
                  <span className="text-gray-600">Processing command...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="absolute right-4 top-4 w-80 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-4"
            >
              <h3 className="font-semibold text-gray-800 mb-4">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto Mode
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoMode}
                      onChange={(e) => setAutoMode(e.target.checked)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600">
                      Automatically execute commands without confirmation
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice Recognition
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isListening}
                      onChange={onToggleListening}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-600">
                      Enable voice commands
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Performance Mode
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isUltraLightweight}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      disabled
                    />
                    <span className="text-sm text-gray-600">
                      Ultra-lightweight mode
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default RealTimeOverlay; 