import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const FloatingRaycast: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (input.trim()) {
      window.electronAPI?.getCommandSuggestions(input).then(res => {
        if (res?.success && res.suggestions) setSuggestions(res.suggestions);
        else setSuggestions([]);
      });
    } else {
      setSuggestions([]);
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setIsProcessing(true);
    setResult('');
    try {
      const res = await window.electronAPI?.executeCommand(input);
      if (res?.success && res.result) {
        setResult(res.result);
      } else if (res?.error) {
        setResult(res.error);
      } else {
        setResult('Done');
      }
    } catch (err) {
      setResult('Something went wrong.');
    } finally {
      setIsProcessing(false);
      setInput('');
      setSuggestions([]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-[700px] max-w-[95vw] rounded-2xl shadow-xl border border-white/20 bg-white/10 backdrop-blur-2xl p-0 flex flex-col relative"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-red-500/20 transition-all duration-200 text-gray-600 hover:text-red-500 z-10 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X size={18} />
            </button>
            
            {/* Input */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-0 p-8">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a command or search..."
                className="w-full bg-transparent text-gray-900 text-2xl font-medium placeholder-gray-500 outline-none border-none py-4 px-2"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Escape') setIsOpen(false);
                  if (e.key === 'ArrowDown' && suggestions.length > 0) {
                    // focus first suggestion
                  }
                }}
                disabled={isProcessing}
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
  );
};

export default FloatingRaycast; 