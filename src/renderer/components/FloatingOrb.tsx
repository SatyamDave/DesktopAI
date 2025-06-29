import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Power, Mic, Keyboard, Zap, Sparkles } from 'lucide-react';
import CommandInput from './CommandInput';
import { ConfigManager } from '../../main/services/ConfigManager';
import { FeatureTest } from './FeatureTest';

const BAR_WIDTH = 320;
const BAR_HEIGHT = 64;

interface Position {
  x: number;
  y: number;
}

interface ContextMenu {
  x: number;
  y: number;
}

const FloatingBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const [showTest, setShowTest] = useState(false);
  const configManager = new ConfigManager();
  const debugMode = configManager.isDebugMode();

  // Load position from localStorage
  const [pos, setPos] = useState<Position>(() => {
    const saved = localStorage.getItem('doppel-bar-position');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { x: parsed.x, y: parsed.y };
    }
    return { x: 50, y: 50 };
  });

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('doppel-bar-position', JSON.stringify(pos));
  }, [pos]);

  // Handle mouse movement for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && dragOffset.current) {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        
        // Keep bar within screen bounds
        const maxX = window.innerWidth - BAR_WIDTH;
        const maxY = window.innerHeight - BAR_HEIGHT;
        
        setPos({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === '.') {
        e.preventDefault();
        setIsOpen(true);
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setIsListening(!isListening);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

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
    } else if (action === 'whisper') {
      setIsListening(!isListening);
    }
  };

  // Enhanced animations
  const barPulse = {
    animate: {
      scale: [1, 1.02, 1],
      boxShadow: [
        '0 8px 32px rgba(0,0,0,0.18)',
        '0 12px 40px 2px rgba(80,180,255,0.25)',
        '0 8px 32px rgba(0,0,0,0.18)'
      ],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  const listeningPulse = {
    animate: {
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 8px 32px rgba(0,0,0,0.18)',
        '0 16px 48px 4px rgba(255,100,100,0.3)',
        '0 8px 32px rgba(0,0,0,0.18)'
      ],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  const quickPulse = {
    animate: {
      scale: [1, 1.08, 1],
      boxShadow: [
        '0 8px 32px rgba(0,0,0,0.18)',
        '0 20px 60px 8px rgba(80,180,255,0.4)',
        '0 8px 32px rgba(0,0,0,0.18)'
      ],
      transition: { duration: 0.6, ease: 'easeInOut' }
    }
  };

  return (
    <>
      {/* Enhanced draggable, animated, glassmorphism bar */}
      <motion.div
        ref={barRef}
        className="pointer-events-auto flex items-center justify-between select-none px-8"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: BAR_WIDTH,
          height: BAR_HEIGHT + 16,
          borderRadius: 36,
          background: isListening 
            ? 'linear-gradient(120deg, rgba(255,100,100,0.25) 0%, rgba(255,150,150,0.32) 100%)'
            : 'linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(120,180,255,0.28) 100%)',
          boxShadow: isListening
            ? '0 8px 32px 4px rgba(255,100,100,0.2), 0 1.5px 8px 0 rgba(0,0,0,0.10)'
            : '0 8px 32px 4px rgba(80,180,255,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isListening
            ? '2.5px solid rgba(255,100,100,0.35)'
            : '2.5px solid rgba(255,255,255,0.28)',
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 1000,
          userSelect: 'none',
          fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
          fontWeight: 600,
          letterSpacing: 0.2,
          transition: dragging ? 'none' : 'box-shadow 0.3s, background 0.3s, border 0.3s',
        }}
        tabIndex={0}
        aria-label="Doppel AI Assistant - Click to open command input, drag to move"
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        whileHover={{ 
          scale: 1.045, 
          boxShadow: isListening
            ? '0 0 32px 8px #ff646488, 0 16px 48px 4px rgba(255,100,100,0.3)'
            : '0 0 32px 8px #7ecbff88, 0 16px 48px 4px rgba(80,180,255,0.25)'
        }}
        whileTap={{ scale: 0.98 }}
        {...(showPulse ? quickPulse : isListening ? listeningPulse : barPulse)}
      >
        <div className="flex items-center gap-3">
          <motion.span 
            className="text-2xl text-white font-bold select-none" 
            style={{textShadow:'0 2px 12px #7ecbff'}}
            animate={isListening ? { rotate: [0, 10, -10, 0] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {isListening ? '🎤' : '◎'}
          </motion.span>
          <div className="flex flex-col">
            <span className="text-xl text-white/90 font-semibold select-none" style={{textShadow:'0 2px 8px #7ecbff'}}>
              Doppel Assistant
            </span>
            <span className="text-xs text-white/60 select-none">
              {isListening ? 'Listening...' : 'Ctrl+Shift+. to open'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isListening && (
            <motion.div
              className="w-2 h-2 bg-red-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <span className="text-sm text-white/70 select-none italic">Drag me!</span>
        </div>
      </motion.div>

      {/* Enhanced context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.ul
            className="fixed bg-white/95 shadow-2xl rounded-xl border border-gray-200/50 py-2 px-2 z-[2000] backdrop-blur-md"
            style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 140 }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <li 
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100/80 rounded-lg cursor-pointer transition-colors" 
              onClick={() => handleMenuAction('settings')} 
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleMenuAction('settings')}
            >
              <Settings size={16} className="text-gray-600"/>
              <span className="text-sm font-medium">Settings</span>
            </li>
            <li 
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100/80 rounded-lg cursor-pointer transition-colors" 
              onClick={() => handleMenuAction('whisper')} 
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleMenuAction('whisper')}
            >
              <Mic size={16} className={isListening ? "text-red-500" : "text-gray-600"}/>
              <span className="text-sm font-medium">{isListening ? 'Stop Listening' : 'Whisper Mode'}</span>
            </li>
            <li 
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-100/80 text-red-600 rounded-lg cursor-pointer transition-colors" 
              onClick={() => handleMenuAction('quit')} 
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleMenuAction('quit')}
            >
              <Power size={16}/>
              <span className="text-sm font-medium">Quit</span>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Enhanced modal for input */}
      <AnimatePresence>
        {isOpen && (
          <CommandInput 
            onClose={() => setIsOpen(false)}
            isListening={isListening}
            setIsListening={setIsListening}
          />
        )}
      </AnimatePresence>

      {/* Whisper mode indicator */}
      {isListening && (
        <motion.div
          className="fixed bottom-4 left-4 bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-md z-[1500]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="flex items-center gap-2">
            <Mic size={16} />
            <span className="text-sm font-medium">Whisper Mode Active</span>
            <motion.div
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </motion.div>
      )}

      {debugMode && (
        <button
          className="absolute top-2 right-2 bg-yellow-200 text-yellow-900 px-2 py-1 rounded shadow hover:bg-yellow-300 z-50"
          onClick={e => { e.stopPropagation(); setShowTest(true); }}
        >
          Debug/Test
        </button>
      )}

      <AnimatePresence>
        {showTest && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTest(false)}
          >
            <motion.div
              className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full"
              initial={{ scale: 0.95, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 40 }}
              onClick={e => e.stopPropagation()}
            >
              <FeatureTest />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingBar; 