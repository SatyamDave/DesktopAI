import { useState, useEffect, useRef } from "react";
import { Mic, SendHorizontal, X, Eye, Scan } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ScreenReader } from "./components/ScreenReader";

const suggestions = [
  "Summarize this",
  "Translate to French",
  "Create task",
  "Send as email",
  "Search this",
];

const MIN_REGION_WIDTH = 50;
const MIN_REGION_HEIGHT = 50;

export default function DELOOverlay() {
  const [input, setInput] = useState("");
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [screenSuggestions, setScreenSuggestions] = useState<string[]>([]);
  const [screenSummary, setScreenSummary] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [selectingRegion, setSelectingRegion] = useState(false);
  const [region, setRegion] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [regionStart, setRegionStart] = useState<{ x: number, y: number } | null>(null);
  const [deloHidden, setDeloHidden] = useState(false);
  const [showScreenReader, setShowScreenReader] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if electronAPI is available
    const checkApi = () => {
      const hasApi = !!(window as any).electronAPI;
      setApiAvailable(hasApi);
      console.log('ElectronAPI available:', hasApi);
      if (hasApi) {
        console.log('Available methods:', Object.keys((window as any).electronAPI));
      }
    };
    
    checkApi();
    
    // Check again after a short delay in case it loads later
    const timer = setTimeout(checkApi, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const toggleOverlay = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") setVisible((v) => !v);
    };
    window.addEventListener("keydown", toggleOverlay);
    return () => window.removeEventListener("keydown", toggleOverlay);
  }, []);

  // Optimized drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
    lastPosition.current = {
      x: (rect?.left ?? 0) - window.innerWidth / 2 + (rect?.width ?? 0) / 2,
      y: (rect?.top ?? 0) - 24,
    };
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!dragging) return;
    let animating = false;
    let nextPos = { ...lastPosition.current };
    const onMouseMove = (e: MouseEvent) => {
      nextPos = {
        x: e.clientX - dragOffset.current.x - window.innerWidth / 2 + (overlayRef.current?.offsetWidth ?? 0) / 2,
        y: e.clientY - dragOffset.current.y - 24,
      };
      if (!animating) {
        animating = true;
        rafRef.current = requestAnimationFrame(() => {
          if (overlayRef.current) {
            overlayRef.current.style.left = `calc(50% + ${nextPos.x}px)`;
            overlayRef.current.style.top = `${nextPos.y + 24}px`;
            overlayRef.current.style.transform = "translateX(-50%)";
          }
          animating = false;
        });
      }
    };
    const onMouseUp = () => {
      setDragging(false);
      setPosition(nextPos);
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dragging]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.left = `calc(50% + ${position.x}px)`;
      overlayRef.current.style.top = `${position.y + 24}px`;
      overlayRef.current.style.transform = "translateX(-50%)";
    }
  }, [position, visible]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    
    try {
      if (apiAvailable && (window as any).electronAPI.processAiInput) {
        const response = await (window as any).electronAPI.processAiInput(userMessage);
        if (response.success) {
          setMessages(prev => [...prev, { role: 'ai', text: response.result }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error processing your request.' }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: 'AI processing is not available. Please check your configuration.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    }
  };

  // Enhanced screen scanning with better error handling
  const handleScanScreen = async () => {
    setScanning(true);
    setScreenSuggestions([]);
    setScreenSummary('');
    
    try {
      if (!apiAvailable) {
        setScreenSummary('Screen capture API is not available. Please restart the application.');
        return;
      }

      // Hide overlay before capturing
      if ((window as any).electronAPI?.hideDeloOverlay) {
        await (window as any).electronAPI.hideDeloOverlay();
      }
      
      // Small delay to ensure overlay is hidden
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if ((window as any).electronAPI?.captureFullScreen) {
        const result = await (window as any).electronAPI.captureFullScreen();
        if (result.success) {
          setScreenSummary(result.summary || '');
          setScreenSuggestions(result.suggestions || []);
        } else {
          setScreenSummary(result.error || 'Failed to analyze screen content.');
        }
      } else {
        setScreenSummary('Screen capture functionality is not available.');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScreenSummary('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      // Show overlay after capturing
      if ((window as any).electronAPI?.showDeloOverlay) {
        await (window as any).electronAPI.showDeloOverlay();
      }
      setScanning(false);
    }
  };

  // Enhanced region selection with full-screen capability
  const startRegionSelection = async () => {
    setDeloHidden(true);
    setSelectingRegion(true);
    setRegion(null);
    setRegionStart(null);
    
    // Hide DELO overlay to allow full-screen selection
    if ((window as any).electronAPI?.hideDeloOverlay) {
      await (window as any).electronAPI.hideDeloOverlay();
    }
  };

  const endRegionSelection = async () => {
    setDeloHidden(false);
    setSelectingRegion(false);
    
    // Show DELO overlay
    if ((window as any).electronAPI?.showDeloOverlay) {
      await (window as any).electronAPI.showDeloOverlay();
    }
    
    // Process the selected region
    if (region && region.width >= MIN_REGION_WIDTH && region.height >= MIN_REGION_HEIGHT) {
      await handleScanRegion();
    } else if (region) {
      setScreenSummary(`Please select a region at least ${MIN_REGION_WIDTH}x${MIN_REGION_HEIGHT} pixels.`);
      setScreenSuggestions([]);
      setRegion(null);
    }
    
    setRegionStart(null);
  };

  const handleScanRegion = async () => {
    if (!region) return;
    
    setScanning(true);
    setScreenSuggestions([]);
    setScreenSummary('');
    
    try {
      if (!apiAvailable) {
        setScreenSummary('Screen capture API is not available.');
        return;
      }

      if ((window as any).electronAPI?.captureScreenRegion) {
        const result = await (window as any).electronAPI.captureScreenRegion(region);
        if (result.success) {
          setScreenSummary(result.summary || '');
          setScreenSuggestions(result.suggestions || []);
        } else {
          setScreenSummary(result.error || 'Failed to analyze selected region.');
        }
      } else {
        setScreenSummary('Region capture functionality is not available.');
      }
    } catch (err) {
      console.error('Region scan error:', err);
      setScreenSummary('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setScanning(false);
      setRegion(null);
    }
  };

  // Full-screen region selection with document-level event handling
  useEffect(() => {
    if (!selectingRegion) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target !== document.body && !(e.target as Element).classList.contains('region-selector')) {
        return;
      }
      setRegionStart({ x: e.clientX, y: e.clientY });
      setRegion(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!regionStart) return;
      
      const x = Math.min(regionStart.x, e.clientX);
      const y = Math.min(regionStart.y, e.clientY);
      const width = Math.abs(regionStart.x - e.clientX);
      const height = Math.abs(regionStart.y - e.clientY);
      
      setRegion({ x, y, width, height });
    };

    const handleMouseUp = () => {
      endRegionSelection();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectingRegion(false);
        setRegion(null);
        setRegionStart(null);
        setDeloHidden(false);
        if ((window as any).electronAPI?.showDeloOverlay) {
          (window as any).electronAPI.showDeloOverlay();
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent text selection during region selection
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [selectingRegion, regionStart]);

  if (!visible) return null;

  return (
    <>
      {/* Full-screen region selection overlay */}
      {selectingRegion && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/30 region-selector"
          style={{ 
            pointerEvents: 'auto', 
            cursor: 'crosshair',
            backdropFilter: 'blur(1px)'
          }}
        >
          {/* Instructions */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
            Click and drag to select a region • Press ESC to cancel
          </div>
          
          {/* Selection rectangle */}
          {region && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-400/20 region-selector"
              style={{
                left: region.x,
                top: region.y,
                width: region.width,
                height: region.height,
                pointerEvents: 'none',
                boxShadow: '0 0 0 2px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.3)',
                backdropFilter: 'blur(1px)',
              }}
            >
              {/* Size indicator */}
              <div className="absolute -bottom-6 left-0 bg-black/70 text-white px-2 py-1 rounded text-xs">
                {region.width} × {region.height}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* DELO overlay */}
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`fixed z-50 w-full max-w-xl p-4 transition-opacity duration-300 ${
          deloHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        ref={overlayRef}
        style={{ left: `calc(50% + ${position.x}px)`, top: `${position.y + 24}px`, transform: "translateX(-50%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl text-white cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center px-4 py-3 space-x-3 cursor-move select-none">
            <Mic className="w-5 h-5 opacity-70" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask DELO anything..."
              className="bg-transparent outline-none w-full placeholder-white/50 text-white cursor-auto select-text"
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={handleInputKeyDown}
            />
            <SendHorizontal
              className="w-5 h-5 cursor-pointer opacity-70 hover:opacity-100"
              onClick={handleSend}
            />
          </div>

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="px-4 pb-2 space-y-2 max-h-32 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500/20 self-end text-blue-100'
                      : 'bg-white/10 self-start text-white/90'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          )}

          {/* Scan Controls */}
          <div className="flex flex-wrap gap-2 px-4 pb-2 cursor-auto select-auto items-center">
            <button
              onClick={handleScanScreen}
              disabled={scanning || !apiAvailable}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm px-4 py-1 rounded-full transition flex items-center gap-1"
            >
              <Scan className="w-3 h-3" />
              {scanning ? 'Scanning...' : 'Scan Screen'}
            </button>
            
            <button
              onClick={startRegionSelection}
              disabled={scanning || !apiAvailable}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm px-4 py-1 rounded-full transition"
            >
              Select Region
            </button>
            
            <button
              onClick={() => setShowScreenReader(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-1 rounded-full transition flex items-center gap-1"
              disabled={scanning}
            >
              <Eye className="w-3 h-3" />
              Read Screen
            </button>
          </div>

          {/* API Status Indicator */}
          {!apiAvailable && (
            <div className="px-4 pb-2 text-yellow-300 text-xs bg-yellow-900/20 rounded-lg">
              ⚠️ Screen capture API not available. Some features may not work.
            </div>
          )}

          {/* Scan Results */}
          {screenSummary && (
            <div className="px-4 pb-2 text-white/90 text-sm bg-white/10 rounded-lg mb-2">
              <strong>Summary:</strong> {screenSummary}
            </div>
          )}
          
          {screenSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {screenSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1 rounded-full transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 px-4 pb-4 cursor-auto select-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1 rounded-full transition"
              >
                {s}
              </button>
            ))}
          </div>

          {(hovering || dragging) && (
            <X
              onClick={() => setVisible(false)}
              className="absolute top-3 right-3 w-4 h-4 cursor-pointer opacity-50 hover:opacity-100"
            />
          )}
        </motion.div>
      </div>

      {/* Screen Reader Modal */}
      {showScreenReader && (
        <ScreenReader
          onClose={() => setShowScreenReader(false)}
          onTextExtracted={(text) => {
            setInput(`Analyze this text: ${text}`);
            setShowScreenReader(false);
          }}
        />
      )}
    </>
  );
} 