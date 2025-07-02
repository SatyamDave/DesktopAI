import { useState, useEffect, useRef } from "react";
import { MicrophoneIcon, PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

const suggestions = [
  "Summarize this",
  "Translate to French",
  "Create task",
  "Send as email",
  "Search this",
];

export default function DELOOverlay() {
  const [input, setInput] = useState("");
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const toggleOverlay = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") setVisible((v) => !v);
    };
    window.addEventListener("keydown", toggleOverlay);
    return () => window.removeEventListener("keydown", toggleOverlay);
  }, []);

  // Drag logic (unchanged, but clean)
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
    lastPosition.current = {
      x: (rect?.left ?? 0) - window.innerWidth / 2 + (rect?.width ?? 0) / 2,
      y: (rect?.top ?? 0) - 24,
    };
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!dragging) return;
    let animating = false;
    let nextPos = { ...lastPosition.current };
    const onMouseMove = (e: MouseEvent) => {
      nextPos = {
        x: e.clientX - dragOffset.current.x - window.innerWidth / 2 + (overlayRef.current?.offsetWidth ?? 0) / 2,
        y: e.clientY - dragOffset.current.y - 24,
      };
      if (!animating) {
        animating = true;
        rafRef.current = requestAnimationFrame(() => {
          if (overlayRef.current) {
            overlayRef.current.style.left = `calc(50% + ${nextPos.x}px)`;
            overlayRef.current.style.top = `${nextPos.y + 24}px`;
            overlayRef.current.style.transform = "translateX(-50%)";
          }
          animating = false;
        });
      }
    };
    const onMouseUp = () => {
      setDragging(false);
      setPosition(nextPos);
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dragging]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.left = `calc(50% + ${position.x}px)`;
      overlayRef.current.style.top = `${position.y + 24}px`;
      overlayRef.current.style.transform = "translateX(-50%)";
    }
  }, [position, visible]);

  // Handle sending input to backend/AI
  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: 'user', text: input }]);
    setInput("");
    try {
      let aiResult = { success: false, message: "No backend connected." };
      if (window.friday && window.friday.processCommand) {
        aiResult = await window.friday.processCommand(input);
      }
      setMessages((msgs) => [
        ...msgs,
        { role: 'ai', text: aiResult.success ? aiResult.message : (aiResult.message || 'Error') },
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: 'ai', text: 'Error: ' + (err instanceof Error ? err.message : String(err)) },
      ]);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 select-none"
        >
          <div
            ref={overlayRef}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            style={{ left: `calc(50% + ${position.x}px)`, top: `${position.y + 24}px`, transform: "translateX(-50%)" }}
            className="relative w-[520px] rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/25 shadow-xl shadow-black/30"
            onMouseDown={onMouseDown}
          >
            {/* Dismiss button */}
            <button onClick={() => setVisible(false)}
              className="absolute top-3 right-3 text-white/90 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Mic icon (future voice) */}
            <div className="absolute top-3 left-3 text-white/90">
              <MicrophoneIcon className="h-5 w-5" />
            </div>

            {/* Input */}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ask DELO anything…"
              className="w-full bg-transparent pl-10 pr-12 py-3 text-lg text-white placeholder-white/60 selection:bg-white/30 outline-none"
            />

            {/* Send button */}
            <button onClick={handleSend}
              className="absolute top-2.5 right-10 text-white/90 hover:text-white">
              <PaperAirplaneIcon className="h-6 w-6 rotate-45" />
            </button>

            {/* Messages */}
            <div className="max-h-80 overflow-y-auto px-6 pb-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`w-fit max-w-full rounded-xl px-4 py-2 ${
                  m.role === 'user'
                    ? 'bg-indigo-500/80 self-end text-white'
                    : 'bg-white/20 text-white/90 backdrop-blur-sm'
                }`}>
                  {m.text}
                </div>
              ))}
            </div>

            {/* Quick-actions */}
            <div className="flex flex-wrap gap-2 px-6 pb-6">
              {suggestions.map(t => (
                <button key={t} onClick={() => setInput(t)}
                  className="rounded-full bg-white/18 hover:bg-white/28 backdrop-blur-sm px-4 py-1 text-sm text-white/85">
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 