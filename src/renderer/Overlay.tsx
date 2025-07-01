import { motion } from 'framer-motion';
import React, { useRef, useEffect } from 'react';

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function Overlay() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.electronAPI?.toggleOverlay?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: handle submit logic
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-3 px-4 py-2 w-[420px] rounded-2xl bg-white/75 dark:bg-zinc-800/75 shadow-lg shadow-black/25 backdrop-blur-md border border-black/10 dark:border-white/10"
    >
      <SearchIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
      <input
        ref={inputRef}
        autoFocus
        placeholder="Ask Doppel…"
        className="flex-1 outline-none border-none bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
      />
      <kbd className="text-xs text-zinc-400 dark:text-zinc-500">Esc</kbd>
    </motion.form>
  );
} 