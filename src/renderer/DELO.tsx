import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2 } from "lucide-react";

const SUGGESTIONS = [
  "Summarize this",
  "Translate to French",
  "Create task",
  "Send as email",
  "Search this",
  "Open settings",
  "Show help"
];

const MODES = [
  { key: 'automation', label: 'Automation' },
  { key: 'listening', label: 'Listening' },
  { key: 'default', label: 'Default' }
];

export default function DeloOverlay() {
  const [input, setInput] = useState("");
  const [visible, setVisible] = useState(true);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTIONS);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1);
  const [mode, setMode] = useState('default');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "d" || e.key === "D")) setVisible(v => !v);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setSelectedSuggestion(-1);
      }
      if (document.activeElement === inputRef.current && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedSuggestion(prev => (prev + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter" && selectedSuggestion >= 0) {
          setInput(suggestions[selectedSuggestion]);
          setSuggestions([]);
          setSelectedSuggestion(-1);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [suggestions, selectedSuggestion]);

  useEffect(() => {
    if (!input) {
      setSuggestions(SUGGESTIONS);
      setSelectedSuggestion(-1);
      return;
    }
    const filtered = SUGGESTIONS.filter(s => s.toLowerCase().includes(input.toLowerCase()));
    setSuggestions(filtered);
    setSelectedSuggestion(filtered.length ? 0 : -1);
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setInput("");
    }, 1200);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -32 }}
          transition={{ duration: 0.35, type: "spring", bounce: 0.22 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl z-[9999] px-4"
        >
          <div className="flex flex-col items-center justify-center w-full gap-5">
            {/* Input Bar */}
            <div
              className="flex items-center gap-3 w-full max-w-4xl px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full shadow-lg relative focus-within:ring-4 focus-within:ring-purple-400/50"
              style={{
                boxShadow: '0 8px 32px rgba(31,38,135,0.18), inset 0 1px 1px rgba(255,255,255,0.1)'
              }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.08)' }} />

              {/* Mic */}
              <button
                type="button"
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 border border-white/10 shadow-sm bg-white/10 hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 ${listening ? 'bg-purple-500 animate-pulse' : ''}`}
                onClick={() => setListening(l => !l)}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
              >
                <Mic className={`w-4 h-4 ${listening ? 'text-white' : 'text-white/80'}`} />
              </button>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask DELO anything..."
                className="flex-1 bg-transparent outline-none text-white placeholder-white/60 text-base leading-6 py-2 px-3 min-w-0"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim() && selectedSuggestion === -1) handleSubmit();
                }}
                autoComplete="off"
                spellCheck={false}
                aria-autocomplete="list"
                aria-controls="delo-suggestions"
                aria-activedescendant={selectedSuggestion >= 0 ? `delo-suggestion-${selectedSuggestion}` : undefined}
              />

              {/* Mode Toggles */}
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {MODES.map(m => (
                  <button
                    key={m.key}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-white/10 ${mode === m.key ? 'bg-purple-500 text-white shadow' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    onClick={() => setMode(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && input && (
              <div
                ref={suggestionsRef}
                id="delo-suggestions"
                className="w-full max-w-4xl mt-1 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl text-white overflow-hidden z-50 animate-fade-in"
                style={{ boxShadow: '0 4px 24px rgba(31,38,135,0.12)' }}
              >
                {suggestions.map((s, i) => (
                  <div
                    key={s}
                    id={`delo-suggestion-${i}`}
                    className={`px-4 py-2 cursor-pointer transition-all select-none ${i === selectedSuggestion ? 'bg-purple-500/80 text-white' : 'hover:bg-white/30'}`}
                    onMouseDown={() => {
                      setInput(s);
                      setSuggestions([]);
                      setSelectedSuggestion(-1);
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}

            {/* Typing/Thinking Indicator */}
            <div className="h-6 flex items-center justify-center w-full max-w-4xl">
              <AnimatePresence>
                {thinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-white/80 text-sm">DELO is thinking…</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
