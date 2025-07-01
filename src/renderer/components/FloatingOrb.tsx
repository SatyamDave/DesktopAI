import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FloatingOrbProps {
  onClick?: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      moveWindow: (x: number, y: number) => void;
    };
  }
}

const FloatingOrb: React.FC<FloatingOrbProps> = ({ onClick }) => {
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

  return (
    <motion.button
      ref={orbRef}
      type="button"
      aria-label="Open AI Assistant"
      tabIndex={0}
      className="fixed bottom-6 right-6 outline-none focus:ring-2 focus:ring-violet-400 pointer-events-auto"
      style={{ touchAction: 'none' }}
      initial={{ scale: 1, boxShadow: '0 4px 32px 0 rgba(80, 80, 255, 0.18)' }}
      animate={{
        scale: [1, 1.08, 1],
        boxShadow: [
          '0 4px 32px 0 rgba(80, 80, 255, 0.18)',
          '0 8px 40px 0 rgba(120, 80, 255, 0.28)',
          '0 4px 32px 0 rgba(80, 80, 255, 0.18)'
        ]
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{
        scale: 1.13,
        boxShadow: '0 8px 48px 0 rgba(120, 80, 255, 0.45)',
        filter: 'brightness(1.15)'
      }}
      whileFocus={{
        scale: 1.13,
        boxShadow: '0 8px 48px 0 rgba(120, 80, 255, 0.45)',
        filter: 'brightness(1.15)'
      }}
      drag
      dragMomentum={false}
      dragElastic={0.18}
      dragConstraints={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onClick={onClick}
    >
      <span
        className="block w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg flex items-center justify-center select-none relative overflow-hidden"
        style={{
          boxShadow:
            '0 4px 24px 0 rgba(0, 0, 0, 0.1), 0 2px 8px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50"></div>
        
        <span className="sr-only">Open AI Assistant</span>
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 dark:text-gray-300 relative z-10"
          fill="none"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <circle cx="16" cy="16" r="7" fill="currentColor" opacity="0.3" />
          <circle cx="16" cy="16" r="5" fill="currentColor" opacity="0.5" />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
      </span>
    </motion.button>
  );
};

export default FloatingOrb; 