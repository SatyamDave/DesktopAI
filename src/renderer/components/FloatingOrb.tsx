import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FloatingOrbProps {
  onClick?: (position: { x: number; y: number }) => void;
  isUltraLightweight?: boolean;
  emergencyMode?: boolean;
}

const FloatingOrb: React.FC<FloatingOrbProps> = ({ onClick, isUltraLightweight = false, emergencyMode = false }) => {
  const orbRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 60, y: 60 }); // Center the orb in the window
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragStart = (event: any, info: any) => {
    setIsDragging(true);
    console.log('🪟 Orb drag started');
  };

  const handleDrag = (event: any, info: any) => {
    // Update local position state - use absolute coordinates with bounds checking
    const x = Math.max(0, Math.min(window.innerWidth - 80, info.point.x));
    const y = Math.max(0, Math.min(window.innerHeight - 80, info.point.y));
    setPosition({ x, y });
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    console.log('🪟 Orb drag ended at:', info.point);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging && onClick) {
      onClick(position);
    }
  };

  // Add debugging
  useEffect(() => {
    console.log('🪟 FloatingOrb mounted with position:', position);
    console.log('🪟 Window dimensions:', { width: window.innerWidth, height: window.innerHeight });
  }, []);

  return (
    <motion.button
      ref={orbRef}
      type="button"
      aria-label="Open AI Assistant"
      tabIndex={0}
      className="fixed outline-none focus:ring-2 focus:ring-violet-400 pointer-events-auto z-50"
      style={{ 
        touchAction: 'none',
        left: position.x,
        top: position.y,
        pointerEvents: 'auto'
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        boxShadow: orbStyle.shadow
      }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      whileHover={{
        scale: 1.2,
        boxShadow: orbStyle.hoverShadow,
        filter: 'brightness(1.3)'
      }}
      whileFocus={{
        scale: 1.2,
        boxShadow: orbStyle.hoverShadow,
        filter: 'brightness(1.3)'
      }}
      whileTap={{
        scale: 0.9
      }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{
        left: 0,
        right: window.innerWidth - 80,
        top: 0,
        bottom: window.innerHeight - 80
      }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      <span
<<<<<<< HEAD
        className="block w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg flex items-center justify-center select-none relative overflow-hidden"
        style={{
          boxShadow:
            '0 4px 24px 0 rgba(0, 0, 0, 0.1), 0 2px 8px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
=======
        className="block w-20 h-20 rounded-full backdrop-blur-md bg-opacity-95 border-4 border-white/30 shadow-2xl flex items-center justify-center select-none"
        style={{
          background: orbStyle.background,
          boxShadow: orbStyle.shadow,
          filter: 'brightness(1.1)',
>>>>>>> origin/main
        }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50"></div>
        
        <span className="sr-only">Open AI Assistant</span>
        <svg
<<<<<<< HEAD
          className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 dark:text-gray-300 relative z-10"
=======
          className="w-10 h-10 text-white opacity-95"
>>>>>>> origin/main
          fill="none"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
<<<<<<< HEAD
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <circle cx="16" cy="16" r="7" fill="currentColor" opacity="0.3" />
          <circle cx="16" cy="16" r="5" fill="currentColor" opacity="0.5" />
=======
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          <circle cx="16" cy="16" r="7" fill="currentColor" opacity="0.4" />
          <circle cx="16" cy="16" r="5" fill="currentColor" opacity="0.6" />
>>>>>>> origin/main
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
      </span>
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{
          background: orbStyle.background,
          zIndex: -1
        }}
      />
      
      {/* Mode indicator */}
      {(isUltraLightweight || emergencyMode) && (
        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border-2 border-gray-800 flex items-center justify-center shadow-lg">
          <span className="text-xs font-bold">
            {emergencyMode ? '🚨' : '⚡'}
          </span>
        </div>
      )}
    </motion.button>
  );
};

export default FloatingOrb; 