import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, CheckCircle, AlertCircle, Loader2, Send, Monitor, ChevronUp, ChevronDown } from 'lucide-react';

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

// Toast utility
let addToast: (t: string) => void = () => {};
export function pushToast(text: string) {
  addToast(text);
}

export function ToastHost() {
  const [toasts, set] = useState<string[]>([]);
  useEffect(() => { addToast = t => set(prev => [...prev, t]); }, []);
  return ReactDOM.createPortal(
    <div className="fixed top-4 right-4 space-y-2 z-[9999]">
      <AnimatePresence>
        {toasts.map((t,i)=>(
          <motion.div
            key={i}
            initial={{opacity:0,y:-20}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0}}
            className="px-4 py-2 bg-white/15 backdrop-blur-md rounded-lg text-sm text-white"
            onAnimationComplete={()=>set(prev=>prev.filter((_,idx)=>idx!==i))}
          >{t}</motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// Screen capture helpers
async function captureFull() {
  const res = await (window as any).electronAPI?.captureFullScreen?.();
  if (res?.success) pushToast(res.summary);
}

async function captureWindow() {
  const res = await (window as any).electronAPI?.captureActiveWindow?.();
  if (res?.success) pushToast(res.summary);
}

declare global {
  interface Window {
    electronAPI: {
      moveOverlay?: (x: number, y: number) => void;
      resizeOverlay?: (w: number, h: number) => void;
      [key: string]: any;
    };
  }
}

const GlassmorphicOverlay: React.FC<GlassmorphicOverlayProps> = function GlassmorphicOverlay({
  isVisible,
  onClose,
  onCommand,
  isFridayInitialized,
  plugins,
  stats
}: GlassmorphicOverlayProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScreenSummaryLoading, setIsScreenSummaryLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<FridayResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Improved drag system: move the window, not the div
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setDragging(true);
    dragOffset.current = {
      x: e.screenX,
      y: e.screenY,
    };
    document.body.style.userSelect = "none";
  };
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const overlay = document.getElementById('overlay');
      if (window.electronAPI && window.electronAPI.moveOverlay && overlay) {
        window.electronAPI.moveOverlay(e.screenX - overlay.offsetWidth / 2, e.screenY - 28);
      }
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

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  // Restore to original fixed size and normal dropdown
  const shellW = 400;
  const shellH = 56; // or 72 if you want taller bar
  const chatRef = useRef<HTMLDivElement>(null);

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
    setIsCollapsed(false);

    const userResult: FridayResult = {
      success: true,
      message: command,
      data: { type: 'user-input' }
    };
    setResults((prev: FridayResult[]) => {
      const next = [...prev, userResult];
      return next;
    });

    setIsProcessing(true);
    setInputValue('');

    try {
      const result = await onCommand(command);
      setResults((prev: FridayResult[]) => {
        const next = [...prev, result];
        return next;
      });
    } catch (error) {
      const errorResult: FridayResult = {
        success: false,
        message: `Error: ${error}`,
        error: String(error)
      };
      setResults((prev: FridayResult[]) => {
        const next = [...prev, errorResult];
        return next;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onCommand]);

  const handleScreenSummary = useCallback(async () => {
    if (isScreenSummaryLoading || isProcessing) return;
    setIsCollapsed(false);

    const userResult: FridayResult = {
      success: true,
      message: "📸 Capturing screen for summary...",
      data: { type: 'user-input' }
    };
    setResults((prev: FridayResult[]) => [...prev, userResult]);

    setIsScreenSummaryLoading(true);

    try {
      const result = await onCommand("summarise my page");
      setResults((prev: FridayResult[]) => [...prev, result]);
    } catch (error) {
      const errorResult: FridayResult = {
        success: false,
        message: `Screen summary failed: ${error}`,
        error: String(error)
      };
      setResults((prev: FridayResult[]) => [...prev, errorResult]);
    } finally {
      setIsScreenSummaryLoading(false);
    }
  }, [isScreenSummaryLoading, isProcessing, onCommand]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommand(inputValue);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="z-50 pointer-events-auto"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: shellW,
          height: shellH,
          borderRadius: 18,
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          background: 'rgba(30,30,30,.28)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          padding: '0 12px',
          margin: 0,
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center space-x-2 w-full cursor-move select-none"
          style={{height: shellH, minHeight: shellH, background: 'transparent', boxShadow: 'none'}}
          onMouseDown={onMouseDown}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Friday anything..."
            className="flex-1 rounded-lg px-4 py-2 text-white/90 placeholder-white/50 focus:outline-none focus:border-white/40 text-sm"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,.18)',
              height: 36,
              marginTop: 0,
              marginBottom: 0,
            }}
            disabled={isProcessing}
          />
          <button
            onClick={handleScreenSummary}
            disabled={isScreenSummaryLoading || isProcessing}
            className="px-2 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.25)',
              height: 36,
              width: 36,
              minWidth: 36,
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 4,
              marginRight: 0,
            }}
            title="Capture and summarize screen content"
          >
            {isScreenSummaryLoading ? (
              <Loader2 className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => handleCommand(inputValue)}
            disabled={!inputValue.trim() || isProcessing}
            className="px-2 py-2 rounded-lg transition-all duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.25)',
              height: 36,
              width: 36,
              minWidth: 36,
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 4,
              marginRight: 0,
            }}
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="ml-2 text-white/80 hover:text-white rounded-lg transition"
            style={{height: 36, width: 36, minWidth: 36, minHeight: 36, marginLeft: 8, background: 'rgba(255,255,255,0.08)'}}
          >
            <X className="w-5 h-5" />
          </button>
          {results.length > 0 && !isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="ml-1 p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
              style={{height: 36, width: 36, minWidth: 36, minHeight: 36, marginLeft: 4, background: 'rgba(255,255,255,0.08)'}}
              title="Collapse chat"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
          {isCollapsed && (results.length > 0 || isProcessing) && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="ml-1 p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
              style={{height: 36, width: 36, minWidth: 36, minHeight: 36, marginLeft: 4, background: 'rgba(255,255,255,0.08)'}}
              title="Expand chat"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
        {/* Dropdown chat area below input bar, animated */}
        <AnimatePresence>
          {results.length > 0 && !isCollapsed && (
            <motion.div
              key="chat-dropdown"
              ref={chatRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-y-auto px-4 pb-4 space-y-3 border-t border-white/10"
              style={{ 
                pointerEvents: 'auto',
                margin: 0,
                padding: '12px 0 16px 0',
                background: 'transparent',
                borderRadius: 0
              }}
            >
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
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
                          {result.executionTime < 1000 ? `${result.executionTime}ms` : `${(result.executionTime / 1000).toFixed(1)}s`}
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlassmorphicOverlay; 