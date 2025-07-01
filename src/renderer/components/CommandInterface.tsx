import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

const CommandInterface: React.FC<CommandInterfaceProps> = ({ isVisible, onClose, position }) => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsProcessing(true);
    setResult('');

    try {
      // Simulate command processing
      console.log('🪟 Executing command:', command);
      
      // Here you would integrate with the actual command system
      const response = await window.electronAPI?.executeCommand?.(command) || { success: true, result: `Command executed: ${command}` };
      
      if (response && response.success) {
        setResult(`✅ ${response.result || 'Command completed successfully'}`);
      } else {
        setResult(`❌ ${response.error || 'Command failed'}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="fixed z-50"
        style={{
          left: Math.max(0, position.x - 200),
          top: Math.max(0, position.y - 100)
        }}
      >
        <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg shadow-xl p-4 min-w-[400px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">DELO Assistant</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like me to do? (e.g., 'open chrome', 'summarize clipboard')"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="absolute right-3 top-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isProcessing || !command.trim()}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Execute'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {result && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Result:</div>
              <div className="text-sm text-gray-800 mt-1">{result}</div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            <div>💡 Try: "open chrome", "summarize clipboard", "take screenshot"</div>
            <div>Press Esc to close</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandInterface; 