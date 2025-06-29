import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Power } from 'lucide-react';

const BAR_WIDTH = 320;
const BAR_HEIGHT = 64;
const SNAP_MARGIN = 30;
const STORAGE_KEY = 'floatingBarPos';

const getSnapPosition = (x: number, y: number) => {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  let snapX = x;
  let snapY = y;
  if (x < SNAP_MARGIN) snapX = 0;
  else if (x > screenW - BAR_WIDTH - SNAP_MARGIN) snapX = screenW - BAR_WIDTH;
  if (y < SNAP_MARGIN) snapY = 0;
  else if (y > screenH - BAR_HEIGHT - SNAP_MARGIN) snapY = screenH - BAR_HEIGHT;
  return { x: snapX, y: snapY };
};

const getInitialPos = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { x: window.innerWidth / 2 - BAR_WIDTH / 2, y: window.innerHeight / 2 - BAR_HEIGHT / 2 };
};

const FloatingBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState(getInitialPos());
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Persist position
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  // Drag logic
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPos({ x: newX, y: newY });
    };
    const onMouseUp = () => {
      if (dragging) {
        setDragging(false);
        setPos((pos: { x: number, y: number }) => getSnapPosition(pos.x, pos.y));
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  // Keyboard accessibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Context menu actions
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMenuAction = (action: string) => {
    setContextMenu(null);
    if (action === 'settings') {
      alert('Settings coming soon!');
    } else if (action === 'quit') {
      window.close();
    }
  };

  // Animate bar pulse
  const barPulse = {
    animate: {
      scale: [1, 1.03, 1],
      boxShadow: [
        '0 8px 32px rgba(0,0,0,0.18)',
        '0 12px 40px 2px rgba(80,180,255,0.18)',
        '0 8px 32px rgba(0,0,0,0.18)'
      ],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  return (
    <>
      {/* Draggable, animated, glassmorphism bar */}
      <motion.div
        ref={barRef}
        className="pointer-events-auto flex items-center justify-between select-none px-8"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: BAR_WIDTH,
          height: BAR_HEIGHT + 16, // slightly taller
          borderRadius: 36,
          background: 'linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(120,180,255,0.28) 100%)',
          boxShadow: '0 8px 32px 4px rgba(80,180,255,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '2.5px solid rgba(255,255,255,0.28)',
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 1000,
          userSelect: 'none',
          fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
          fontWeight: 600,
          letterSpacing: 0.2,
          transition: dragging ? 'none' : 'box-shadow 0.2s, background 0.2s',
        }}
        tabIndex={0}
        aria-label="Open command input"
        role="button"
        onMouseDown={e => {
          if (e.button === 0) {
            setDragging(true);
            dragOffset.current = {
              x: e.clientX - pos.x,
              y: e.clientY - pos.y
            };
          }
        }}
        onDoubleClick={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onContextMenu={handleContextMenu}
        whileHover={{ scale: 1.045, boxShadow: '0 0 32px 8px #7ecbff88, 0 16px 48px 4px rgba(80,180,255,0.25)' }}
        whileTap={{ scale: 0.98 }}
        {...barPulse}
      >
        <span className="text-2xl text-white font-bold select-none" style={{textShadow:'0 2px 12px #7ecbff'}}>◎</span>
        <span className="text-xl text-white/90 font-semibold ml-3 select-none" style={{textShadow:'0 2px 8px #7ecbff'}}>Doppel Assistant</span>
        <span className="ml-auto text-sm text-white/70 select-none italic">Drag me!</span>
      </motion.div>
      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.ul
            className="fixed bg-white/90 shadow-xl rounded-lg border border-gray-200 py-2 px-2 z-[2000]"
            style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 120 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <li className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer" onClick={() => handleMenuAction('settings')} tabIndex={0}><Settings size={16}/> Settings</li>
            <li className="flex items-center gap-2 px-3 py-2 hover:bg-red-100 text-red-600 rounded cursor-pointer" onClick={() => handleMenuAction('quit')} tabIndex={0}><Power size={16}/> Quit</li>
          </motion.ul>
        )}
      </AnimatePresence>
      {/* Modal for input */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.15)' }}
            onClick={() => setIsOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              className="w-[400px] max-w-[95vw] rounded-2xl shadow-xl border border-white/20 bg-white/10 backdrop-blur-2xl p-0 flex flex-col relative"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-red-500/20 transition-all duration-200 text-gray-600 hover:text-red-500 z-10 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              {/* Input */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!input.trim()) return;
                setIsProcessing(true);
                setResult('');
                try {
                  const res = await window.electronAPI?.executeCommand(input);
                  if (res?.success && res.result) setResult(res.result);
                  else if (res?.error) setResult(res.error);
                  else setResult('Done');
                } catch {
                  setResult('Something went wrong.');
                } finally {
                  setIsProcessing(false);
                  setInput('');
                  setSuggestions([]);
                }
              }} className="flex flex-col gap-0 p-8">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a command or search..."
                  className="w-full bg-transparent text-gray-900 text-2xl font-medium placeholder-gray-500 outline-none border-none py-4 px-2"
                  autoFocus
                  disabled={isProcessing}
                  aria-label="Command input"
                />
              </form>
              {/* Suggestions/Results */}
              {suggestions.length > 0 && (
                <div className="px-8 pb-4">
                  <ul className="bg-white/20 backdrop-blur-xl rounded-xl shadow-lg divide-y divide-white/10 border border-white/20">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="py-3 px-4 text-lg text-gray-800 hover:bg-white/30 cursor-pointer transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => setInput(s)}
                        tabIndex={0}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Result/Toast */}
              {result && (
                <div className="px-8 pb-6">
                  <div className="mt-2 text-base text-gray-700 bg-white/40 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm border border-white/20">
                    {result}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingBar; 