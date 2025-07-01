import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface GlassmorphicOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onCommand: (command: string) => Promise<any>;
  isListening?: boolean;
  onToggleListening?: () => void;
  isUltraLightweight?: boolean;
}



const GlassmorphicOverlay: React.FC<GlassmorphicOverlayProps> = ({
  isVisible,
  onClose,
  onCommand,
  isListening = false,
  onToggleListening,
  isUltraLightweight = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCommand = useCallback(async (command: string) => {
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await onCommand(command);
    } catch (error) {
      console.error('Command execution error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onCommand, isProcessing]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed inset-0 z-50"
      >
        {/* Main glassmorphic container - positioned at top */}
        <motion.div
          initial={{ 
            opacity: 0, 
            y: -50,
            filter: 'blur(10px)'
          }}
          animate={{ 
            opacity: 1, 
            y: 0,
            filter: 'blur(0px)'
          }}
          exit={{ 
            opacity: 0, 
            y: -50,
            filter: 'blur(10px)'
          }}
          transition={{ 
            duration: 0.4, 
            ease: [0.4, 0, 0.2, 1],
            delay: 0.1
          }}
          className="absolute top-0 left-0 right-0 pointer-events-auto"
        >
          {/* Glass container with blue glow - full width chat interface */}
          <div className="relative w-full">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-blue-400/20 blur-xl" />
            
            {/* Main glass container - chat-like interface */}
            <div className="relative bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-2xl">
              {/* Top section - simplified chat header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                {/* Left: DELO Assistant title */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🧠</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white/90 font-medium text-lg">DELO Assistant</span>
                    <span className="text-white/60 text-sm">Intelligent Desktop Copilot</span>
                  </div>
                </div>

                {/* Right: Close button */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 flex items-center justify-center transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>



              {/* Bottom section - command input only */}
              <div className="p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="What would you like me to do? (e.g., 'summarize this', 'translate to Spanish', 'open notepad')"
                    className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white/90 placeholder-white/50 focus:outline-none focus:border-white/40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleCommand(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        handleCommand(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium"
                  >
                    Execute
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlassmorphicOverlay; 