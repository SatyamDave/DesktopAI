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
        className="block w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-violet-400 via-blue-400 to-fuchsia-600 dark:from-violet-700 dark:via-blue-800 dark:to-fuchsia-800 backdrop-blur-md bg-opacity-60 border border-white/30 shadow-lg flex items-center justify-center select-none"
        style={{
          boxShadow:
            '0 2px 16px 0 rgba(80, 80, 255, 0.18), 0 1.5px 8px 0 rgba(120, 80, 255, 0.10)',
        }}
      >
        <span className="sr-only">Open AI Assistant</span>
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-white dark:text-violet-200 opacity-90"
          fill="none"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" opacity="0.18" />
          <circle cx="16" cy="16" r="7" fill="currentColor" opacity="0.18" />
          <circle cx="16" cy="16" r="5" fill="currentColor" opacity="0.35" />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
      </span>
    </motion.button>
  );
};

export default FloatingOrb; 