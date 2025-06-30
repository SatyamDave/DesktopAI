import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FloatingOrbProps {
  onClick?: () => void;
  isUltraLightweight?: boolean;
  emergencyMode?: boolean;
}

const FloatingOrb: React.FC<FloatingOrbProps> = ({ onClick, isUltraLightweight = false, emergencyMode = false }) => {
  const orbRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // On drag start, record the offset between mouse and window
  const handleDragStart = (event: any, info: any) => {
    // Get the current window position from the OS
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(window.screenX, window.screenY);
    dragOffset.current = {
      x: info.point.x,
      y: info.point.y,
    };
  };

  // On drag, move the window
  const handleDrag = (event: any, info: any) => {
    // Calculate new window position
    const dx = info.point.x - dragOffset.current.x;
    const dy = info.point.y - dragOffset.current.y;
    const newX = window.screenX + dx;
    const newY = window.screenY + dy;
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(newX, newY);
  };

  // Determine orb styling based on mode
  const getOrbStyling = () => {
    if (emergencyMode) {
      return {
        background: 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)',
        shadow: '0 4px 32px 0 rgba(239, 68, 68, 0.4)',
        hoverShadow: '0 8px 48px 0 rgba(239, 68, 68, 0.6)'
      };
    }
    
    if (isUltraLightweight) {
      return {
        background: 'linear-gradient(135deg, #10b981, #059669, #047857)',
        shadow: '0 4px 32px 0 rgba(16, 185, 129, 0.3)',
        hoverShadow: '0 8px 48px 0 rgba(16, 185, 129, 0.5)'
      };
    }
    
    return {
      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9)',
      shadow: '0 4px 32px 0 rgba(139, 92, 246, 0.3)',
      hoverShadow: '0 8px 48px 0 rgba(139, 92, 246, 0.5)'
    };
  };

  const orbStyle = getOrbStyling();

  return (
    <motion.button
      ref={orbRef}
      type="button"
      aria-label="Open AI Assistant"
      tabIndex={0}
      className="fixed bottom-6 right-6 outline-none focus:ring-2 focus:ring-violet-400 pointer-events-auto z-50"
      style={{ touchAction: 'none' }}
      initial={{ scale: 1, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        boxShadow: orbStyle.shadow
      }}
      transition={{
        duration: 0.5,
        ease: "easeOut"
      }}
      whileHover={{
        scale: 1.15,
        boxShadow: orbStyle.hoverShadow,
        filter: 'brightness(1.2)'
      }}
      whileFocus={{
        scale: 1.15,
        boxShadow: orbStyle.hoverShadow,
        filter: 'brightness(1.2)'
      }}
      whileTap={{
        scale: 0.95
      }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onClick={onClick}
    >
      <span
        className="block w-16 h-16 rounded-full backdrop-blur-md bg-opacity-80 border border-white/40 shadow-lg flex items-center justify-center select-none"
        style={{
          background: orbStyle.background,
          boxShadow: orbStyle.shadow,
        }}
      >
        <span className="sr-only">Open AI Assistant</span>
        <svg
          className="w-8 h-8 text-white opacity-90"
          fill="none"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          <circle cx="16" cy="16" r="7" fill="currentColor" opacity="0.3" />
          <circle cx="16" cy="16" r="5" fill="currentColor" opacity="0.5" />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
      </span>
      
      {/* Mode indicator */}
      {(isUltraLightweight || emergencyMode) && (
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-gray-800 flex items-center justify-center">
          <span className="text-xs font-bold">
            {emergencyMode ? '🚨' : '⚡'}
          </span>
        </div>
      )}
    </motion.button>
  );
};

export default FloatingOrb; 